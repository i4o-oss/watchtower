package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/charmbracelet/log"
	"github.com/i4o-oss/watchtower/internal/data"
	_ "github.com/joho/godotenv/autoload"
)

type Config struct {
	Port     int
	Database DatabaseConfig
}

type DatabaseConfig struct {
	Host     string
	User     string
	Password string
	Name     string
	Port     int
	SSLMode  string
}

type Application struct {
	config Config
	logger *log.Logger
	db     *data.DB
}

var (
	port = os.Getenv("PORT")
)

func (app *Application) gracefulShutdown(apiServer *http.Server, done chan bool) {
	// Create context that listens for the interrupt signal from the OS.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Listen for the interrupt signal.
	<-ctx.Done()

	app.logger.Info("shutting down gracefully, press Ctrl+C again to force")
	stop() // Allow Ctrl+C to force shutdown

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
	}

	// Initialize database connection
	db, err := data.NewDatabase(
		config.Database.Host,
		config.Database.User,
		config.Database.Password,
		config.Database.Name,
		config.Database.Port,
		config.Database.SSLMode,
	)
	if err != nil {
		logger.Error("failed to connect to database", "err", err.Error())
		os.Exit(1)
	}

	app := &Application{
		config: config,
		logger: logger,
		db:     db,
	}

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

	app.logger.Info("Graceful shutdown complete.")
}
