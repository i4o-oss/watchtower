# Simple Dockerfile for Watchtower
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Install Bun for package management and task running
RUN npm install -g bun

# Copy frontend package files
COPY frontend/package.json bun.lock ./
RUN bun install

# Copy frontend source
COPY frontend/ ./

# Set frontend env variables for build
ENV VITE_API_BASE_URL=http://localhost:3000

RUN bun run build

# Go build stage
FROM golang:1.24.2-alpine AS builder

WORKDIR /app

# Install basic dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Build Go app
RUN go build -o watchtower ./cmd/api

EXPOSE 3000

CMD ["./watchtower"]
