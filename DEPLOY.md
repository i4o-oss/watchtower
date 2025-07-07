# Deployment Guide

## Deploy to Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/watchtower)

Railway provides managed PostgreSQL and Redis, automatic HTTPS, and one-click deployment.

👉 **[Complete Railway Setup Guide](RAILWAY.md)** - Step-by-step deployment instructions

## Docker Deployment
```bash
docker run -d \
  --name watchtower \
  -p 8080:8080 \
  -e DATABASE_URL=your_postgres_url \
  -e JWT_SECRET=your_jwt_secret \
  -e SESSION_SECRET=your_session_secret \
  i4o-oss/watchtower:latest
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (32+ characters)  
- `SESSION_SECRET` - Secret key for sessions (32+ characters)

### Optional
- `REDIS_URL` - Redis connection for caching
- `PORT` - Server port (default: 8080)
- `LOG_LEVEL` - Logging level (info, debug, warn, error)

## Health Checks
- `/health` - Basic health check
- `/health/ready` - Database connectivity check
- `/health/live` - Application liveness check