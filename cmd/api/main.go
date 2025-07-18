package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/charmbracelet/log"
	"github.com/i4o-oss/watchtower/internal/cache"
	"github.com/i4o-oss/watchtower/internal/data"
	"github.com/i4o-oss/watchtower/internal/monitoring"
	"github.com/i4o-oss/watchtower/internal/notification"
	"github.com/i4o-oss/watchtower/internal/security"
	_ "github.com/joho/godotenv/autoload"
)

type Config struct {
	Port     int
	Database DatabaseConfig
	Cache    CacheConfig
}

type DatabaseConfig struct {
	Host     string
	User     string
	Password string
	Name     string
	Port     int
	SSLMode  string
}

type CacheConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
	Enabled  bool
}

type Application struct {
	config              Config
	logger              *log.Logger
	db                  *data.CachedDB
	cache               cache.Cache
	sseHub              *SSEHub
	securityHeaders     *security.SecurityHeaders
	csrfProtection      *security.CSRFProtection
	monitoringEngine    *monitoring.MonitoringEngine
	notificationService *notification.Service
	registrationLocked  bool
}

var (
	port = getEnvWithDefault("PORT", "8080")
)

// getEnvWithDefault returns environment variable value or default if not set
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func (app *Application) gracefulShutdown(apiServer *http.Server, done chan bool) {
	// Create context that listens for the interrupt signal from the OS.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Listen for the interrupt signal.
	<-ctx.Done()

	app.logger.Info("shutting down gracefully, press Ctrl+C again to force")
	stop() // Allow Ctrl+C to force shutdown

	// Stop monitoring engine first
	if app.monitoringEngine != nil {
		app.logger.Info("stopping monitoring engine...")
		if err := app.monitoringEngine.Stop(); err != nil {
			app.logger.Error("error stopping monitoring engine", "err", err.Error())
		} else {
			app.logger.Info("monitoring engine stopped successfully")
		}
	}

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := apiServer.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown with error: %v", err)
	}

	app.logger.Info("Server exiting")

	// Notify the main goroutine that the shutdown is complete
	done <- true
}

