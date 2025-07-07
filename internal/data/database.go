package data

import (
	"fmt"
	"log"
	"net/url"
	"path/filepath"
	"strconv"
	"time"

	"github.com/pressly/goose/v3"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

type DB struct {
	*gorm.DB
}

// NewDatabaseFromURL creates a new database connection from a DATABASE_URL string
func NewDatabaseFromURL(databaseURL string) (*DB, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("database URL cannot be empty")
	}

	parsedURL, err := url.Parse(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	// Extract connection details from URL
	var host, user, password, dbname, sslmode string
	var port int

	host = parsedURL.Hostname()
	if host == "" {
		return nil, fmt.Errorf("database host not found in URL")
	}

	if parsedURL.Port() != "" {
		port, err = strconv.Atoi(parsedURL.Port())
		if err != nil {
			return nil, fmt.Errorf("invalid port in database URL: %w", err)
		}
	} else {
		port = 5432 // Default PostgreSQL port
	}

	user = parsedURL.User.Username()
	if user == "" {
		return nil, fmt.Errorf("database user not found in URL")
	}

	password, _ = parsedURL.User.Password()
	if password == "" {
		return nil, fmt.Errorf("database password not found in URL")
	}

	dbname = parsedURL.Path[1:] // Remove leading slash
	if dbname == "" {
		return nil, fmt.Errorf("database name not found in URL")
	}

	// Check for SSL mode in query parameters
	sslmode = parsedURL.Query().Get("sslmode")
	if sslmode == "" {
		sslmode = "require" // Default to require SSL for Railway
	}

	return NewDatabase(host, user, password, dbname, port, sslmode)
}

func NewDatabase(host, user, password, dbname string, port int, sslmode string) (*DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=%s TimeZone=UTC",
		host, user, password, dbname, port, sslmode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Error),
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true, // Use singular table names
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying sql.DB for connection pooling
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxOpenConns(25)                 // Maximum number of open connections
	sqlDB.SetMaxIdleConns(5)                  // Maximum number of idle connections
	sqlDB.SetConnMaxLifetime(5 * time.Minute) // Maximum amount of time a connection may be reused

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Run migrations on startup
	if err := goose.SetDialect("postgres"); err != nil {
		return nil, fmt.Errorf("failed to set goose dialect: %w", err)
	}

	migrationsDir := filepath.Join("internal", "migrations")
	if err := goose.Up(sqlDB, migrationsDir); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Successfully connected to database and ran migrations")

	return &DB{db}, nil
}

func (db *DB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
