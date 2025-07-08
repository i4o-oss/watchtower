# Set the default shell
set shell := ["bash", "-c"]

# Directories
SERVER_DIR := "./cmd/api"
FRONTEND_DIR := "./frontend"

default:
    @just --list

frontend-build:
	cd {{FRONTEND_DIR}} && bun run build

frontend-dev:
	cd {{FRONTEND_DIR}} && bun run dev

server-build:
	@go build -o ./bin/watchtower {{SERVER_DIR}}

server-dev:
	@go run ./...

server-dev-hot:
	@air -c .air.toml

build:
	just frontend-build
	just server-build

dev:
	#!/usr/bin/env -S parallel --shebang --ungroup
	just server-dev
	just frontend-dev

dev-hot:
	#!/usr/bin/env -S parallel --shebang --ungroup
	just server-dev-hot
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

# Test commands
test:
    @go test ./...

test-verbose:
    @go test -v ./...

test-cover:
    @go test -cover ./...

test-cover-html:
    @go test -coverprofile=coverage.out ./...
    @go tool cover -html=coverage.out -o coverage.html
    @echo "Coverage report generated: coverage.html"

test-models:
    @go test -v ./internal/data/

test-middleware:
    @go test -v ./cmd/api/

test-monitoring:
    @go test -v ./internal/monitoring/

test-security:
    @go test -v ./internal/security/

vet:
    @go vet ./...

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

# Docker commands
docker-build:
    docker-compose -f docker/docker-compose.yml build

docker-up:
    docker-compose -f docker/docker-compose.yml up -d

docker-down:
    docker-compose -f docker/docker-compose.yml down

docker-dev:
    docker-compose -f docker/docker-compose.yml up

docker-prod:
    docker-compose -f docker/docker-compose.prod.yml up -d

docker-logs:
    docker-compose -f docker/docker-compose.yml logs -f

docker-clean:
    docker-compose -f docker/docker-compose.yml down -v --remove-orphans
    docker system prune -f

# Docker image commands
docker-build-prod:
    docker build -f docker/Dockerfile -t watchtower:latest .

docker-build-dev:
    docker build -f docker/Dockerfile.dev -t watchtower:dev .

docker-tag USERNAME VERSION="latest":
    docker tag watchtower:latest {{USERNAME}}/watchtower:{{VERSION}}

docker-push USERNAME VERSION="latest":
    docker push {{USERNAME}}/watchtower:{{VERSION}}

docker-publish USERNAME VERSION="latest":
    just docker-build-prod
    just docker-tag {{USERNAME}} {{VERSION}}
    just docker-push {{USERNAME}} {{VERSION}}
