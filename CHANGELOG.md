# Changelog

All notable changes to Watchtower will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Docker Images

Docker images are available at:
- **Docker Hub**: [`i4o-oss/watchtower`](https://hub.docker.com/r/i4o-oss/watchtower)

### Installation

```bash
# Latest release
docker pull i4o-oss/watchtower:latest

# Specific version
docker pull i4o-oss/watchtower:v1.0.0
```

---

## [Unreleased]

### 🚀 New Features
- Initial release of Watchtower monitoring system
- Web-based uptime monitoring dashboard
- Real-time status page with SSE updates
- Incident management and tracking
- Multi-channel notification system (Discord, Slack, Email, Webhook)
- Admin dashboard for endpoint configuration
- Authentication and user management
- Performance monitoring with response time tracking
- Automated incident detection and resolution
- Docker-based deployment with PostgreSQL and Redis support

### 🔧 Technical Features
- Go backend with Chi router
- React frontend with Remix framework
- PostgreSQL database with GORM
- Redis caching support
- Docker containerization
- Database migrations with Goose
- Comprehensive test coverage
- Security middleware and CSRF protection
- Rate limiting and request validation
- Structured logging with different levels

### 📦 Infrastructure
- Multi-stage Docker builds optimized for production
- Docker Compose setup for local development
- Railway.app deployment configuration
- GitHub Actions CI/CD pipeline
- Automated release management with GoReleaser
- Semantic versioning with SVU
- Changelog generation with Changie