# Watchtower Engineering Guide

*A comprehensive guide for new engineers to understand the watchtower codebase*

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Design](#architecture--design)
3. [Codebase Structure](#codebase-structure)
4. [Development Setup](#development-setup)
5. [Core Components Deep Dive](#core-components-deep-dive)
6. [Database Layer](#database-layer)
7. [Caching Strategy](#caching-strategy)
8. [API Layer](#api-layer)
9. [Security](#security)
10. [Frontend Architecture](#frontend-architecture)
11. [Testing Strategy](#testing-strategy)
12. [Deployment & DevOps](#deployment--devops)
13. [Development Workflows](#development-workflows)
14. [Code Patterns & Conventions](#code-patterns--conventions)
15. [Troubleshooting](#troubleshooting)
16. [Learning Path](#learning-path)

---

## Project Overview

### What is Watchtower?

Watchtower is a comprehensive website monitoring and incident management platform built with Go and React. It provides:

- **Real-time monitoring** of HTTP endpoints
- **Incident detection and management**
- **Public status pages** for transparency
- **Admin dashboards** for management
- **Performance analytics** and reporting

### Key Features

- 🔍 **HTTP Endpoint Monitoring**: Check websites, APIs, and services
- 📊 **Real-time Dashboards**: Live monitoring data and charts
- 🚨 **Incident Management**: Automatic detection and manual incident creation
- 📈 **Performance Metrics**: Response times, uptime statistics
- 🔐 **Authentication**: Secure admin access with session management
- 📱 **Responsive UI**: Works on desktop and mobile
- 🐳 **Docker Ready**: Containerized deployment
- ☁️ **Cloud Deployable**: Ready for Railway, AWS, etc.

### Tech Stack

**Backend (Go)**:
- **Framework**: Standard library + Gorilla Mux
- **Database**: PostgreSQL with GORM
- **Authentication**: Session-based with bcrypt
- **Real-time**: Server-Sent Events (SSE)
- **Caching**: Redis (optional) + in-memory fallback

**Frontend (React)**:
- **Framework**: React 18 + React Router v7
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **State Management**: React Context + hooks

**DevOps**:
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Deployment**: Railway Platform
- **Database**: PostgreSQL with migrations

---

## Architecture & Design

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Go)         │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • Admin UI      │    │ • HTTP API      │    │ • Endpoints     │
│ • Status Page   │    │ • Monitoring    │    │ • Logs          │
│ • Real-time     │    │ • Incidents     │    │ • Incidents     │
│   Updates       │    │ • SSE           │    │ • Users         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Monitoring    │
                       │   Engine        │
                       │                 │
                       │ • HTTP Client   │
                       │ • Scheduler     │
                       │ • Worker Pool   │
                       │ • Incident      │
                       │   Detection     │
                       └─────────────────┘
```

### Core Design Principles

1. **Separation of Concerns**: Clear boundaries between monitoring, API, and data layers
2. **Concurrency**: Go's goroutines for parallel monitoring
3. **Reliability**: Retry logic, circuit breakers, and graceful degradation
4. **Performance**: Efficient database queries, caching, and minimal allocations
5. **Maintainability**: Clear interfaces, comprehensive tests, and documentation

---

## Codebase Structure

### Repository Layout

```
watchtower/
├── cmd/                    # Application entry points
│   └── api/               # Main API server
│       ├── main.go        # Server bootstrap
│       ├── routes.go      # Route definitions
│       ├── handlers.go    # HTTP handlers
│       ├── middleware.go  # HTTP middleware
│       └── server.go      # Server configuration
├── internal/              # Private application code
│   ├── data/             # Database layer
│   │   ├── models.go     # Database models
│   │   ├── database.go   # Database connection
│   │   └── cached_db.go  # Cached database wrapper
│   ├── monitoring/       # Monitoring engine
│   │   ├── engine.go     # Main monitoring engine
│   │   ├── scheduler.go  # Task scheduling
│   │   ├── worker_pool.go # Worker pool implementation
│   │   ├── http_client.go # HTTP client for monitoring
│   │   └── incident_detector.go # Incident detection
│   ├── cache/            # Caching layer
│   │   ├── memory.go     # In-memory cache
│   │   ├── redis.go      # Redis cache
│   │   └── noop.go       # No-op cache
│   └── security/         # Security utilities
│       ├── csrf.go       # CSRF protection
│       ├── headers.go    # Security headers
│       └── sanitizer.go  # Input sanitization
├── frontend/             # React frontend
│   ├── app/             # Application code
│   │   ├── components/  # Reusable components
│   │   ├── routes/      # Page components
│   │   └── lib/         # Utilities and hooks
│   ├── public/          # Static assets
│   └── build/           # Build output
├── migrations/          # Database migrations
├── docker/             # Docker configuration
├── scripts/            # Build and utility scripts
└── docs/              # Documentation
```

### Key Directories Explained

#### `/cmd/api/`
- **Purpose**: Main application entry point
- **Key Files**:
  - `main.go`: Application bootstrap, database setup, server start
  - `routes.go`: All HTTP route definitions
  - `middleware.go`: Authentication, CORS, logging middleware
  - `handlers.go`: HTTP request handlers for all endpoints

#### `/internal/data/`
- **Purpose**: Database models and data access layer
- **Key Files**:
  - `models.go`: GORM models for all database tables
  - `database.go`: Database connection and basic operations
  - `cached_db.go`: Caching wrapper for database operations

#### `/internal/monitoring/`
- **Purpose**: Core monitoring engine and related components
- **Key Files**:
  - `engine.go`: Main monitoring engine orchestration
  - `scheduler.go`: Task scheduling and timing
  - `worker_pool.go`: Concurrent worker management
  - `http_client.go`: HTTP client with retry logic and timeouts

#### `/frontend/app/`
- **Purpose**: React application frontend
- **Key Directories**:
  - `routes/`: Page components (admin, dashboard, status page)
  - `components/`: Reusable UI components
  - `lib/`: Utilities, API client, authentication logic

---

## Development Setup

### Prerequisites

- **Go 1.21+**: Backend development
- **Node.js 18+**: Frontend development (or Bun for faster builds)
- **PostgreSQL 13+**: Database
- **Docker**: For containerized development (optional)
- **Just**: Task runner (or use npm scripts)

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd watchtower
   ```

2. **Install dependencies**:
   ```bash
   # Backend dependencies
   go mod download
   
   # Frontend dependencies
   cd frontend && npm install
   # OR using Bun (faster)
   cd frontend && bun install
   ```

3. **Setup environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Setup database**:
   ```bash
   # Start PostgreSQL (via Docker)
   docker-compose up -d postgres
   
   # Run migrations
   just db-migrate-up
   ```

5. **Start development servers**:
   ```bash
   # Start both frontend and backend
   just dev
   
   # Or separately:
   just server-dev    # Backend on :8080
   just frontend-dev  # Frontend on :3000
   ```

### Environment Configuration

Key environment variables in `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=watchtower
DB_PASSWORD=your_password
DB_NAME=watchtower
DB_SSLMODE=disable

# Server
PORT=8080
ENV=development

# Security
SECRET_KEY=your-secret-key-here
CORS_ORIGIN=http://localhost:3000

# Cache (optional)
REDIS_URL=redis://localhost:6379
```

### Available Commands

Using `just` (recommended):

```bash
# Development
just dev              # Start both frontend and backend
just server-dev       # Start backend only
just frontend-dev     # Start frontend only
just dev-hot          # Start with hot reload

# Building
just build            # Build both frontend and backend
just server-build     # Build backend binary
just frontend-build   # Build frontend assets

# Testing
just test             # Run all tests
just test-verbose     # Run tests with verbose output
just test-cover       # Run tests with coverage
just test-models      # Run model tests only
just test-monitoring  # Run monitoring tests only

# Database
just db-migrate-up    # Run database migrations
just db-migrate-down  # Rollback migrations
just db-migrate-status # Check migration status

# Docker
just docker-dev       # Start with Docker
just docker-build     # Build Docker images
```

---

## Core Components Deep Dive

### 1. Monitoring Engine (`internal/monitoring/`)

The heart of the application that runs as an integrated service within the main API server. Responsible for:
- Scheduling endpoint checks based on configured intervals
- Executing HTTP requests concurrently via worker pool
- Detecting incidents from monitoring results
- Storing monitoring results and broadcasting real-time updates

#### Key Components:

**Engine (`engine.go`)**:
```go
type MonitoringEngine struct {
    workerPool       *WorkerPool
    scheduler        *Scheduler
    incidentDetector *IncidentDetector
    db               *data.DB
    logger           *log.Logger
    resultCallback   ResultCallback  // For SSE broadcasting
    // ... lifecycle management
}
```

**Integration with Main Application**:
- Starts automatically when the API server starts
- Connects directly to admin API for real-time endpoint management
- Broadcasts monitoring results via Server-Sent Events (SSE)
- Gracefully shuts down with the main application

**Scheduler (`scheduler.go`)**:
- Manages when endpoints should be checked based on configured intervals
- Automatically picks up new endpoints added via admin API
- Handles dynamic endpoint updates and removals
- Respects endpoint-specific timing and load balancing

**Worker Pool (`worker_pool.go`)**:
- Concurrent execution of monitoring tasks using configurable worker count
- Job queuing and result processing with callback system
- Integrates with SSE system for real-time result broadcasting
- Handles monitoring result storage and real-time updates

**HTTP Client (`http_client.go`)**:
- Robust HTTP client with retry logic and exponential backoff
- Configurable timeouts, redirects, and response body size limiting
- Comprehensive error handling and classification
- Connection pooling and resource management

#### Real-time Monitoring Flow:
1. **Endpoint Creation**: Admin creates endpoint → Immediately added to monitoring engine
2. **Scheduling**: Scheduler identifies due endpoints based on intervals
3. **Execution**: Jobs queued to worker pool for concurrent processing
4. **HTTP Monitoring**: Workers execute HTTP requests via HTTP client
5. **Result Processing**: Results stored in database and broadcast via SSE
6. **Real-time Updates**: Frontend receives live status updates without polling

### 2. Database Layer (`internal/data/`)

Handles all database operations with caching support.

#### Models (`models.go`):

**Core Models**:
```go
type Endpoint struct {
    ID              uuid.UUID `gorm:"primaryKey"`
    Name            string
    URL             string
    Method          string
    Headers         HTTPHeaders `gorm:"type:jsonb"`
    Body            string
    IntervalSeconds int
    TimeoutSeconds  int
    Enabled         bool
    // ... timestamps and relationships
}

type MonitoringLog struct {
    ID           uuid.UUID `gorm:"primaryKey"`
    EndpointID   uuid.UUID
    Timestamp    time.Time
    StatusCode   int
    ResponseTime int64 // milliseconds
    Success      bool
    ErrorMessage string
    // ... additional fields
}

type Incident struct {
    ID          uuid.UUID `gorm:"primaryKey"`
    Title       string
    Description string
    Severity    string
    Status      string
    StartTime   time.Time
    EndTime     *time.Time
    // ... relationships
}
```

#### Database Operations:
- **CRUD operations** for all models
- **Relationship management** with proper foreign keys
- **Query optimization** with indexes
- **Caching layer** for frequently accessed data

### 3. API Layer (`cmd/api/`)

RESTful API with integrated monitoring engine and real-time updates.

#### Application Structure:
```go
type Application struct {
    config           Config
    logger           *log.Logger
    db               *data.CachedDB
    cache            cache.Cache
    sseHub           *SSEHub
    securityHeaders  *security.SecurityHeaders
    csrfProtection   *security.CSRFProtection
    monitoringEngine *monitoring.MonitoringEngine  // Integrated monitoring
}
```

#### Route Structure:
```go
// Public routes (no auth required)
r.HandleFunc("/api/v1/status", handlers.GetPublicStatus)
r.HandleFunc("/api/v1/uptime/{id}", handlers.GetUptimeData)
r.HandleFunc("/api/v1/incidents", handlers.GetPublicIncidents)
r.HandleFunc("/api/v1/events", handlers.HandleSSE)  // Real-time updates

// Admin routes (auth required)
admin := r.PathPrefix("/api/v1/admin").Subrouter()
admin.Use(middleware.RequireAuth)
admin.HandleFunc("/endpoints", handlers.EndpointCRUD)
admin.HandleFunc("/incidents", handlers.IncidentCRUD)
admin.HandleFunc("/monitoring-logs", handlers.GetMonitoringLogs)
```

#### Integrated Endpoint Management:
When endpoints are created, updated, or deleted via the admin API:

```go
func (app *Application) createEndpoint(w http.ResponseWriter, r *http.Request) {
    // 1. Create endpoint in database
    if err := app.db.CreateEndpoint(endpoint); err != nil {
        // Handle error
        return
    }
    
    // 2. Broadcast real-time update via SSE
    app.sseHub.BroadcastEndpointUpdate("endpoint_created", endpoint)
    
    // 3. Add to monitoring engine immediately
    if app.monitoringEngine != nil && app.monitoringEngine.IsRunning() {
        if err := app.monitoringEngine.AddEndpoint(endpoint); err != nil {
            app.logger.Error("Error adding endpoint to monitoring", "err", err)
        }
    }
    
    app.writeJSON(w, http.StatusCreated, endpoint)
}
```

#### Key Handlers:
- **Endpoint Management**: CRUD operations with automatic monitoring integration
- **Incident Management**: View, create, update incidents with timeline tracking
- **Monitoring Data**: Historical logs and real-time metrics
- **Authentication**: Session-based auth with CSRF protection
- **Real-time Updates**: SSE for live admin dashboard and status page updates

### 4. Real-time Updates (SSE)

Comprehensive Server-Sent Events system for live updates across the application.

#### SSE Hub Implementation:
```go
type SSEHub struct {
    clients    map[*SSEClient]bool
    broadcast  chan []byte
    register   chan *SSEClient
    unregister chan *SSEClient
}

// Broadcasts endpoint changes
func (h *SSEHub) BroadcastEndpointUpdate(eventType string, endpoint interface{}) {
    message := SSEMessage{
        Event: eventType, // "endpoint_created", "endpoint_updated", "endpoint_deleted"
        Data:  endpoint,
        ID:    fmt.Sprintf("%d", time.Now().UnixNano()),
    }
    // Send to all connected clients
}

// Broadcasts monitoring results
func (h *SSEHub) BroadcastStatusUpdate(endpointID, endpointName, status string, responseTime *int) {
    update := StatusUpdateMessage{
        EndpointID:   endpointID,
        EndpointName: endpointName,
        Status:       status,
        ResponseTime: responseTime,
        Timestamp:    time.Now(),
    }
    // Broadcast to all clients
}
```

#### Reusable SSE Hook (Frontend)

To reduce code duplication and provide consistent SSE handling across components, use the `useSSE` hook:

```typescript
// hooks/useSSE.ts
import { useEffect, useRef } from 'react'

export interface SSEEventHandler {
    (event: MessageEvent): void
}

export interface SSEOptions {
    url?: string
    withCredentials?: boolean
    onOpen?: () => void
    onError?: (error: Event) => void
}

export interface SSEEventConfig {
    [eventType: string]: SSEEventHandler
}

export function useSSE(events: SSEEventConfig, options: SSEOptions = {}) {
    const eventSourceRef = useRef<EventSource | null>(null)
    const {
        url = `${import.meta.env.VITE_API_BASE_URL}/api/v1/events`,
        withCredentials = true,
        onOpen,
        onError,
    } = options

    useEffect(() => {
        const eventSource = new EventSource(url, { withCredentials })
        eventSourceRef.current = eventSource

        // Set up event listeners
        Object.entries(events).forEach(([eventType, handler]) => {
            eventSource.addEventListener(eventType, handler)
        })

        eventSource.onopen = () => {
            console.debug('SSE connection established')
            onOpen?.()
        }

        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error)
            onError?.(error)
        }

        return () => {
            eventSource.close()
        }
    }, [url, withCredentials, onOpen, onError])

    return {
        close: () => {
            eventSourceRef.current?.close()
        },
        readyState: eventSourceRef.current?.readyState,
    }
}
```

#### Usage Example:
```typescript
// In any component that needs real-time updates
export default function AdminEndpoints() {
    const [endpoints, setEndpoints] = useState(initialData)
    
    // Use SSE hook for real-time updates
    useSSE({
        endpoint_created: (event) => {
            const newEndpoint = JSON.parse(event.data)
            setEndpoints(prev => [...prev, newEndpoint])
        },
        endpoint_updated: (event) => {
            const updatedEndpoint = JSON.parse(event.data)
            setEndpoints(prev => 
                prev.map(ep => ep.id === updatedEndpoint.id ? updatedEndpoint : ep)
            )
        },
        endpoint_deleted: (event) => {
            const deletedEndpoint = JSON.parse(event.data)
            setEndpoints(prev => prev.filter(ep => ep.id !== deletedEndpoint.id))
        },
    })
}
```

#### Real-time Event Types:
- **endpoint_created**: New endpoint added to monitoring
- **endpoint_updated**: Endpoint configuration changed
- **endpoint_deleted**: Endpoint removed from monitoring
- **status_update**: Live monitoring results from worker pool
- **incident_created/updated**: Incident management updates
- **ping**: Keep-alive events

---

## Database Layer

### Schema Design

The database schema is designed for performance and data integrity:

#### Core Tables:

**endpoints**:
- Stores monitoring configuration
- UUID primary keys for security
- JSONB for flexible headers storage
- Indexes on frequently queried fields

**monitoring_logs**:
- High-volume table for monitoring results
- Partitioned by time for performance
- Compressed older data
- Indexes for time-based queries

**incidents**:
- Incident tracking and management
- Links to affected endpoints
- Status and severity classification
- Timeline tracking

**users**:
- Authentication and authorization
- Bcrypt password hashing
- Role-based access control

### Migration Strategy

Migrations are managed with Goose:

```sql
-- migrations/001_initial.sql
CREATE TABLE endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    headers JSONB,
    body TEXT,
    interval_seconds INTEGER NOT NULL DEFAULT 300,
    timeout_seconds INTEGER NOT NULL DEFAULT 30,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_endpoints_enabled ON endpoints(enabled);
CREATE INDEX idx_endpoints_interval ON endpoints(interval_seconds);
```

### Query Patterns

Common query patterns optimized for performance:

```go
// Get enabled endpoints for monitoring
func (db *DB) GetEnabledEndpoints() ([]Endpoint, error) {
    var endpoints []Endpoint
    err := db.conn.Where("enabled = ?", true).Find(&endpoints).Error
    return endpoints, err
}

// Get recent monitoring logs with pagination
func (db *DB) GetRecentLogs(hours int, limit int) ([]MonitoringLog, error) {
    var logs []MonitoringLog
    cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)
    
    err := db.conn.Where("timestamp > ?", cutoff).
        Order("timestamp DESC").
        Limit(limit).
        Find(&logs).Error
    
    return logs, err
}
```

---

## Caching Strategy

### Overview

Watchtower implements a focused caching strategy that prioritizes **data consistency over cache performance** for user-facing operations. The system uses Redis as the primary cache with in-memory fallback, but only for specific use cases where consistency is less critical.

### Caching Philosophy

1. **Consistency First**: Critical user operations (admin dashboard, status page) always fetch fresh data
2. **Strategic Caching**: Only cache data where consistency is less critical or data is relatively stable
3. **Simplified Management**: Avoid complex cache invalidation patterns by not caching frequently changing data

### What We Cache

#### ✅ Data We Cache

1. **Rate Limiting Data**
   - Purpose: Prevent API abuse
   - TTL: 1 minute
   - Rationale: Brief inconsistency acceptable for rate limiting

2. **User Authentication Data**
   - Purpose: Reduce database load for frequent auth checks
   - TTL: 1 hour
   - Rationale: User data changes infrequently

3. **Current Day Monitoring Logs** (Only for queries ≤ 24 hours)
   - Purpose: Performance optimization for dashboard charts
   - TTL: 24 hours
   - Rationale: Current day data is relatively stable after initial creation

#### ❌ Data We DON'T Cache

1. **Endpoint Operations** (Create, Read, Update, Delete)
   - Always fetch from database
   - Critical for admin dashboard consistency
   - Ensures new endpoints appear immediately

2. **Incident Operations** (Create, Read, Update, Delete)
   - Always fetch from database
   - Critical for incident management accuracy

3. **Uptime Statistics**
   - Always calculated fresh
   - Ensures accuracy for status pages

4. **Latest Monitoring Status**
   - Always fetch from database
   - Critical for real-time status accuracy

### Implementation Details

#### Cache Layer Architecture

```go
// CachedDB wraps the regular DB with strategic caching
type CachedDB struct {
    *DB
    cache      cache.Cache
    keyBuilder *CacheKeyBuilder
}
```

#### Cache Backend Selection

The system automatically selects the cache backend based on configuration:

```bash
# .env configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
CACHE_ENABLED=true  # Required to enable Redis
```

- **Redis**: Used when `CACHE_ENABLED=true` and Redis credentials are provided
- **In-Memory**: Fallback when Redis is unavailable or not configured

#### Key Cache Operations

**User Authentication Caching:**
```go
func (cdb *CachedDB) GetUserByEmail(email string) (*User, error) {
    key := fmt.Sprintf(cache.CacheKeyUserByEmail, email)
    
    // Try cache first
    var user User
    if err := cdb.cache.Get(key, &user); err == nil {
        return &user, nil
    }
    
    // Cache miss, get from database and cache result
    user_ptr, err := cdb.DB.GetUserByEmail(email)
    if err != nil {
        return nil, err
    }
    
    cdb.cache.Set(key, *user_ptr, cache.CacheExpireLong)
    return user_ptr, nil
}
```

**Monitoring Logs Conditional Caching:**
```go
func (cdb *CachedDB) GetMonitoringLogsWithPagination(page, limit, hours int, endpointID *uuid.UUID, success *bool) ([]MonitoringLog, int64, error) {
    // Only cache if hours <= 24 (current day data)
    shouldCache := hours <= 24
    
    if shouldCache {
        // Try cache first, fall back to database
        // Cache result with 24h TTL
    }
    
    // Always fetch from database for longer periods
    return cdb.DB.GetMonitoringLogsWithPagination(page, limit, hours, endpointID, success)
}
```

**Direct Database Access (No Caching):**
```go
func (cdb *CachedDB) GetEndpointsWithPagination(page, limit int, enabled *bool) ([]Endpoint, int64, error) {
    // Always fetch from database to ensure immediate consistency after create/update/delete
    // This is the most critical endpoint for admin UI, so we prioritize consistency over cache performance
    return cdb.DB.GetEndpointsWithPagination(page, limit, enabled)
}
```

### Cache Key Patterns

The system uses consistent cache key patterns defined in `internal/cache/cache.go`:

```go
const (
    // User caching
    CacheKeyUser        = "user:%s"
    CacheKeyUserByEmail = "user:email:%s"
    
    // Monitoring logs caching (current day only)
    CacheKeyMonitoringLogs = "monitoring_logs:page:%d:limit:%d:hours:%d:endpoint:%s:success:%v"
    
    // Rate limiting
    CacheKeyRateLimit = "rate_limit:%s:%s" // IP:endpoint
    
    // Session caching
    CacheKeySession = "session:%s"
)
```

### Cache Invalidation

#### Minimal Invalidation Strategy

Since we cache very little data, cache invalidation is simplified:

1. **Monitoring Logs**: Invalidate only current day caches when new logs are created
2. **User Data**: Rarely invalidated (users change infrequently)
3. **No Endpoint/Incident Invalidation**: Not needed since we don't cache this data

#### Pattern Matching Support

The cache layer supports wildcard pattern deletion:

```go
// Memory cache wildcard support
if pattern[len(pattern)-1] == '*' {
    prefix := pattern[:len(pattern)-1]
    for key := range m.items {
        if len(key) >= len(prefix) && key[:len(prefix)] == prefix {
            keysToDelete = append(keysToDelete, key)
        }
    }
}
```

### Cache Expiration Times

```go
const (
    CacheExpireShort    = 5 * time.Minute   // For frequently changing data
    CacheExpireMedium   = 15 * time.Minute  // For semi-static data
    CacheExpireLong     = 1 * time.Hour     // For static data (users)
    CacheExpireVeryLong = 24 * time.Hour    // For very static data (monitoring logs)
    
    // Rate limiting
    RateLimitExpire = 1 * time.Minute
    
    // Session expiration
    SessionExpire = 24 * time.Hour
)
```

### Monitoring and Health Checks

#### Cache Health

The application includes cache health monitoring:

```go
func (cdb *CachedDB) GetCacheStats() map[string]interface{} {
    return map[string]interface{}{
        "cache_type": "redis",
        "status":     "connected",
    }
}
```

#### Performance Considerations

1. **Database Load**: Reduced for user auth and rate limiting
2. **Memory Usage**: Minimal due to focused caching strategy
3. **Consistency**: Prioritized over cache hit rates
4. **Complexity**: Greatly reduced by avoiding complex invalidation

### Development Guidelines

#### When to Add Caching

Only add caching for new data if:
1. Data changes infrequently
2. Consistency can tolerate brief delays
3. Performance benefits justify added complexity

#### When NOT to Cache

Avoid caching for:
1. User-facing CRUD operations
2. Real-time status data
3. Frequently changing data
4. Critical accuracy requirements

#### Testing Cache Behavior

```bash
# Test with Redis enabled
CACHE_ENABLED=true go test ./internal/data

# Test with memory cache fallback
CACHE_ENABLED=false go test ./internal/data

# Test cache invalidation
redis-cli FLUSHALL  # Clear all cache data
```

### Migration from Heavy Caching

This focused strategy replaces a previous heavy caching approach that caused consistency issues. Key changes:

1. **Removed**: Endpoint caching (all operations)
2. **Removed**: Incident caching (all operations)
3. **Removed**: Uptime statistics caching
4. **Kept**: User authentication caching
5. **Modified**: Monitoring logs (current day only)
6. **Kept**: Rate limiting caching

This change prioritizes user experience and data accuracy over theoretical performance gains.

---

## API Layer

### API Design Principles

1. **RESTful**: Standard HTTP methods and status codes
2. **Consistent**: Uniform response formats
3. **Secure**: Authentication and input validation
4. **Documented**: Clear endpoint documentation
5. **Versioned**: API versioning for compatibility

### Endpoint Categories

#### Public Endpoints (`/api/public/`)
No authentication required. Used by status pages and public dashboards.

```
GET /api/public/status           # Overall system status
GET /api/public/endpoints        # Public endpoint statuses
GET /api/public/incidents        # Public incident information
```

#### Admin Endpoints (`/api/admin/`)
Require authentication. Used by admin dashboards.

```
# Endpoint Management
GET    /api/admin/endpoints      # List all endpoints
POST   /api/admin/endpoints      # Create new endpoint
GET    /api/admin/endpoints/{id} # Get specific endpoint
PUT    /api/admin/endpoints/{id} # Update endpoint
DELETE /api/admin/endpoints/{id} # Delete endpoint

# Incident Management
GET    /api/admin/incidents      # List incidents
POST   /api/admin/incidents      # Create incident
GET    /api/admin/incidents/{id} # Get specific incident
PUT    /api/admin/incidents/{id} # Update incident

# Monitoring Data
GET    /api/admin/logs           # Get monitoring logs
GET    /api/admin/stats          # Get system statistics
```

#### Real-time Endpoints
```
GET /api/admin/sse               # Server-Sent Events stream
GET /api/admin/performance       # Performance metrics
```

### Request/Response Formats

#### Standard Response Format:
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

#### Error Response Format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid endpoint configuration",
    "details": {
      "url": "URL is required",
      "method": "Method must be GET, POST, PUT, or DELETE"
    }
  }
}
```

### Middleware Stack

The API uses a layered middleware approach:

```go
// Global middleware
router.Use(middleware.LogRequest)
router.Use(middleware.SecurityHeaders)
router.Use(middleware.CORS)
router.Use(middleware.RateLimiter)

// Auth-required routes
admin.Use(middleware.RequireAuth)
admin.Use(middleware.CSRFProtection)
```

#### Key Middleware:

**Authentication (`middleware.go`)**:
```go
func (app *Application) RequireAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        sessionID, err := app.getSessionID(r)
        if err != nil {
            http.Error(w, "Authentication required", http.StatusUnauthorized)
            return
        }
        
        user, err := app.getUserFromSession(sessionID)
        if err != nil {
            http.Error(w, "Invalid session", http.StatusUnauthorized)
            return
        }
        
        // Add user to context
        ctx := context.WithValue(r.Context(), "user", user)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

---

## Security

### Overview

The application implements defense-in-depth security measures including:

1. **Input Sanitization & Validation**
2. **CSRF Protection**
3. **XSS Prevention**
4. **Comprehensive Security Headers**
5. **Rate Limiting**
6. **Secure Authentication**

### Input Sanitization & Validation

#### Features

- **Comprehensive Input Sanitization**: All user inputs are sanitized to remove potentially malicious content
- **Type-Specific Validation**: Different validation rules for emails, URLs, JSON, HTML content, and HTTP headers
- **Length Limits**: Enforced maximum lengths for all input fields
- **Character Filtering**: Removal of null bytes and control characters
- **Script Injection Prevention**: Detection and blocking of common script injection patterns

#### Implementation

The `security.Sanitizer` (`internal/security/sanitizer.go`) provides the following sanitization methods:

- `SanitizeString()`: General string sanitization with length limits
- `SanitizeHTML()`: HTML escaping to prevent XSS
- `SanitizeEmail()`: Email format validation and normalization
- `SanitizeURL()`: URL validation with allowed schemes (http/https)
- `SanitizeHTTPMethod()`: HTTP method validation
- `SanitizeJSON()`: JSON structure validation and script injection prevention
- `SanitizeHeaders()`: HTTP header validation and injection prevention

#### Usage

```go
sanitizer := security.NewSanitizer()
result := sanitizer.SanitizeEmail(userInput, "email")
if len(result.Errors) > 0 {
    // Handle validation errors
}
// Use result.Value for the sanitized input
```

### CSRF Protection

#### Features

- **Token-Based Protection**: Secure random tokens for CSRF prevention
- **Multiple Token Sources**: Supports tokens in headers, form fields, and cookies
- **Token Expiration**: Configurable token TTL (default 24 hours)
- **Referer Validation**: Optional validation of HTTP referer header
- **Cache-Based Storage**: Tokens stored in Redis cache for scalability

#### Implementation

The `security.CSRFProtection` (`internal/security/csrf.go`) provides:

- Token generation and validation
- Cookie and header management
- Middleware for automatic protection
- Skip mechanisms for specific endpoints (e.g., webhooks)

#### Usage

CSRF tokens are automatically generated for safe HTTP methods (GET, HEAD, OPTIONS) and validated for unsafe methods (POST, PUT, DELETE, PATCH).

Frontend applications can obtain tokens via:
- `GET /api/v1/csrf-token` endpoint
- `X-CSRF-Token` response header
- `csrf_token` cookie

### Security Headers

#### Implemented Headers

**Content Security Policy (CSP)**:
- **Development**: Report-only mode with permissive rules for debugging
- **Production**: Enforced strict policy blocking inline scripts and styles

**Frame Protection**:
- **X-Frame-Options**: Prevents clickjacking attacks
- **Development**: `SAMEORIGIN` (allows framing from same origin)
- **Production**: `DENY` (blocks all framing)

**XSS Protection**:
- **X-XSS-Protection**: `1; mode=block` (enables browser XSS filtering)
- **X-Content-Type-Options**: `nosniff` (prevents MIME type sniffing)

**HTTPS Security**:
- **HSTS**: HTTP Strict Transport Security with subdomain inclusion
- **Production Only**: 1-year max-age with preload directive

**Cross-Origin Policies**:
- **Cross-Origin-Embedder-Policy**: `require-corp` (production) / `unsafe-none` (development)
- **Cross-Origin-Opener-Policy**: `same-origin` (production) / `unsafe-none` (development)
- **Cross-Origin-Resource-Policy**: `same-origin` (production) / `cross-origin` (development)

**Permissions Policy**:
Restrictive permissions for sensitive APIs:
- Camera: denied
- Microphone: denied
- Geolocation: denied
- Payment: denied
- USB: denied

#### Configuration

Security headers (`internal/security/headers.go`) are automatically configured based on the `ENV` environment variable:

```bash
# Development
ENV=development

# Production
ENV=production
```

### Rate Limiting

#### Features

- **Redis-Based**: Distributed rate limiting using Redis counters
- **Per-IP and Per-Endpoint**: Granular rate limiting by client IP and API endpoint
- **Multiple Configurations**: Different limits for different endpoint types
- **Graceful Degradation**: Continues operation if Redis is unavailable

#### Rate Limits

- **Default API**: 60 requests/minute, 10 burst
- **Authentication**: 10 requests/minute, 3 burst (stricter for login/register)
- **Public API**: 120 requests/minute, 20 burst (more generous for status endpoints)

#### Headers

Rate limit information is provided via response headers:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### Authentication Security

#### Session Management

- **HTTP-Only Cookies**: Prevents JavaScript access to session tokens
- **Secure Cookies**: HTTPS-only in production
- **SameSite Strict**: Prevents CSRF attacks via cookie transmission
- **Configurable Expiration**: Default 7-day session lifetime

#### Password Security

- **Minimum Length**: 8 characters required
- **Maximum Length**: 128 characters to prevent DoS
- **Bcrypt Hashing**: Industry-standard password hashing
- **Rate Limited**: Login attempts are rate limited per IP

#### Input Validation

All authentication inputs are sanitized:
- Email addresses are validated and normalized
- Names are HTML-escaped
- Passwords are length-validated

### Security Testing

#### Automated Tests

The security implementation includes comprehensive tests:

```bash
# Run security tests
go test ./internal/security
```

Tests cover:
- Input sanitization edge cases
- Email validation
- URL validation
- JSON validation and script injection prevention
- Header sanitization
- CSRF token generation and validation

#### Manual Testing

1. **XSS Prevention**: Attempt to inject scripts in form fields
2. **CSRF Protection**: Make requests without valid tokens
3. **Rate Limiting**: Exceed rate limits to verify blocking
4. **Input Validation**: Submit malformed data to endpoints
5. **Header Injection**: Attempt HTTP header injection attacks

### Security Monitoring

#### Logging

Security events are logged at appropriate levels:
- **Validation failures**: INFO level
- **Rate limit violations**: WARN level
- **CSRF violations**: WARN level
- **Authentication failures**: WARN level

#### Metrics

Monitor these security-related metrics:
- Rate limit hit rates
- CSRF token validation failures
- Input validation failures
- Authentication failure rates

#### Alerts

Set up alerts for:
- High rate limit violation rates
- Repeated CSRF failures from same IP
- Authentication brute force attempts
- CSP violation reports (if configured)

### Compliance

This implementation helps meet security requirements for:

- **OWASP Top 10 2021**
  - A01: Broken Access Control → Authentication + authorization
  - A02: Cryptographic Failures → Secure sessions + HTTPS
  - A03: Injection → Input sanitization + validation
  - A07: Identification and Authentication Failures → Secure auth flow
  - A10: Server-Side Request Forgery → URL validation

- **Common Security Standards**
  - Input validation and sanitization
  - Output encoding
  - CSRF protection
  - XSS prevention
  - Secure headers implementation

### Security Environment Configuration

#### Required Environment Variables

```bash
# Security
ENV=production                    # production/development
SESSION_SECRET=your-secret-key    # Session encryption key
ALLOWED_ORIGINS=https://app.com   # CORS allowed origins

# Optional Security Settings
CSRF_SKIP_REFERER=false          # Skip referer validation
CSP_REPORT_URI=/csp-report       # CSP violation reporting
```

#### Recommendations

**Production**:
- Use strong, random `SESSION_SECRET`
- Set `ENV=production`
- Use HTTPS exclusively
- Configure proper `ALLOWED_ORIGINS`
- Enable Redis caching for rate limiting
- Monitor CSP violations

**Development**:
- Use `ENV=development` for permissive headers
- Use HTTP for local development
- Set localhost origins in `ALLOWED_ORIGINS`

---

## Frontend Architecture

### React Architecture

The frontend is built with modern React patterns using React Router v7:

#### Project Structure:
```
frontend/app/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── admin-layout.tsx # Admin dashboard layout
│   ├── status-page.tsx  # Public status page
│   └── monitoring-charts.tsx # Data visualization
├── routes/              # Page components (React Router v7)
│   ├── admin/           # Admin pages
│   ├── dashboard.tsx    # Main dashboard
│   └── login.tsx        # Authentication
├── hooks/               # Custom React hooks
│   ├── useSSE.ts       # Server-Sent Events hook
│   └── useAuth.ts      # Authentication hook
├── lib/                 # Utilities and hooks
│   ├── api.ts          # API client
│   ├── auth.tsx        # Authentication context
│   └── utils.ts        # Utility functions
└── root.tsx            # App root component
```

#### React Router v7 Patterns

**Data Loading with clientLoader:**
```typescript
// Use clientLoader instead of useEffect for initial data loading
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
    await requireAuth('/login')
    
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '24'
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/monitoring-logs?hours=${timeRange}`)
        return response.ok ? response.json() : { logs: [] }
    } catch (error) {
        return { logs: [] }
    }
}

export default function MonitoringRoute({ loaderData }: Route.ComponentProps) {
    // Use data from loader instead of useEffect
    const [logs, setLogs] = useState(loaderData.logs)
    // ... rest of component
}
```

**URL-based Filtering:**
```typescript
// Use URL search params for filters (bookmarkable, shareable)
export default function AdminMonitoring({ loaderData }: Route.ComponentProps) {
    const [searchParams, setSearchParams] = useSearchParams()
    
    // Get filter values from URL
    const searchTerm = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || 'all'
    const endpointFilter = searchParams.get('endpoint') || 'all'
    const timeRange = searchParams.get('timeRange') || '24'
    
    // Helper to update URL params
    const updateFilter = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams)
        if (value === '' || value === 'all' || (key === 'timeRange' && value === '24')) {
            newParams.delete(key)
        } else {
            newParams.set(key, value)
        }
        setSearchParams(newParams, { replace: true })
    }
    
    // Use in form controls
    return (
        <div>
            <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => updateFilter('search', e.target.value)}
            />
            <Select
                value={statusFilter}
                onValueChange={(value) => updateFilter('status', value)}
            >
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success Only</SelectItem>
                <SelectItem value="failed">Failed Only</SelectItem>
            </Select>
        </div>
    )
}
```

**Benefits of URL-based Filtering:**
- ✅ Bookmarkable filtered views
- ✅ Shareable links with specific filters
- ✅ Browser back/forward navigation works
- ✅ SEO-friendly URLs
- ✅ Maintains state across page refreshes

### Key Components

#### Admin Dashboard (`routes/admin/`)
- **Endpoints Management**: CRUD interface with real-time updates via SSE
- **Live Endpoint Count**: Automatically updates when endpoints are added/removed
- **Incident Management**: View and manage incidents with real-time status updates
- **Monitoring Dashboard**: Live monitoring data without page refresh
- **Performance Analytics**: Charts with real-time data streaming

**Real-time Admin Interface** (`routes/admin/endpoints.tsx`):
```typescript
export default function AdminEndpoints() {
    const [endpoints, setEndpoints] = useState(initialEndpoints)
    const [total, setTotal] = useState(initialTotal)
    
    // Real-time updates via Server-Sent Events
    useEffect(() => {
        const eventSource = new EventSource(`${API_BASE_URL}/api/v1/events`, {
            withCredentials: true,
        })
        
        eventSource.addEventListener('endpoint_created', (event) => {
            const newEndpoint = JSON.parse(event.data)
            setEndpoints(prev => [...prev, newEndpoint])
            setTotal(prev => prev + 1)
        })
        
        eventSource.addEventListener('endpoint_updated', (event) => {
            const updatedEndpoint = JSON.parse(event.data)
            setEndpoints(prev => 
                prev.map(ep => ep.id === updatedEndpoint.id ? updatedEndpoint : ep)
            )
        })
        
        eventSource.addEventListener('endpoint_deleted', (event) => {
            const deletedEndpoint = JSON.parse(event.data)
            setEndpoints(prev => prev.filter(ep => ep.id !== deletedEndpoint.id))
            setTotal(prev => prev - 1)
        })
        
        return () => eventSource.close()
    }, [])
}
```

#### Status Page (`components/status-page.tsx`)
- **Public Interface**: No authentication required
- **Real-time Updates**: Live status information via SSE connection
- **Incident Timeline**: Public incident history with live updates
- **Performance Metrics**: Response time charts with streaming data

**Real-time Status Updates**:
```typescript
useEffect(() => {
    const eventSource = new EventSource('/api/v1/events')
    
    eventSource.addEventListener('status_update', (event) => {
        const data = JSON.parse(event.data)
        // Update status displays in real-time
        fetchStatus() // Refresh current status
    })
    
    return () => eventSource.close()
}, [])
```

#### Data Visualization (`components/monitoring-charts.tsx`)
- **Response Time Charts**: Historical performance data with live updates
- **Uptime Statistics**: Availability metrics updated in real-time
- **Error Rate Trends**: Error analysis with streaming data
- **Interactive Dashboards**: Drill-down capabilities with live data

### State Management

Uses React Context for global state:

```typescript
// auth.tsx
interface AuthContext {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  
  // ... implementation
  
  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### API Integration

Centralized API client with error handling:

```typescript
// lib/api.ts
class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    
    return response.json();
  }
  
  // Specific methods
  async getEndpoints(): Promise<Endpoint[]> {
    return this.request<Endpoint[]>('/api/admin/endpoints');
  }
  
  async createEndpoint(data: CreateEndpointData): Promise<Endpoint> {
    return this.request<Endpoint>('/api/admin/endpoints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
```

---

## Testing Strategy

### Testing Philosophy

Comprehensive testing strategy focusing on:
1. **Unit Tests**: Critical business logic
2. **Integration Tests**: Component interactions
3. **End-to-End Tests**: User workflows
4. **Performance Tests**: Load and stress testing

### Backend Testing

#### Unit Tests
Located in `*_test.go` files alongside source code.

**Model Tests** (`internal/data/models_test.go`):
```go
func TestUser_HashPassword(t *testing.T) {
    user := &data.User{
        Username: "testuser",
        Password: "plaintext",
    }
    
    err := user.HashPassword()
    assert.NoError(t, err)
    assert.NotEqual(t, "plaintext", user.Password)
    assert.True(t, user.CheckPassword("plaintext"))
}
```

**HTTP Client Tests** (`internal/monitoring/http_client_test.go`):
```go
func TestHTTPClient_ExecuteRequest_Success(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status": "ok"}`))
    }))
    defer server.Close()
    
    client := NewHTTPClient(HTTPClientConfig{})
    endpoint := &data.Endpoint{
        URL:    server.URL,
        Method: "GET",
    }
    
    response, err := client.ExecuteRequest(endpoint)
    assert.NoError(t, err)
    assert.Equal(t, http.StatusOK, response.StatusCode)
}
```

#### Test Utilities
Shared testing utilities in `internal/testutil/`:

```go
// Mock database for testing
type MockDB struct {
    endpoints      []data.Endpoint
    monitoringLogs []data.MonitoringLog
    shouldFail     bool
}

func NewMockDB() *MockDB {
    return &MockDB{
        endpoints:      make([]data.Endpoint, 0),
        monitoringLogs: make([]data.MonitoringLog, 0),
    }
}
```

### Running Tests

```bash
# Run all tests
just test

# Run with verbose output
just test-verbose

# Run with coverage
just test-cover

# Generate HTML coverage report
just test-cover-html

# Run specific test suites
just test-models      # Database model tests
just test-monitoring  # Monitoring engine tests
just test-middleware  # API middleware tests
```

### Frontend Testing

Frontend tests use React Testing Library:

```typescript
// __tests__/StatusPage.test.tsx
import { render, screen } from '@testing-library/react';
import { StatusPage } from '../components/StatusPage';

describe('StatusPage', () => {
  it('renders system status', () => {
    render(<StatusPage />);
    expect(screen.getByText('System Status')).toBeInTheDocument();
  });
});
```

---

## Deployment & DevOps

### Deployment Options

Watchtower supports multiple deployment methods:

1. **Railway Platform** (Recommended) - One-click deployment with managed services
2. **Docker** - Containerized deployment for any environment
3. **Docker Compose** - Local development and simple production setups
4. **Manual** - Direct binary deployment

### Railway Platform Deployment

#### One-Click Deployment

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/watchtower)

Click the button above to deploy Watchtower to Railway in under 5 minutes.

#### What You Get

When you deploy using the Railway button:

- ✅ **Watchtower Application** - Complete monitoring application
- ✅ **PostgreSQL Database** - Managed database for storing endpoints and monitoring data  
- ✅ **Redis Cache** - Managed Redis for improved performance
- ✅ **HTTPS & SSL** - Automatic SSL certificates and HTTPS
- ✅ **Custom Domain Support** - Optional custom domain configuration
- ✅ **Environment Variables** - Pre-configured with secure defaults

#### Step-by-Step Railway Deployment

1. **Click Deploy Button**: Click the "Deploy on Railway" button above
2. **Connect GitHub Account**: Login with GitHub and authorize Railway
3. **Configure Services**: Railway automatically creates Watchtower, PostgreSQL, and Redis services
4. **Wait for Deployment**: Railway builds and deploys (typically 3-5 minutes)
5. **Access Your Application**: Use the provided URL to access your application

#### Railway Environment Variables

Railway automatically configures these variables:

- `DATABASE_URL` - PostgreSQL connection (auto-generated)
- `REDIS_URL` - Redis connection (auto-generated)  
- `JWT_SECRET` - Authentication secret (auto-generated)
- `SESSION_SECRET` - Session secret (auto-generated)
- `PORT` - Application port (auto-configured)

#### Railway Management

**Viewing Logs**:
1. Go to Railway Dashboard → Your Project
2. Click on the "watchtower" service
3. Click "Logs" tab to view real-time application logs

**Monitoring Performance**:
Railway provides built-in monitoring:
- **CPU & Memory Usage** - Resource utilization graphs
- **Response Times** - Application performance metrics
- **Error Rates** - Application health monitoring
- **Database Metrics** - PostgreSQL performance data

**Custom Domain Configuration**:
1. Go to Railway Dashboard → Your Project → Settings
2. Click "Domains" tab
3. Add your custom domain (e.g., `monitoring.yourdomain.com`)
4. Update your DNS with the CNAME record Railway provides
5. SSL certificate is automatically provisioned

#### Railway Pricing

- **Hobby Plan**: $5/month - Perfect for personal use or small teams
- **Pro Plan**: $20/month - Additional features and higher limits
- **Usage-based**: Pay only for resources you actually use

### Docker Deployment

#### Quick Start

Deploy with a single Docker command:

```bash
docker run -d \
  --name watchtower \
  -p 8080:8080 \
  -e DATABASE_URL=your_postgres_url \
  -e JWT_SECRET=your_jwt_secret \
  -e SESSION_SECRET=your_session_secret \
  i4o-oss/watchtower:latest
```

#### Docker Configuration

Multi-stage Dockerfile for optimized builds:

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o bin/watchtower ./cmd/api

# Runtime stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/bin/watchtower .
COPY --from=builder /app/frontend/build ./frontend/build
EXPOSE 8080
CMD ["./watchtower"]
```

#### Environment Variables

**Required**:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (32+ characters)  
- `SESSION_SECRET` - Secret key for sessions (32+ characters)

**Optional**:
- `REDIS_URL` - Redis connection for caching
- `PORT` - Server port (default: 8080)
- `LOG_LEVEL` - Logging level (info, debug, warn, error)
- `ENV` - Environment mode (production, development)

### Docker Compose

Development and production configurations:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    environment:
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
      - ENV=production
    
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: watchtower
      POSTGRES_USER: watchtower
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
    
volumes:
  postgres_data:
```

### Health Checks

All deployment methods support health check endpoints:

- `/health` - Basic health check
- `/health/ready` - Database connectivity check
- `/health/live` - Application liveness check

### CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
name: CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Go
      uses: actions/setup-go@v3
      with:
        go-version: 1.21
    
    - name: Run tests
      run: |
        go test -v ./...
        go test -race ./...
    
    - name: Build
      run: go build -v ./...
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Railway
      uses: railwayapp/railway-deploy@v1
      with:
        railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

### Railway Configuration

Railway configuration (`railway.toml`):

```toml
[build]
builder = "DOCKERFILE"
dockerfile = "docker/Dockerfile"

[deploy]
healthcheck_path = "/health"
healthcheck_timeout = 30
restart_policy = "on-failure"

[[deploy.envs]]
name = "production"
```

### Deployment Troubleshooting

#### Common Issues

**Application Not Starting**:
- Check logs for startup errors
- Verify environment variables are set correctly
- Ensure database connection is successful
- Check port configuration

**Database Connection Errors**:
- Verify PostgreSQL service is running
- Check DATABASE_URL environment variable format
- Review database logs for connection issues
- Ensure database migrations have run

**Performance Issues**:
- Monitor resource usage (CPU, memory)
- Check Redis cache hit rates
- Review slow query logs in PostgreSQL
- Verify adequate resource allocation

#### Debugging Commands

```bash
# Railway CLI debugging
npm install -g @railway/cli
railway login
railway link [your-project-id]

# Connect to database
railway connect postgres

# View logs
railway logs

# Create manual backup
railway run pg_dump $DATABASE_URL > backup.sql
```

### Security Considerations

All deployment methods include enterprise-grade security:

- ✅ **Encrypted connections** (TLS/SSL)
- ✅ **Database encryption** at rest
- ✅ **Network isolation** between services
- ✅ **Automatic security updates**
- ✅ **Environment variable security**

### Scaling

**Railway Automatic Scaling**:
- Auto-scaling based on traffic
- Resource allocation (CPU, memory)
- Database scaling as data grows
- Backup management (daily automated backups)

**Manual Scaling**:
- Adjust resource limits in Railway dashboard
- Configure horizontal scaling for high traffic
- Monitor performance metrics
- Optimize database queries and indexes

### Monitoring

#### Application Monitoring

Monitor these key metrics:
- Response times and throughput
- Error rates and status codes
- Database connection pool status
- Cache hit rates (if using Redis)
- Memory and CPU usage

#### Database Monitoring

Monitor PostgreSQL performance:
- Connection counts and pool usage
- Query performance and slow queries
- Database size and growth
- Index usage and optimization opportunities

#### Security Monitoring

Monitor security-related metrics:
- Authentication failure rates
- Rate limit violations
- CSRF token validation failures
- Security header compliance

---

## Development Workflows

### Feature Development Workflow

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/endpoint-groups
   ```

2. **Backend Development**:
   ```bash
   # Make changes to Go code
   # Add tests for new functionality
   just test
   
   # Test monitoring engine integration if applicable
   just test-monitoring
   
   # Update database schema if needed
   just db-migrate-create add_endpoint_groups
   # Edit migration file
   just db-migrate-up
   
   # Test with running monitoring engine
   just dev # Runs API server with integrated monitoring
   ```

3. **Frontend Development**:
   ```bash
   cd frontend
   # Make changes to React code
   # Test in browser
   npm run dev
   ```

4. **Integration Testing**:
   ```bash
   # Start full stack with integrated monitoring
   just dev
   
   # Test monitoring integration:
   # 1. Create endpoint via admin API
   # 2. Verify it appears in admin UI immediately (SSE)
   # 3. Check monitoring starts automatically (logs)
   # 4. Verify status updates appear in real-time
   
   # Test API endpoints
   curl -X POST localhost:8080/api/v1/admin/endpoints \
     -H "Content-Type: application/json" \
     -d '{"name":"test","url":"https://example.com","enabled":true}'
   
   # Verify UI updates in real-time
   # Open admin dashboard and watch for live updates
   ```

5. **Code Review**:
   ```bash
   # Format code
   just fmt
   
   # Run linters
   just lint
   
   # Run all tests
   just test
   
   # Create PR
   git push origin feature/endpoint-groups
   ```

### Debugging Workflow

#### Backend Debugging

1. **Enable Debug Logging**:
   ```go
   // In main.go
   app.Logger.SetLevel(log.DebugLevel)
   ```

2. **Database Query Debugging**:
   ```go
   // Enable SQL logging
   db.Logger = logger.Default.LogMode(logger.Info)
   ```

3. **Performance Profiling**:
   ```go
   import _ "net/http/pprof"
   
   go func() {
       log.Println(http.ListenAndServe("localhost:6060", nil))
   }()
   ```

#### Frontend Debugging

1. **React DevTools**: Install browser extension
2. **Console Logging**: Strategic console.log statements
3. **Network Tab**: Monitor API calls
4. **Performance Tab**: Identify rendering issues

### Database Management

#### Migration Workflow

1. **Create Migration**:
   ```bash
   just db-migrate-create feature_name
   ```

2. **Write Migration**:
   ```sql
   -- +goose Up
   ALTER TABLE endpoints ADD COLUMN group_id UUID;
   CREATE INDEX idx_endpoints_group ON endpoints(group_id);
   
   -- +goose Down
   DROP INDEX idx_endpoints_group;
   ALTER TABLE endpoints DROP COLUMN group_id;
   ```

3. **Test Migration**:
   ```bash
   just db-migrate-up
   just db-migrate-down
   just db-migrate-up
   ```

#### Data Seeding

For development and testing:

```sql
-- Insert test data
INSERT INTO endpoints (name, url, method, interval_seconds) VALUES
('Google', 'https://google.com', 'GET', 300),
('GitHub API', 'https://api.github.com', 'GET', 600),
('Local Service', 'http://localhost:3000/health', 'GET', 60);
```

---

## Code Patterns & Conventions

### Go Conventions

#### Package Structure
```go
// Package-level documentation
// Package monitoring provides monitoring engine functionality.
package monitoring

// Public interface
type Engine interface {
    Start() error
    Stop() error
    Status() EngineStatus
}

// Private implementation
type engine struct {
    config     Config
    scheduler  *Scheduler
    workerPool *WorkerPool
    logger     *log.Logger
}

// Constructor pattern
func NewEngine(config Config) Engine {
    return &engine{
        config:     config,
        scheduler:  NewScheduler(config.SchedulerConfig),
        workerPool: NewWorkerPool(config.WorkerPoolConfig),
        logger:     log.New(os.Stdout, "monitoring: ", log.LstdFlags),
    }
}
```

#### Error Handling
```go
// Custom error types
type MonitoringError struct {
    Op       string
    Endpoint string
    Err      error
}

func (e *MonitoringError) Error() string {
    return fmt.Sprintf("%s %s: %v", e.Op, e.Endpoint, e.Err)
}

// Error wrapping
func (e *engine) monitorEndpoint(endpoint *data.Endpoint) error {
    response, err := e.httpClient.ExecuteRequest(endpoint)
    if err != nil {
        return &MonitoringError{
            Op:       "execute_request",
            Endpoint: endpoint.URL,
            Err:      err,
        }
    }
    
    if err := e.saveMonitoringLog(endpoint, response); err != nil {
        return &MonitoringError{
            Op:       "save_log",
            Endpoint: endpoint.URL,
            Err:      err,
        }
    }
    
    return nil
}
```

#### Concurrency Patterns
```go
// Worker pool pattern
type WorkerPool struct {
    workers     int
    jobChan     chan Job
    resultChan  chan Result
    quit        chan struct{}
    wg          sync.WaitGroup
}

func (wp *WorkerPool) Start() {
    for i := 0; i < wp.workers; i++ {
        wp.wg.Add(1)
        go wp.worker()
    }
}

func (wp *WorkerPool) worker() {
    defer wp.wg.Done()
    
    for {
        select {
        case job := <-wp.jobChan:
            result := job.Execute()
            wp.resultChan <- result
        case <-wp.quit:
            return
        }
    }
}
```

### React Conventions

#### Component Structure
```typescript
// Component props interface
interface EndpointListProps {
  endpoints: Endpoint[];
  onEndpointSelect: (endpoint: Endpoint) => void;
  loading?: boolean;
}

// Component with proper typing
export const EndpointList: React.FC<EndpointListProps> = ({
  endpoints,
  onEndpointSelect,
  loading = false,
}) => {
  // Hooks at the top
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Event handlers
  const handleSelect = useCallback((endpoint: Endpoint) => {
    setSelectedId(endpoint.id);
    onEndpointSelect(endpoint);
  }, [onEndpointSelect]);
  
  // Early returns
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Main render
  return (
    <div className="endpoint-list">
      {endpoints.map((endpoint) => (
        <EndpointCard
          key={endpoint.id}
          endpoint={endpoint}
          selected={selectedId === endpoint.id}
          onClick={() => handleSelect(endpoint)}
        />
      ))}
    </div>
  );
};
```

#### Custom Hooks
```typescript
// Custom hook for API data
export const useEndpoints = () => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchEndpoints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getEndpoints();
      setEndpoints(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);
  
  return {
    endpoints,
    loading,
    error,
    refetch: fetchEndpoints,
  };
};
```

#### Avoiding Infinite Re-renders

**Problem:** useEffect dependencies that change on every render cause infinite loops.

**Solution:** Use useMemo for objects/arrays that are recalculated:

```typescript
// ❌ Bad - Creates new object on every render
const endpointMap = endpoints.reduce((acc, endpoint) => {
    acc[endpoint.id] = endpoint
    return acc
}, {})

useEffect(() => {
    // This runs on every render because endpointMap is always "new"
    filterLogs(endpointMap)
}, [logs, endpointMap]) // endpointMap changes every render!

// ✅ Good - Memoize the calculated value
const endpointMap = useMemo(
    () => endpoints.reduce((acc, endpoint) => {
        acc[endpoint.id] = endpoint
        return acc
    }, {}),
    [endpoints] // Only recalculate when endpoints actually change
)

useEffect(() => {
    // This only runs when logs or endpointMap actually change
    filterLogs(endpointMap)
}, [logs, endpointMap])
```

**Common Patterns:**
```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
    return heavyCalculation(data)
}, [data])

// Memoize filtered/transformed data
const filteredItems = useMemo(() => {
    return items.filter(item => item.status === 'active')
}, [items])

// Memoize callbacks when passing to child components
const handleClick = useCallback((id: string) => {
    onItemClick(id)
}, [onItemClick])
```

### Database Patterns

#### Model Definition
```go
type Endpoint struct {
    ID              uuid.UUID    `gorm:"primaryKey" json:"id"`
    Name            string       `gorm:"not null" json:"name"`
    URL             string       `gorm:"not null" json:"url"`
    Method          string       `gorm:"not null;default:GET" json:"method"`
    Headers         HTTPHeaders  `gorm:"type:jsonb" json:"headers"`
    Body            string       `json:"body"`
    IntervalSeconds int          `gorm:"not null;default:300" json:"interval_seconds"`
    TimeoutSeconds  int          `gorm:"not null;default:30" json:"timeout_seconds"`
    Enabled         bool         `gorm:"not null;default:true" json:"enabled"`
    CreatedAt       time.Time    `json:"created_at"`
    UpdatedAt       time.Time    `json:"updated_at"`
    
    // Relationships
    MonitoringLogs  []MonitoringLog `gorm:"foreignKey:EndpointID" json:"-"`
}

// GORM hooks
func (e *Endpoint) BeforeCreate(tx *gorm.DB) error {
    if e.ID == uuid.Nil {
        e.ID = uuid.New()
    }
    return nil
}

// Custom methods
func (e *Endpoint) IsHealthy() bool {
    // Business logic
    return e.Enabled && e.IntervalSeconds > 0
}
```

#### Repository Pattern
```go
type EndpointRepository interface {
    GetByID(id uuid.UUID) (*Endpoint, error)
    GetEnabled() ([]Endpoint, error)
    Create(endpoint *Endpoint) error
    Update(endpoint *Endpoint) error
    Delete(id uuid.UUID) error
}

type endpointRepository struct {
    db *gorm.DB
}

func NewEndpointRepository(db *gorm.DB) EndpointRepository {
    return &endpointRepository{db: db}
}

func (r *endpointRepository) GetEnabled() ([]Endpoint, error) {
    var endpoints []Endpoint
    err := r.db.Where("enabled = ?", true).Find(&endpoints).Error
    return endpoints, err
}
```

---

## Troubleshooting

### Common Issues

#### Monitoring Engine Issues

**Problem**: New endpoints not being monitored
**Solution**:
```bash
# Check monitoring engine is running
curl localhost:8080/api/v1/admin/health

# Check logs for monitoring engine
tail -f /var/log/watchtower.log | grep "monitoring"

# Verify endpoint was added to engine
# Look for: "Added endpoint to monitoring engine" in logs

# Restart if needed - monitoring engine starts with API server
systemctl restart watchtower
```

**Problem**: SSE connections not working
**Solution**:
```bash
# Test SSE endpoint directly
curl -N -H "Accept: text/event-stream" localhost:8080/api/v1/events

# Check browser console for SSE errors
# Verify no proxy is blocking event-stream connections

# Check CORS settings for cross-origin requests
```

**Problem**: Admin interface not updating in real-time
**Solution**:
```javascript
// Check browser console for SSE connection errors
// Verify EventSource connection:
const eventSource = new EventSource('/api/v1/events')
eventSource.onopen = () => console.log('SSE connected')
eventSource.onerror = (e) => console.error('SSE error', e)
```

#### Database Connection Issues

**Problem**: "connection refused" errors
**Solution**:
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
psql "postgresql://user:pass@localhost:5432/dbname"

# Reset database
docker-compose down -v
docker-compose up -d postgres
just db-migrate-up
```

#### Memory Issues

**Problem**: High memory usage in monitoring
**Solution**:
```go
// Limit response body size
config := HTTPClientConfig{
    MaxResponseBodyKB: 64, // Limit to 64KB
}

// Use object pools for frequent allocations
var responsePool = sync.Pool{
    New: func() interface{} {
        return &MonitoringResponse{}
    },
}
```

#### Performance Issues

**Problem**: Slow API responses
**Solution**:
```go
// Add database indexes
CREATE INDEX idx_monitoring_logs_timestamp ON monitoring_logs(timestamp);
CREATE INDEX idx_monitoring_logs_endpoint_id ON monitoring_logs(endpoint_id);

// Use database query optimization
func (db *DB) GetRecentLogs(hours int) ([]MonitoringLog, error) {
    var logs []MonitoringLog
    
    // Use prepared statement
    stmt := db.conn.Where("timestamp > ?", time.Now().Add(-time.Duration(hours)*time.Hour)).
        Order("timestamp DESC").
        Limit(1000)
    
    return logs, stmt.Find(&logs).Error
}
```

### Debugging Commands

#### Database Debugging
```bash
# Check database connectivity
just db-migrate-status

# View database logs
docker-compose logs postgres

# Connect to database
psql -h localhost -U watchtower -d watchtower

# Check table sizes
SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats;
```

#### Application Debugging
```bash
# View application logs
just server-dev 2>&1 | grep ERROR

# Check goroutine count
curl http://localhost:6060/debug/pprof/goroutine?debug=1

# Memory profiling
go tool pprof http://localhost:6060/debug/pprof/heap
```

#### Performance Monitoring
```bash
# Check system resources
htop

# Monitor network connections
netstat -an | grep :8080

# Check disk usage
df -h
```

---

## Learning Path

### For Backend Engineers

#### Week 1: Foundation
- [ ] **Setup Development Environment**
  - Clone repository and set up dependencies
  - Run database migrations
  - Start development servers
  - Make a simple change and see it work

- [ ] **Understand Core Models**
  - Study `internal/data/models.go`
  - Understand database relationships
  - Run some database queries manually

- [ ] **Explore API Layer**
  - Study `cmd/api/routes.go` and `handlers.go`
  - Test API endpoints with curl or Postman
  - Understand request/response flow

#### Week 2: Monitoring Engine
- [ ] **Study Monitoring Architecture**
  - Read `internal/monitoring/engine.go`
  - Understand scheduler and worker pool
  - Trace through a monitoring cycle

- [ ] **HTTP Client Deep Dive**
  - Study `internal/monitoring/http_client.go`
  - Understand retry logic and error handling
  - Add logging to see requests in action

- [ ] **Database Operations**
  - Study `internal/data/database.go`
  - Understand caching layer
  - Practice writing queries

#### Week 3: Advanced Features
- [ ] **Incident Management**
  - Study incident detection logic
  - Understand incident lifecycle
  - Practice creating and resolving incidents

- [ ] **Performance Optimization**
  - Study caching implementation
  - Understand query optimization
  - Practice performance tuning

- [ ] **Security Features**
  - Study authentication middleware
  - Understand CSRF protection
  - Practice security testing

### For Frontend Engineers

#### Week 1: Foundation
- [ ] **Setup Development Environment**
  - Install Node.js/Bun dependencies
  - Start development server
  - Understand build process

- [ ] **React Architecture**
  - Study component structure
  - Understand routing setup
  - Practice making UI changes

- [ ] **API Integration**
  - Study `lib/api.ts`
  - Understand error handling
  - Practice API calls

#### Week 2: Components
- [ ] **Admin Dashboard**
  - Study admin layout and components
  - Understand state management
  - Practice form handling

- [ ] **Status Page**
  - Study public status page
  - Understand real-time updates
  - Practice data visualization

- [ ] **Charts and Visualization**
  - Study monitoring charts
  - Understand data transformation
  - Practice with different chart types

#### Week 3: Advanced Features
- [ ] **Authentication**
  - Study auth context and hooks
  - Understand session management
  - Practice protected routes

- [ ] **Performance**
  - Study lazy loading implementation
  - Understand performance optimization
  - Practice with React DevTools

- [ ] **Testing**
  - Study test structure
  - Understand testing patterns
  - Practice writing tests

### For DevOps Engineers

#### Week 1: Infrastructure
- [ ] **Docker Setup**
  - Understand multi-stage builds
  - Practice with Docker Compose
  - Study production configurations

- [ ] **Database Management**
  - Study migration system
  - Practice backup and restore
  - Understand performance tuning

- [ ] **Monitoring Setup**
  - Study application metrics
  - Practice with observability tools
  - Understand logging strategy

#### Week 2: Deployment
- [ ] **CI/CD Pipeline**
  - Study GitHub Actions workflow
  - Practice with different environments
  - Understand deployment strategies

- [ ] **Cloud Deployment**
  - Study Railway configuration
  - Practice with environment variables
  - Understand scaling strategies

- [ ] **Security**
  - Study security headers
  - Practice with SSL/TLS
  - Understand vulnerability scanning

### First Tasks for New Engineers

#### Easy Tasks (Week 1)
1. **Add a new field to the Endpoint model** (e.g., `description` field)
2. **Create a new API endpoint** for health checking
3. **Add a new UI component** for displaying uptime percentage
4. **Write unit tests** for a simple utility function
5. **Update documentation** for a specific feature

#### Medium Tasks (Week 2-3)
1. **Implement endpoint grouping** feature
2. **Add email notifications** for incidents
3. **Create a new chart type** for the dashboard
4. **Implement API rate limiting** enhancement
5. **Add database query optimization** for a specific endpoint

#### Complex Tasks (Week 4+)
1. **Implement multi-region monitoring**
2. **Add advanced alerting rules**
3. **Create a plugin system** for custom monitors
4. **Implement real-time collaboration** features
5. **Add comprehensive audit logging**

---

## API Reference

### Overview

The Watchtower API provides endpoints for managing endpoint monitoring, incident tracking, and real-time status updates. The API is divided into public endpoints (no authentication required) and admin endpoints (authentication required).

### Base URL

```
http://localhost:8080/api/v1
```

### Authentication

Admin endpoints require session-based authentication. Login via `/api/v1/auth/login` to obtain a session cookie.

#### Authentication Headers
```http
Cookie: session_token=<token>
X-CSRF-Token: <csrf_token>  # Required for state-changing operations
```

### Public API Endpoints

#### Get System Status
```http
GET /api/v1/status
```

Returns current status of all monitored endpoints.

**Response:**
```json
{
  "endpoints": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "API Server",
      "status": "operational",
      "last_check": "2024-01-15T10:30:00Z",
      "response_time_ms": 245,
      "uptime_percentage": 99.9
    }
  ],
  "overall_status": "operational",
  "incident_count": 0
}
```

#### Get Endpoint Uptime
```http
GET /api/v1/uptime/{endpoint_id}?days=90
```

Returns historical uptime data for a specific endpoint.

**Parameters:**
- `endpoint_id` (path): UUID of the endpoint
- `days` (query): Number of days of history (default: 90, max: 365)

**Response:**
```json
{
  "endpoint_id": "550e8400-e29b-41d4-a716-446655440000",
  "endpoint_name": "API Server",
  "uptime_percentage": 99.9,
  "daily_stats": [
    {
      "date": "2024-01-15",
      "uptime_percentage": 100.0,
      "total_checks": 1440,
      "successful_checks": 1440,
      "avg_response_time_ms": 245
    }
  ]
}
```

#### Get Public Incidents
```http
GET /api/v1/incidents?status=published&limit=50&offset=0
```

Returns published incidents visible to the public.

**Parameters:**
- `status` (query): Filter by status (published, resolved)
- `limit` (query): Number of incidents to return (default: 50, max: 100)
- `offset` (query): Pagination offset

**Response:**
```json
{
  "incidents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "API Response Delays",
      "description": "Experiencing elevated response times",
      "severity": "minor",
      "status": "investigating",
      "start_time": "2024-01-15T09:00:00Z",
      "affected_endpoints": ["550e8400-e29b-41d4-a716-446655440000"],
      "timeline": [
        {
          "timestamp": "2024-01-15T09:00:00Z",
          "status": "investigating",
          "message": "We are investigating reports of slow API responses"
        }
      ]
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### Server-Sent Events
```http
GET /api/v1/events
```

Establishes SSE connection for real-time updates.

**Event Types:**
- `connected`: Initial connection confirmation
- `status_update`: Endpoint status changes
- `incident_created`: New incident created
- `incident_updated`: Incident status updated
- `endpoint_created`: New endpoint added
- `endpoint_updated`: Endpoint configuration changed
- `ping`: Keep-alive heartbeat (every 30 seconds)

**Example Events:**
```javascript
// Status update event
data: {
  "endpoint_id": "550e8400-e29b-41d4-a716-446655440000",
  "endpoint_name": "API Server",
  "status": "operational",
  "response_time_ms": 245,
  "timestamp": "2024-01-15T10:30:00Z"
}

// Incident update event  
data: {
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "API Response Delays",
  "status": "resolved",
  "severity": "minor"
}
```

### Admin API Endpoints

#### Authentication

##### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "username": "admin",
    "role": "admin"
  },
  "csrf_token": "csrf_token_here"
}
```

##### Logout
```http
POST /api/v1/auth/logout
X-CSRF-Token: <csrf_token>
```

##### Get Current User
```http
GET /api/v1/auth/me
```

#### Endpoint Management

##### List Endpoints
```http
GET /api/v1/admin/endpoints?limit=20&offset=0&search=api
```

**Parameters:**
- `limit` (query): Number of endpoints (default: 20, max: 100)
- `offset` (query): Pagination offset
- `search` (query): Search in endpoint names and URLs
- `enabled` (query): Filter by enabled status (true/false)

**Response:**
```json
{
  "endpoints": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "API Server",
      "description": "Main API endpoint",
      "url": "https://api.example.com/health",
      "method": "GET",
      "headers": {
        "Authorization": "Bearer token"
      },
      "body": null,
      "check_interval_seconds": 60,
      "timeout_seconds": 30,
      "expected_status_codes": [200, 201],
      "enabled": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

##### Get Endpoint
```http
GET /api/v1/admin/endpoints/{endpoint_id}
```

##### Create Endpoint
```http
POST /api/v1/admin/endpoints
Content-Type: application/json
X-CSRF-Token: <csrf_token>

{
  "name": "API Server",
  "description": "Main API endpoint",
  "url": "https://api.example.com/health",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer token"
  },
  "body": null,
  "check_interval_seconds": 60,
  "timeout_seconds": 30,
  "expected_status_codes": [200],
  "enabled": true
}
```

##### Update Endpoint
```http
PUT /api/v1/admin/endpoints/{endpoint_id}
Content-Type: application/json
X-CSRF-Token: <csrf_token>

{
  "name": "Updated API Server",
  "check_interval_seconds": 120
}
```

##### Delete Endpoint
```http
DELETE /api/v1/admin/endpoints/{endpoint_id}
X-CSRF-Token: <csrf_token>
```

#### Monitoring Logs

##### Get Monitoring Logs
```http
GET /api/v1/admin/monitoring-logs?endpoint_id={id}&limit=100&offset=0&start_date=2024-01-01&end_date=2024-01-15
```

**Parameters:**
- `endpoint_id` (query): Filter by endpoint UUID
- `limit` (query): Number of logs (default: 100, max: 1000)
- `offset` (query): Pagination offset
- `start_date` (query): Start date (YYYY-MM-DD)
- `end_date` (query): End date (YYYY-MM-DD)
- `success` (query): Filter by success status (true/false)

**Response:**
```json
{
  "logs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "endpoint_id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2024-01-15T10:30:00Z",
      "status_code": 200,
      "response_time_ms": 245,
      "success": true,
      "error_message": null,
      "response_body_sample": "{\"status\":\"ok\"}"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

#### Incident Management

##### List Incidents
```http
GET /api/v1/admin/incidents?status=open&severity=major&limit=50&offset=0
```

**Parameters:**
- `status` (query): Filter by status (open, investigating, identified, monitoring, resolved)
- `severity` (query): Filter by severity (minor, major, critical)
- `limit` (query): Number of incidents (default: 50, max: 100)
- `offset` (query): Pagination offset

##### Create Incident
```http
POST /api/v1/admin/incidents
Content-Type: application/json
X-CSRF-Token: <csrf_token>

{
  "title": "API Response Delays",
  "description": "Users experiencing slow API responses",
  "severity": "major",
  "status": "investigating",
  "affected_endpoints": ["550e8400-e29b-41d4-a716-446655440000"],
  "public": true
}
```

##### Update Incident
```http
PUT /api/v1/admin/incidents/{incident_id}
Content-Type: application/json
X-CSRF-Token: <csrf_token>

{
  "status": "resolved",
  "update_message": "Issue has been resolved. All systems operational."
}
```

#### Notification Channels

##### List Notification Channels
```http
GET /api/v1/admin/notification-channels
```

**Response:**
```json
{
  "channels": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "name": "Email Alerts",
      "type": "email",
      "enabled": true,
      "configuration": {
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "username": "alerts@example.com",
        "from_email": "alerts@example.com",
        "to_emails": ["admin@example.com"]
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

##### Create Notification Channel
```http
POST /api/v1/admin/notification-channels
Content-Type: application/json
X-CSRF-Token: <csrf_token>

{
  "name": "Slack Alerts",
  "type": "slack",
  "enabled": true,
  "configuration": {
    "webhook_url": "https://hooks.slack.com/services/...",
    "channel": "#alerts",
    "username": "Watchtower"
  }
}
```

##### Test Notification Channel
```http
POST /api/v1/admin/notification-channels/{channel_id}/test
Content-Type: application/json
X-CSRF-Token: <csrf_token>

{
  "message": "Test notification from Watchtower"
}
```

### Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Validation failed",
  "details": {
    "field": "url",
    "message": "Invalid URL format"
  },
  "code": "VALIDATION_ERROR"
}
```

#### HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Rate Limiting

Rate limits are applied per IP address:
- **Anonymous requests**: 60 requests per minute
- **Authenticated requests**: 300 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1642248000
```

### Pagination

List endpoints support pagination with `limit` and `offset` parameters:

```http
GET /api/v1/admin/endpoints?limit=20&offset=40
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 40,
  "has_next": true,
  "has_prev": true
}
```

---

## Deployment Guide

### Overview

This guide covers deploying Watchtower in various environments including local development, Docker containers, and cloud platforms like Railway.

### Prerequisites

- **Go**: 1.21 or later
- **Node.js**: 18 or later  
- **PostgreSQL**: 13 or later
- **Docker**: 20.10 or later (for containerized deployment)

### Environment Configuration

#### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgres://user:password@host:5432/dbname
# OR individual database variables:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=watchtower
DB_USER=watchtower
DB_PASSWORD=your_secure_password
DB_SSL_MODE=require

# Server Configuration
PORT=8080
ENVIRONMENT=production
JWT_SECRET=your-jwt-secret-key-at-least-32-chars
SESSION_SECRET=your-session-secret-key-at-least-32-chars
CSRF_SECRET=your-csrf-secret-key-at-least-32-chars

# Optional: Notification Providers
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=alerts@yourdomain.com
SMTP_PASSWORD=your_smtp_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

#### Security Configuration

```bash
# Generate secure secrets (Linux/macOS)
openssl rand -hex 32  # Use for JWT_SECRET
openssl rand -hex 32  # Use for SESSION_SECRET  
openssl rand -hex 32  # Use for CSRF_SECRET

# Windows PowerShell
[System.Web.Security.Membership]::GeneratePassword(64, 0)
```

### Local Development

#### 1. Database Setup

##### Using Docker
```bash
# Start PostgreSQL container
docker run -d \
  --name watchtower-postgres \
  -e POSTGRES_DB=watchtower \
  -e POSTGRES_USER=watchtower \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15
```

##### Using docker-compose
```bash
# Use the provided docker-compose.yml
docker-compose up postgres -d
```

#### 2. Backend Development

```bash
# Install dependencies
go mod tidy

# Set environment variables
export DATABASE_URL="postgres://watchtower:password@localhost:5432/watchtower?sslmode=disable"
export JWT_SECRET="your-jwt-secret-here"
export SESSION_SECRET="your-session-secret-here"
export CSRF_SECRET="your-csrf-secret-here"

# Run migrations and start server
cd cmd/api
go run main.go
```

The backend will be available at `http://localhost:8080`

#### 3. Frontend Development

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173` with proxy to backend.

### Production Deployment

#### Docker Deployment

##### 1. Using docker-compose (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/watchtower.git
cd watchtower

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Build and start services
docker-compose -f docker-compose.prod.yml up -d
```

##### 2. Using Docker directly

```bash
# Build the application image
docker build -t watchtower:latest .

# Run with PostgreSQL
docker run -d \
  --name watchtower-postgres \
  -e POSTGRES_DB=watchtower \
  -e POSTGRES_USER=watchtower \
  -e POSTGRES_PASSWORD=your_password \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15

# Run the application
docker run -d \
  --name watchtower-app \
  --link watchtower-postgres:postgres \
  -p 8080:8080 \
  -e DATABASE_URL="postgres://watchtower:your_password@postgres:5432/watchtower" \
  -e JWT_SECRET="your-jwt-secret" \
  -e SESSION_SECRET="your-session-secret" \
  -e CSRF_SECRET="your-csrf-secret" \
  -e ENVIRONMENT="production" \
  watchtower:latest
```

#### Railway Deployment

Railway provides the simplest cloud deployment option.

##### 1. One-Click Deployment

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/watchtower)

Click the button above to deploy Watchtower to Railway in under 5 minutes.

##### 2. Manual Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add PostgreSQL database
railway add postgresql

# Set environment variables
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway variables set SESSION_SECRET=$(openssl rand -hex 32)
railway variables set CSRF_SECRET=$(openssl rand -hex 32)
railway variables set ENVIRONMENT=production

# Deploy
railway up
```

##### 3. GitHub Integration

1. Fork the Watchtower repository
2. Connect your Railway account to GitHub
3. Create new Railway project from GitHub repo
4. Add PostgreSQL database service
5. Configure environment variables
6. Deploy automatically on push to main branch

#### Manual Server Deployment

##### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# Create application user
sudo useradd -m -s /bin/bash watchtower
sudo mkdir -p /opt/watchtower
sudo chown watchtower:watchtower /opt/watchtower
```

##### 2. Database Setup

```bash
# Configure PostgreSQL
sudo -u postgres createuser watchtower
sudo -u postgres createdb watchtower -O watchtower
sudo -u postgres psql -c "ALTER USER watchtower PASSWORD 'your_secure_password';"

# Configure PostgreSQL for production
sudo nano /etc/postgresql/13/main/postgresql.conf
# Set: shared_preload_libraries = 'pg_stat_statements'
# Set: max_connections = 100

sudo systemctl restart postgresql
```

##### 3. Application Deployment

```bash
# Build application
git clone https://github.com/yourusername/watchtower.git
cd watchtower

# Build backend
cd cmd/api
go build -o watchtower
sudo cp watchtower /opt/watchtower/

# Build frontend
cd ../../frontend
npm install
npm run build
sudo cp -r build/* /var/www/html/

# Create systemd service
sudo nano /etc/systemd/system/watchtower.service
```

**systemd service file:**
```ini
[Unit]
Description=Watchtower Status Monitor
After=network.target postgresql.service

[Service]
Type=simple
User=watchtower
WorkingDirectory=/opt/watchtower
ExecStart=/opt/watchtower/watchtower
Restart=always
RestartSec=5
Environment=DATABASE_URL=postgres://watchtower:your_password@localhost:5432/watchtower
Environment=JWT_SECRET=your-jwt-secret
Environment=SESSION_SECRET=your-session-secret
Environment=CSRF_SECRET=your-csrf-secret
Environment=ENVIRONMENT=production
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
```

```bash
# Start and enable service
sudo systemctl daemon-reload
sudo systemctl enable watchtower
sudo systemctl start watchtower
```

##### 4. Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/watchtower
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Frontend static files
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # SSE support
        proxy_buffering off;
        proxy_read_timeout 24h;
    }
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/watchtower /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Health Checks and Monitoring

