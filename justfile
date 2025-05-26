# Set the default shell
set shell := ["bash", "-c"]

# Directories
SERVER_DIR := "./cmd/api"
FRONTEND_DIR := "./frontend"

frontend-build:
	cd {{FRONTEND_DIR}} && bun run build

frontend-dev:
	cd {{FRONTEND_DIR}} && bun run dev

server-build:
	@go build -o ./bin/watchtower {{SERVER_DIR}}

server-dev:
	@go run ./...

build:
	just frontend-build
	just server-build

default:
    @just --list

dev:
	#!/usr/bin/env -S parallel --shebang --ungroup
	just server-dev
	just frontend-dev

fmt:
    bun run format
    @go fmt ./...

lint:
    bun run lint
    # golangci-lint run ./...

tidy:
    cd {{FRONTEND_DIR}} && bun i
    @go mod tidy
