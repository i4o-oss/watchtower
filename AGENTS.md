# Watchtower - Agent Guide

## Documentation
**Comprehensive Guide**: See [`.docs/ENGINEERING_GUIDE.md`](.docs/ENGINEERING_GUIDE.md) for complete architecture, component deep-dives, deployment, security, and troubleshooting documentation.

## TaskMaster Commands (if available)
- **Daily workflow**: `task-master next` (get next task), `task-master show <id>` (task details), `task-master set-status --id=<id> --status=done`
- **Task management**: `task-master list`, `task-master add-task --prompt="description" --research`, `task-master expand --id=<id> --research`
- **Project setup**: `task-master init`, `task-master parse-prd .taskmaster/docs/prd.txt`, `task-master analyze-complexity --research`
- **Task updates**: `task-master update-subtask --id=<id> --prompt="notes"`, `task-master update --from=<id> --prompt="changes"`
- **Files**: `.taskmaster/tasks/tasks.json` (main data), `.taskmaster/config.json` (config), `.taskmaster/tasks/*.md` (auto-generated)
- **Task IDs**: Main tasks (1, 2, 3), subtasks (1.1, 1.2), sub-subtasks (1.1.1). Status: pending, in-progress, done, blocked

## Build/Test/Lint Commands
- **Full build**: `just build` (builds frontend + backend binary)
- **Dev servers**: `just dev` or `just dev-hot` (parallel frontend+backend with hot reload)
- **Tests**: `just test` (all), `just test-verbose`, `just test-cover-html`, `just test-models`, `just test-monitoring`
- **Single test**: `go test -v ./internal/[package]/` (e.g., `go test -v ./internal/data/`)
- **Lint/Format**: `just lint` (biome for frontend + go fmt), `just fmt` (format all)
- **Type check**: `cd frontend && bun run typecheck`

## Architecture & Structure
**Go backend** (chi router, GORM, PostgreSQL, Redis cache) with **React Router v7 frontend** (TypeScript, Tailwind, shadcn/ui). 
Main packages: `/cmd/api` (server, routes, handlers), `/internal/monitoring` (worker pools, HTTP client, incident detection), `/internal/data` (GORM models, cached DB), `/frontend/app` (React components, routes).
**Database**: PostgreSQL with migrations in `/internal/migrations`, managed via `just db-migrate-up/down`.
**Real-time**: SSE for live monitoring updates, integrated monitoring engine runs within API server.

## Code Style & Conventions
**Go**: PascalCase exports, camelCase unexported, error wrapping with `fmt.Errorf()`, early returns, grouped imports (stdlib/3rd-party/internal).
Models use GORM tags, JSON snake_case. Functions: `New*` constructors, `Get*/Create*/Update*/Delete*` CRUD patterns.
**Frontend**: Biome formatting (tabs, single quotes, semicolons as needed), TypeScript strict mode, shadcn/ui components.
**Error handling**: Pre-defined error variables, consistent wrapping, constants for error messages.
**Testing**: Table-driven tests, proper setup/teardown, mock interfaces for external dependencies.

## Development Workflow
1. Run `just tidy` to install dependencies
2. Start dev: `just dev-hot` (backend on :8080, frontend on :3000)  
3. Database migrations: `just db-migrate-up` after creating with `just db-migrate-create NAME`
4. Test before committing: `just test` and `just lint`
5. Build production: `just build` creates `./bin/watchtower` binary
