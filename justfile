# Set the default shell
set shell := ["bash", "-c"]

# Directories
SERVER_DIR := "cmd/api"
FRONTEND_DIR := "frontend"

build:
    cd {{FRONTEND_DIR}} && bun run build && cd ..
    @go build -o build/watchtower ./...

default:
    @just --list

dev:
    cd {{FRONTEND_DIR}} && bun run dev && cd ..
    @go run ./...

fmt:
    cd {{FRONTEND_DIR}} && bun run format
    @go fmt ./...

lint:
    cd {{FRONTEND_DIR}} && bun run lint
    golangci-lint run ./...

tidy:
    cd {{FRONTEND_DIR}} && bun i
    @go mod tidy
