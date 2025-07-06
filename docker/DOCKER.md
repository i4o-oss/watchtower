# Docker Setup Guide

This document explains how to use Docker with the Watchtower application, covering both development and production environments.

## Overview

The Watchtower application uses Docker for containerization with the following components:
- **Go backend API** (main application)
- **Next.js frontend** (bundled with backend)
- **PostgreSQL** database
- **Redis** cache

## File Structure

```
docker/
├── docker-compose.yml          # Development environment (default)
├── docker-compose.prod.yml     # Production environment
├── Dockerfile                  # Multi-stage production build
├── Dockerfile.dev             # Development build with hot reloading
├── .dockerignore              # Files to exclude from Docker context
├── .env.example               # Environment variables template
└── init-scripts/              # Database initialization scripts
    └── 01-init-database.sh    # PostgreSQL initialization script
```

## Quick Start

### Development
```bash
# Copy environment template (first time only)
cp docker/.env.example docker/.env

# Start development environment
just docker-dev
# OR
docker-compose -f docker/docker-compose.yml up

# View logs
just docker-logs
# OR
docker-compose -f docker/docker-compose.yml logs -f

# Stop services
just docker-down
# OR
docker-compose -f docker/docker-compose.yml down
```

### Production
```bash
# Copy and configure environment file
cp docker/.env.example docker/.env
# Edit docker/.env with your production values

# Start production environment
just docker-prod
# OR
docker-compose -f docker/docker-compose.prod.yml up -d
```

## Docker Commands

### Building Images

```bash
# Build development image
just docker-build-dev
# OR
docker build -f docker/Dockerfile.dev -t watchtower:dev .

# Build production image
just docker-build-prod
# OR
docker build -f docker/Dockerfile -t watchtower:latest .

# Build using docker-compose
just docker-build
# OR
docker-compose -f docker/docker-compose.yml build
```

### Pushing to Docker Hub

```bash
# Login to Docker Hub
docker login

# Method 1: Using justfile commands (recommended)
just docker-publish yourusername           # Builds, tags, and pushes :latest
just docker-publish yourusername v1.0.0    # Builds, tags, and pushes :v1.0.0

# Method 2: Step by step with justfile
just docker-build-prod                     # Build production image
just docker-tag yourusername latest        # Tag for Docker Hub
just docker-push yourusername latest       # Push to Docker Hub

# Method 3: Manual commands
docker tag watchtower:latest yourusername/watchtower:latest
docker tag watchtower:latest yourusername/watchtower:v1.0.0
docker push yourusername/watchtower:latest
docker push yourusername/watchtower:v1.0.0
```

### Running Single Container

```bash
# Run just the app container (requires external DB)
docker run -d \
  --name watchtower-app \
  -p 3000:3000 \
  -e DB_HOST=localhost \
  -e DB_PORT=5432 \
  -e DB_NAME=watchtower \
  -e DB_USER=watchtower \
  -e DB_PASSWORD=your_password \
  -e REDIS_HOST=localhost \
  -e REDIS_PORT=6379 \
  watchtower:latest

# Run with environment file
docker run -d \
  --name watchtower-app \
  -p 3000:3000 \
  --env-file .env \
  watchtower:latest
```

### Docker Compose Commands

```bash
# Development environment
docker-compose -f docker/docker-compose.yml up                    # Start in foreground
docker-compose -f docker/docker-compose.yml up -d                 # Start in background
docker-compose -f docker/docker-compose.yml down                  # Stop and remove containers
docker-compose -f docker/docker-compose.yml down -v               # Stop and remove volumes
docker-compose -f docker/docker-compose.yml logs -f               # View logs
docker-compose -f docker/docker-compose.yml logs -f watchtower    # View app logs only
docker-compose -f docker/docker-compose.yml restart watchtower    # Restart app service
docker-compose -f docker/docker-compose.yml build                 # Rebuild images

# Production environment
docker-compose -f docker/docker-compose.prod.yml up -d
docker-compose -f docker/docker-compose.prod.yml down
docker-compose -f docker/docker-compose.prod.yml logs -f
```

## Environment Configuration

### Environment Variables

Both development and production use `.env` files for configuration. Copy the example file and modify as needed:

```bash
# For development
cp docker/.env.example docker/.env

# For production
cp docker/.env.example docker/.env
# Then edit docker/.env with your production values
```