#### Application Health Check

```bash
# Check application status
curl http://localhost:8080/api/v1/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "monitoring_engine": "running",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### System Monitoring

```bash
# Check service status
sudo systemctl status watchtower

# View logs
sudo journalctl -u watchtower -f

# Monitor resource usage
htop
```

#### Database Monitoring

```bash
# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='watchtower';"

# Monitor database performance
sudo -u postgres psql watchtower -c "SELECT * FROM pg_stat_user_tables WHERE relname IN ('endpoints', 'monitoring_logs');"
```

### Backup and Recovery

#### Database Backup

```bash
# Create backup script
sudo nano /opt/watchtower/backup.sh
```

**Backup script:**
```bash
#!/bin/bash
BACKUP_DIR="/opt/watchtower/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="watchtower_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

# Create database backup
pg_dump watchtower > $BACKUP_DIR/$FILENAME

# Compress backup
gzip $BACKUP_DIR/$FILENAME

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $FILENAME.gz"
```

```bash
# Make executable and set up cron
sudo chmod +x /opt/watchtower/backup.sh

# Add to crontab (daily backups at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /opt/watchtower/backup.sh
```

#### Recovery Process

```bash
# Stop application
sudo systemctl stop watchtower

# Restore database
gunzip /opt/watchtower/backups/watchtower_backup_YYYYMMDD_HHMMSS.sql.gz
sudo -u postgres psql watchtower < /opt/watchtower/backups/watchtower_backup_YYYYMMDD_HHMMSS.sql

