#!/bin/bash
set -e

# Initialize Watchtower database with proper settings

echo "Initializing Watchtower database..."

# Create database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Set timezone
    SET timezone = 'UTC';
    
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Create indexes for better performance
    -- These will be created by migrations, but good to have them ready
    
    -- Log database initialization
    SELECT 'Database initialized successfully for Watchtower' as status;
EOSQL

echo "Database initialization complete."