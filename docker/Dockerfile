# ==============================================================================
# Build stage - includes Go build tools and dependencies
# ==============================================================================
FROM golang:1.24.2-alpine AS builder

# Install necessary build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy go mod files and download dependencies first (for better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY cmd/ ./cmd/
COPY internal/ ./internal/

# Build the application
# CGO_ENABLED=0 for static binary, -ldflags for smaller binary size
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a -installsuffix cgo \
    -o watchtower \
    ./cmd/api

# ==============================================================================
# Frontend build stage - build React application
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package.json ./
RUN npm install

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Runtime stage - minimal Alpine Linux with only necessary components
# ==============================================================================
FROM alpine:3.19 AS runtime

# Install ca-certificates for HTTPS requests and tzdata for timezone support
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user for security
RUN addgroup -g 1001 -S watchtower && \
    adduser -u 1001 -S watchtower -G watchtower

# Set working directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/watchtower ./watchtower

# Copy frontend build from frontend builder stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy migration files
COPY internal/migrations ./internal/migrations

# Change ownership to non-root user
RUN chown -R watchtower:watchtower /app

# Switch to non-root user
USER watchtower

# Expose port (default Go server port)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Default command
CMD ["./watchtower"]