func main() {
	logger := log.NewWithOptions(os.Stdout, log.Options{ReportCaller: true, ReportTimestamp: true})

	// read port from env file
	port, err := strconv.Atoi(port)
	if err != nil {
		logger.Error("unable to read port from env file", "err", err.Error())
		os.Exit(1)
	}

	// read database config from env
	dbPort, err := strconv.Atoi(os.Getenv("DB_PORT"))
	if err != nil {
		logger.Error("unable to read database port from env file", "err", err.Error())
		os.Exit(1)
	}

	// read cache config from env
	cachePort, err := strconv.Atoi(getEnvWithDefault("REDIS_PORT", "6379"))
	if err != nil {
		logger.Error("unable to read cache port from env file", "err", err.Error())
		os.Exit(1)
	}

	cacheDB, err := strconv.Atoi(getEnvWithDefault("REDIS_DB", "0"))
	if err != nil {
		logger.Error("unable to read cache db from env file", "err", err.Error())
		os.Exit(1)
	}

	cacheEnabled, err := strconv.ParseBool(getEnvWithDefault("CACHE_ENABLED", "false"))
	if err != nil {
		logger.Error("unable to read cache enabled from env file", "err", err.Error())
		os.Exit(1)
	}

	config := Config{
		Port: port,
		Database: DatabaseConfig{
			Host:     os.Getenv("DB_HOST"),
			User:     os.Getenv("DB_USER"),
			Password: os.Getenv("DB_PASSWORD"),
			Name:     os.Getenv("DB_NAME"),
			Port:     dbPort,
			SSLMode:  os.Getenv("DB_SSLMODE"),
		},
		Cache: CacheConfig{
			Host:     getEnvWithDefault("REDIS_HOST", "localhost"),
			Port:     cachePort,
			Password: os.Getenv("REDIS_PASSWORD"),
			DB:       cacheDB,
			Enabled:  cacheEnabled,
		},
	}

	// Initialize database connection
	// Check if DATABASE_URL is provided (Railway style), otherwise use config
	var rawDB *data.DB
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		rawDB, err = data.NewDatabaseFromURL(databaseURL)
	} else {
		rawDB, err = data.NewDatabase(
			config.Database.Host,
			config.Database.User,
			config.Database.Password,
			config.Database.Name,
			config.Database.Port,
			config.Database.SSLMode,
		)
	}
	if err != nil {
		logger.Error("failed to connect to database", "err", err.Error())
		os.Exit(1)
	}

	// Initialize cache
	var cacheClient cache.Cache
	var db *data.CachedDB

	if config.Cache.Enabled {
		logger.Info("Initializing Redis cache")
		redisCache, err := cache.NewRedisCache(cache.CacheConfig{
			Host:     config.Cache.Host,
			Port:     config.Cache.Port,
			Password: config.Cache.Password,
			DB:       config.Cache.DB,
		})
		if err != nil {
			logger.Warn("Failed to connect to Redis, falling back to in-memory cache", "err", err.Error())
			cacheClient = cache.NewMemoryCache()
		} else {
			cacheClient = redisCache
			logger.Info("Redis cache initialized successfully")
		}
	} else {
		logger.Info("Cache disabled, using in-memory cache")
		cacheClient = cache.NewMemoryCache()
	}

	// Initialize cached database wrapper
	db = data.NewCachedDB(rawDB, cacheClient)

	// Check registration status on startup
	userCount, err := db.GetUserCount()
	if err != nil {
		logger.Error("failed to check user count", "err", err.Error())
		os.Exit(1)
	}
	registrationLocked := userCount > 0
	logger.Info("registration status", "locked", registrationLocked, "user_count", userCount)

	// Warm cache with frequently accessed data
	if config.Cache.Enabled {
		go func() {
			if err := db.WarmCache(); err != nil {
				logger.Warn("Failed to warm cache", "err", err.Error())
			}
		}()
	}

	// Initialize session store
	initSessionStore()

	// Initialize SSE hub
	sseHub := NewSSEHub()
	go sseHub.Run()

	// Initialize security components
	var securityHeadersConfig security.SecurityHeadersConfig
	env := strings.ToLower(getEnvWithDefault("ENV", "development"))
	if env == "production" {
		securityHeadersConfig = security.GetProductionConfig()
	} else {
		securityHeadersConfig = security.GetDevelopmentConfig()
	}

	// Add trusted origins for CSRF protection
	allowedOrigins := getEnvWithDefault("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
	trustedOrigins := strings.Split(allowedOrigins, ",")
	for i, origin := range trustedOrigins {
		trustedOrigins[i] = strings.TrimSpace(origin)
	}

	securityHeaders := security.NewSecurityHeaders(securityHeadersConfig)
	csrfProtection := security.NewCSRFProtection(cacheClient, security.CSRFConfig{
		SecureCookie:   env == "production",
		TrustedOrigins: trustedOrigins,
		SkipReferer:    env != "production", // Skip referer validation in development
	})

	// Initialize monitoring engine
	monitoringConfig := monitoring.DefaultEngineConfig()
	monitoringEngine := monitoring.NewMonitoringEngine(monitoringConfig, rawDB, logger)

	// Initialize notification service
	notificationService := notification.NewService(nil) // Use default slog logger

	app := &Application{
		config:              config,
		logger:              logger,
		db:                  db,
		cache:               cacheClient,
		sseHub:              sseHub,
		securityHeaders:     securityHeaders,
		csrfProtection:      csrfProtection,
		monitoringEngine:    monitoringEngine,
		notificationService: notificationService,
		registrationLocked:  registrationLocked,
	}

	// Set monitoring result callback to broadcast via SSE
	monitoringEngine.SetResultCallback(app.BroadcastMonitoringResult)

	// Start monitoring engine
	if err := app.monitoringEngine.Start(); err != nil {
		logger.Error("failed to start monitoring engine", "err", err.Error())
		os.Exit(1)
	}
	logger.Info("monitoring engine started successfully")

	server := app.NewServer()

	// Create a done channel to signal when the shutdown is complete
	done := make(chan bool, 1)

	// Run graceful shutdown in a separate goroutine
	go app.gracefulShutdown(server, done)

	err = server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		panic(fmt.Sprintf("http server error: %s", err))
	}

	// Wait for the graceful shutdown to complete
	<-done

	// Close database connection
	if err := app.db.Close(); err != nil {
		app.logger.Error("failed to close database connection", "err", err.Error())
	}

	// Close cache connection
	if err := app.cache.Close(); err != nil {
		app.logger.Error("failed to close cache connection", "err", err.Error())
	}

	app.logger.Info("Graceful shutdown complete.")
}