### Required Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DB_PASSWORD` | Database password | **Yes** | - |
| `JWT_SECRET` | JWT signing secret (32+ chars) | **Yes** | - |
| `SESSION_SECRET` | Session signing secret (32+ chars) | **Yes** | - |
| `DB_NAME` | Database name | No | `watchtower` |
| `DB_USER` | Database username | No | `watchtower` |
| `LOG_LEVEL` | Logging level | No | `info` |
| `PORT` | Application port | No | `3000` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_ENABLED` | Enable API rate limiting | `true` |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | Rate limit per minute | `60` |
| `MONITORING_WORKER_POOL_SIZE` | Worker pool size | `10` |
| `MONITORING_DEFAULT_TIMEOUT` | Default timeout for checks | `30s` |
| `CORS_ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |
| `CACHE_TTL_DEFAULT` | Default cache TTL | `300s` |
| `BCRYPT_COST` | Password hashing cost | `12` |

### Security Variables

| Variable | Description | Required | Production Notes |
|----------|-------------|----------|------------------|
| `JWT_SECRET` | JWT token signing key | **Yes** | Use 32+ random characters |
| `SESSION_SECRET` | Session cookie signing key | **Yes** | Use 32+ random characters |
| `TRUSTED_PROXIES` | Trusted proxy IPs | No | Set for reverse proxies |
| `FORCE_HTTPS` | Force HTTPS redirects | No | Set to `true` in production |
| `SESSION_SECURE` | Secure session cookies | No | Set to `true` in production |

### Database Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `DB_HOST` | Database host | `localhost` | Auto-set to `postgres` in containers |
| `DB_PORT` | Database port | `5432` | - |
| `DB_NAME` | Database name | `watchtower` | - |
| `DB_USER` | Database username | `watchtower` | - |
| `DB_PASSWORD` | Database password | **Required** | Use strong password |
| `DB_SSLMODE` | SSL mode | `disable` | Use `prefer` or `require` in production |
| `DB_MAX_OPEN_CONNS` | Max open connections | `25` | - |
| `DB_MAX_IDLE_CONNS` | Max idle connections | `25` | - |

### Redis Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `REDIS_HOST` | Redis host | `localhost` | Auto-set to `redis` in containers |
| `REDIS_PORT` | Redis port | `6379` | - |
| `REDIS_PASSWORD` | Redis password | Empty | Set if Redis auth enabled |
| `REDIS_DB` | Redis database number | `0` | - |
| `REDIS_MAX_RETRIES` | Max retry attempts | `3` | - |

### Development Environment

Development uses `.env.example` with safe defaults:

```yaml
# Database
DB_HOST: postgres          # Container networking
DB_NAME: watchtower_dev    # Separate dev database
DB_USER: watchtower
DB_PASSWORD: watchtower_password

# Features
GO_ENV: development
LOG_LEVEL: debug
RATE_LIMIT_ENABLED: false  # Disabled for easier development
```

### Production Environment

Production requires a secure `.env` file:

```bash
# Create production .env file
cat > docker/.env << EOF
# Required Production Variables
DB_PASSWORD=your_secure_database_password_here
JWT_SECRET=your_jwt_secret_key_at_least_32_characters_long
SESSION_SECRET=your_session_secret_key_at_least_32_characters_long

# Optional Production Variables
DB_NAME=watchtower
DB_USER=watchtower
LOG_LEVEL=info
PORT=3000
RATE_LIMIT_ENABLED=true
FORCE_HTTPS=true
SESSION_SECURE=true
SESSION_SAME_SITE=strict
DB_SSLMODE=prefer
EOF
```

### Generating Secure Secrets

```bash
# Generate secure JWT and session secrets
export JWT_SECRET=$(openssl rand -base64 32)
export SESSION_SECRET=$(openssl rand -base64 32)
export DB_PASSWORD=$(openssl rand -base64 24)

echo "JWT_SECRET=$JWT_SECRET"
echo "SESSION_SECRET=$SESSION_SECRET"
echo "DB_PASSWORD=$DB_PASSWORD"
```

## Justfile Commands

The project includes convenient justfile commands:

```bash
# Docker operations
just docker-build        # Build images using docker-compose
just docker-up           # Start containers (detached)
just docker-down         # Stop containers
just docker-dev          # Start development environment
just docker-prod         # Start production environment
just docker-logs         # View logs
just docker-clean        # Full cleanup (containers, volumes, images)

# Docker image commands
just docker-build-prod              # Build production image
just docker-build-dev               # Build development image
just docker-tag USERNAME VERSION    # Tag image for Docker Hub
just docker-push USERNAME VERSION   # Push image to Docker Hub
just docker-publish USERNAME VERSION # Build, tag, and push (all-in-one)

# Examples:
just docker-publish myusername           # Publishes as myusername/watchtower:latest
just docker-publish myusername v1.0.0    # Publishes as myusername/watchtower:v1.0.0
```

## Development Workflow

### Hot Reloading Setup

