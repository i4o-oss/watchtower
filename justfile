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
	just db-migrate-up
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

# Database migration commands
db-migrate-up:
    #!/usr/bin/env bash
    set -euo pipefail
    source .env
    goose -dir internal/migrations postgres "host=$DB_HOST user=$DB_USER password=$DB_PASSWORD dbname=$DB_NAME port=$DB_PORT sslmode=$DB_SSLMODE" up

db-migrate-down:
    #!/usr/bin/env bash
    set -euo pipefail
    source .env
    goose -dir internal/migrations postgres "host=$DB_HOST user=$DB_USER password=$DB_PASSWORD dbname=$DB_NAME port=$DB_PORT sslmode=$DB_SSLMODE" down

db-migrate-status:
    #!/usr/bin/env bash
    set -euo pipefail
    source .env
    goose -dir internal/migrations postgres "host=$DB_HOST user=$DB_USER password=$DB_PASSWORD dbname=$DB_NAME port=$DB_PORT sslmode=$DB_SSLMODE" status

db-migrate-create NAME:
    @goose -dir internal/migrations create {{NAME}} sql
