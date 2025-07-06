# Watchtower Docker Setup

This document explains how to run Watchtower using Docker containers for both development and production environments.

## Quick Start

### Development Environment

1. **Initial Setup**
   ```bash
   make setup
   ```

2. **Start Development Environment**
   ```bash
   make dev
   ```

3. **Access the Application**
   - Frontend: http://localhost:3000
   - PostgreSQL: localhost:5433
   - Redis: localhost:6380

### Production Environment

1. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Start Production Environment**
   ```bash
   make build-prod
   ```

## Architecture

### Multi-Stage Dockerfile

The main `Dockerfile` uses a multi-stage build approach:

1. **Builder Stage**: Compiles the Go application with full build tools
2. **Frontend Builder Stage**: Builds the React frontend
3. **Runtime Stage**: Minimal Alpine Linux with only the compiled binary and static files

### Services

#### PostgreSQL Database
- **Image**: postgres:16-alpine
- **Purpose**: Primary data storage
- **Volumes**: Persistent data storage
- **Health Checks**: Built-in PostgreSQL health monitoring

#### Redis Cache
- **Image**: redis:7-alpine
- **Purpose**: Caching and session storage
- **Configuration**: Optimized for memory usage with LRU eviction
- **Persistence**: AOF enabled for data persistence

#### Watchtower Application
- **Build**: Multi-stage Docker build
- **Security**: Runs as non-root user
- **Resources**: CPU and memory limits configured
- **Health Checks**: HTTP health endpoint monitoring

## Configuration

### Environment Variables

All configuration is handled through environment variables. See `.env.example` for a complete list.

**Critical Production Variables:**
```bash
# Security
JWT_SECRET=your-super-secure-jwt-secret
SESSION_SECRET=your-super-secure-session-secret

# Database
DB_PASSWORD=your-secure-database-password

# Application
GO_ENV=production
LOG_LEVEL=info
```

### Resource Limits

**Development:**
- No resource limits (for development flexibility)

**Production:**
- **Application**: 2 CPU cores, 1GB RAM limit
- **PostgreSQL**: 1 CPU core, 1GB RAM limit
- **Redis**: 0.5 CPU cores, 512MB RAM limit

## Development Workflow

### Hot Reloading

Development environment includes hot reloading using Air:

1. **File Watching**: Automatically detects Go file changes
2. **Fast Rebuilds**: Only rebuilds on source changes
3. **Volume Mounting**: Source code mounted as volume
4. **Debug Support**: Delve debugger support on port 2345

### Development Commands

```bash
# Start with logs
make dev-logs

# Rebuild containers
make dev-build

# Reset database
make db-reset

# Run tests
make test

# Clean up
make docker-clean
```

### Frontend Development

The frontend can be developed either:

1. **Inside Docker**: Included in development container
2. **Standalone**: Run `make frontend-dev` for local development server

## Production Deployment

### Security Features

**Container Security:**
- Non-root user execution
- Read-only filesystems where possible
- No new privileges
- Minimal attack surface

**Network Security:**
- Internal network isolation
- No exposed database ports
- Health check endpoints

**Resource Management:**
- Memory and CPU limits
- Automatic container restart policies
- Log rotation and size limits

### Monitoring and Health Checks

**Application Health:**
- HTTP health endpoint: `/health`
- Readiness check: `/ready`
- Liveness check: `/live`

**Service Health:**
- PostgreSQL: Connection and query testing
- Redis: Ping command verification
- Container restart on health failures

### Production Checklist

Before deploying to production:

1. **Environment Configuration**
   - [ ] Update all secrets in `.env`
   - [ ] Set `GO_ENV=production`
   - [ ] Configure proper logging level
   - [ ] Set secure database passwords

2. **Security Review**
   - [ ] JWT secrets are cryptographically secure
   - [ ] Database passwords are strong
   - [ ] CORS origins are properly configured
   - [ ] Rate limiting is enabled

3. **Resource Planning**
   - [ ] Resource limits are appropriate for load
   - [ ] Volume storage is properly configured
   - [ ] Backup strategy is in place

4. **Monitoring Setup**
   - [ ] Health checks are properly configured
   - [ ] Log aggregation is set up
   - [ ] Alert thresholds are defined

## Troubleshooting

### Common Issues

**Port Conflicts:**
```bash
# Check if ports are in use
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5432

# Use different ports in override file
```

**Container Won't Start:**
```bash
# Check logs
make dev-logs

# Check health status
docker-compose ps

# Rebuild containers
make docker-rebuild
```

**Database Connection Issues:**
```bash
# Check database logs
docker-compose logs postgres

# Reset database
make db-reset

# Check environment variables
make check-env
```

**Permission Issues:**
```bash
# Fix volume permissions
docker-compose down
sudo chown -R $(id -u):$(id -g) ./data
```

### Performance Optimization

**Database:**
- Increase shared_buffers for heavy loads
- Configure max_connections based on application needs
- Monitor slow queries

**Redis:**
- Adjust maxmemory based on cache needs
- Monitor memory usage and eviction rates
- Configure persistence based on requirements

**Application:**
- Adjust worker pool size for monitoring load
- Configure rate limits based on expected traffic
- Monitor resource usage and scale accordingly

## Advanced Configuration

### Custom Networks

For complex deployments, you can create custom networks:

```yaml
networks:
  watchtower-frontend:
    driver: bridge
  watchtower-backend:
    driver: bridge
    internal: true
```

### External Services

To use external PostgreSQL or Redis:

```yaml
services:
  watchtower:
    environment:
      DB_HOST: your-external-postgres-host
      REDIS_HOST: your-external-redis-host
```

### Scaling

For horizontal scaling:

```yaml
services:
  watchtower:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
```

## Maintenance

### Regular Tasks

**Daily:**
- Monitor container health and logs
- Check resource usage

**Weekly:**
- Review database performance
- Clean up old logs and temporary files

**Monthly:**
- Update base images for security patches
- Review and rotate secrets
- Backup configuration and data

### Updates

**Application Updates:**
```bash
# Pull latest code
git pull

# Rebuild and deploy
make build-prod
```

**Security Updates:**
```bash
# Update base images
docker-compose pull

# Rebuild with latest images
make docker-rebuild
```