The development environment includes:
- Source code mounted as volume
- Air for Go hot reloading
- Separate dev database
- Debug logging enabled

**Docker Development (with Air hot reload):**
```bash
# Start development environment with hot reload
just docker-dev

# Make changes to code - they'll be reflected immediately
# Database is accessible at localhost:5432
# Redis is accessible at localhost:6379
# App is accessible at localhost:3000
```

**Local Development (with Air hot reload):**
```bash
# Install Air (first time only)
go install github.com/cosmtrek/air@latest

# Start local development with hot reload
just dev-hot
# OR
just server-dev-hot  # Backend only with Air
just frontend-dev    # Frontend only (separate terminal)

# Standard development (no hot reload)
just dev
# OR
just server-dev      # Backend only with go run
```

**Air Configuration:**
The `.air.toml` file configures Air for optimal Go hot reloading:
- Watches `.go`, `.tpl`, `.tmpl`, `.html` files
- Excludes `frontend/`, `tmp/`, `vendor/`, test files
- Builds to `./tmp/main` with 1-second delay
- Automatically restarts on file changes

### Database Access

```bash
# Connect to development database
docker-compose -f docker/docker-compose.yml exec postgres psql -U watchtower -d watchtower_dev

# Connect to production database
docker-compose -f docker/docker-compose.prod.yml exec postgres psql -U watchtower -d watchtower
```

### Running Migrations

```bash
# Development
just db-migrate-up

# Production (inside container)
docker-compose -f docker-compose.prod.yml exec watchtower goose -dir internal/migrations postgres "host=postgres user=watchtower password=$DB_PASSWORD dbname=watchtower port=5432 sslmode=prefer" up
```

## Production Deployment

### Single Server Deployment

```bash
# 1. Create production environment file
cat > .env << EOF
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key_at_least_32_characters_long
SESSION_SECRET=your_session_secret_key_at_least_32_characters_long
EOF

# 2. Start production environment
docker-compose -f docker/docker-compose.prod.yml up -d

# 3. Check logs
docker-compose -f docker/docker-compose.prod.yml logs -f

# 4. Run database migrations
docker-compose -f docker/docker-compose.prod.yml exec watchtower goose -dir internal/migrations postgres "host=postgres user=watchtower password=$DB_PASSWORD dbname=watchtower port=5432 sslmode=prefer" up
```

### Docker Swarm/Kubernetes

For orchestration platforms, use the production image:

```bash
# Build and push image
docker build -t yourusername/watchtower:v1.0.0 .
docker push yourusername/watchtower:v1.0.0

# Deploy to swarm
docker stack deploy -c docker/docker-compose.prod.yml watchtower
```

## Health Checks

All services include health checks:

```bash
# Check service health
docker-compose -f docker/docker-compose.yml ps

# Manual health check
curl http://localhost:3000/health
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in docker-compose.yml
2. **Permission issues**: Ensure Docker daemon is running
3. **Database connection**: Check environment variables
4. **Build failures**: Check Dockerfile and build context

### Debugging Commands

```bash
# View container logs
docker-compose -f docker/docker-compose.yml logs -f watchtower

# Execute shell in container
docker-compose -f docker/docker-compose.yml exec watchtower sh

# Check container processes
docker-compose -f docker/docker-compose.yml exec watchtower ps aux

# View container environment
docker-compose -f docker/docker-compose.yml exec watchtower env
```

### Cleanup Commands

```bash
# Stop and remove everything
just docker-clean

# Manual cleanup
docker-compose -f docker/docker-compose.yml down -v --remove-orphans
docker system prune -f
docker volume prune -f
```

## Security Considerations

### Production Security Features

- Read-only containers
- Non-root user execution
- Security options enabled
- No exposed database ports
- Environment variable configuration
- Resource limits
- Proper logging configuration

### Environment Variables

Never commit production secrets to version control:

```bash
# Use environment variables
export DB_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 32)
export SESSION_SECRET=$(openssl rand -base64 32)
```

## Performance Optimization

### Resource Limits

Production containers include resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 256M
```

### Database Optimization

```yaml
# PostgreSQL production settings
command: >
  postgres
  -c shared_preload_libraries=pg_stat_statements
  -c pg_stat_statements.track=all
  -c max_connections=100
  -c shared_buffers=256MB
  -c work_mem=4MB
```

## Monitoring

### Log Management

```bash
# View logs with timestamps
docker-compose logs -f -t

# View logs for specific service
docker-compose logs -f watchtower

# Log rotation is configured in production
# Max size: 10MB, Max files: 3
```

### Container Stats

```bash
# View resource usage
docker stats

# View specific container
docker stats watchtower-app-prod
```