# Start application
sudo systemctl start watchtower
```

### Troubleshooting

#### Common Issues

##### 1. Database Connection Errors
```bash
# Check database status
sudo systemctl status postgresql

# Check connection string
sudo -u postgres psql -c "\l"

# Test connection
pg_isready -h localhost -p 5432 -U watchtower
```

##### 2. Migration Errors
```bash
# Check migration status
cd cmd/api
go run main.go -check-migrations

# Reset database (CAUTION: Data loss)
sudo -u postgres dropdb watchtower
sudo -u postgres createdb watchtower -O watchtower
```

##### 3. SSE Connection Issues
```bash
# Check nginx configuration for proxy_buffering
grep proxy_buffering /etc/nginx/sites-available/watchtower

# Test SSE endpoint directly
curl -N -H "Accept: text/event-stream" http://localhost:8080/api/v1/events
```

##### 4. Performance Issues
```bash
# Check database performance
sudo -u postgres psql watchtower -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
"

# Monitor system resources
iostat -x 1
free -h
```

#### Log Analysis

```bash
# Application logs
sudo journalctl -u watchtower --since "1 hour ago"

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log
```

### Security Considerations

#### Production Security Checklist

- [ ] Use strong, unique secrets for JWT, session, and CSRF tokens
- [ ] Enable SSL/TLS with valid certificates
- [ ] Configure firewall to only allow necessary ports (80, 443, 22)
- [ ] Regularly update system packages and dependencies
- [ ] Use non-root user for application process
- [ ] Enable database SSL connections in production
- [ ] Implement proper backup and monitoring procedures
- [ ] Configure rate limiting and DDoS protection
- [ ] Regular security audits and vulnerability scanning

#### Environment-Specific Security

##### Development
- Use self-signed certificates or HTTP for local development
- Disable CSRF protection for API testing if needed
- Use relaxed CORS settings

##### Production
- Enforce HTTPS with HSTS headers
- Strict CSRF protection
- Restrictive CORS configuration
- Database connections over SSL
- Regular security updates

### Performance Optimization

#### Database Optimization

```sql
-- Create additional indexes for performance
CREATE INDEX CONCURRENTLY idx_monitoring_logs_timestamp_endpoint 
ON monitoring_logs (timestamp DESC, endpoint_id) 
WHERE timestamp > NOW() - INTERVAL '90 days';

