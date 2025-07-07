# ==============================================================================
# Multi-stage Dockerfile for Watchtower
# ==============================================================================
# Optimized for all deployment platforms: Railway, Docker, Heroku, etc.

# ==============================================================================
# Build stage - Go application build
# ==============================================================================
FROM golang:1.24.2-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copy go mod files for better layer caching
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code
COPY cmd/ ./cmd/
COPY internal/ ./internal/

# Build optimized binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a -installsuffix cgo \
    -trimpath \
    -o watchtower \
    ./cmd/api

# ==============================================================================
# Frontend build stage - React application build
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files for better layer caching
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --only=production --no-audit --no-fund --silent

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Runtime stage - Minimal production image
# ==============================================================================
FROM alpine:3.19 AS runtime

# Install minimal runtime dependencies and clean up
RUN apk --no-cache add ca-certificates tzdata curl && \
    update-ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S watchtower && \
    adduser -u 1001 -S watchtower -G watchtower

WORKDIR /app

# Copy application files
COPY --from=builder /app/watchtower ./watchtower
COPY --from=frontend-builder /app/frontend/build ./frontend/build
COPY internal/migrations ./internal/migrations

# Set ownership
RUN chown -R watchtower:watchtower /app

# Switch to non-root user
USER watchtower

# Expose port (works with Railway's $PORT or default 8080)
EXPOSE 8080

# Health check (compatible with all platforms)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl --fail --silent --show-error --connect-timeout 3 \
    http://localhost:${PORT:-8080}/health || exit 1

# Environment variables
ENV GO_ENV=production \
    LOG_LEVEL=info \
    PORT=8080

# Signal handling for graceful shutdown
STOPSIGNAL SIGTERM

# Default command
CMD ["./watchtower"]