-- Analyze table statistics
ANALYZE endpoints;
ANALYZE monitoring_logs;
ANALYZE incidents;
```

#### Application Optimization

```bash
# Increase worker pool size for high-load deployments
export MONITORING_WORKERS=10

# Tune database connection pool
export DB_MAX_OPEN_CONNS=25
export DB_MAX_IDLE_CONNS=5
```

#### Frontend Optimization

```bash
# Build with production optimizations
cd frontend
npm run build -- --mode production

# Serve with compression
# (Already configured in Nginx example above)
```

This deployment guide provides comprehensive coverage for deploying Watchtower in various environments while maintaining security and performance best practices.

---

## Conclusion

This guide provides a comprehensive overview of the Watchtower codebase. As you work with the code, you'll develop a deeper understanding of the patterns and practices used throughout the application.

### Key Takeaways

1. **Architecture**: Clean separation of concerns with monitoring engine, API layer, and database layer
2. **Patterns**: Consistent use of interfaces, dependency injection, and error handling
3. **Testing**: Comprehensive test coverage with unit and integration tests
4. **Performance**: Optimized for concurrent monitoring and efficient database operations
5. **Security**: Built-in security features and best practices

### Next Steps

1. **Set up your development environment** following the setup instructions
2. **Start with the learning path** appropriate for your role
3. **Pick a first task** from the suggested tasks
4. **Ask questions** when you encounter unfamiliar patterns
5. **Contribute improvements** to this guide as you learn

### Getting Help

- **Code Questions**: Review the patterns section and existing code
- **Setup Issues**: Check the troubleshooting section
- **Architecture Questions**: Study the architecture diagrams and component interactions
- **Feature Questions**: Look at existing similar features for patterns

Welcome to the Watchtower team! This codebase is designed to be maintainable, scalable, and enjoyable to work with. Take your time to understand the patterns, and don't hesitate to ask questions as you ramp up.

---

*Last updated: [Current Date]*
*Version: 1.0*
*Maintainer: Engineering Team*