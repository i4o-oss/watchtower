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
7. [API Layer](#api-layer)
8. [Security](#security)
9. [Frontend Architecture](#frontend-architecture)
10. [Testing Strategy](#testing-strategy)
11. [Deployment & DevOps](#deployment--devops)
12. [Development Workflows](#development-workflows)
13. [Code Patterns & Conventions](#code-patterns--conventions)
14. [Troubleshooting](#troubleshooting)
15. [Learning Path](#learning-path)

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

The heart of the application. Responsible for:
- Scheduling endpoint checks
- Executing HTTP requests
- Detecting incidents
- Storing monitoring results

#### Key Components:

**Engine (`engine.go`)**:
```go
type MonitoringEngine struct {
    db          *data.DB
    scheduler   *Scheduler
    workerPool  *WorkerPool
    httpClient  *HTTPClient
    detector    *IncidentDetector
}
```

**Scheduler (`scheduler.go`)**:
- Manages when endpoints should be checked
- Respects endpoint-specific intervals
- Handles load balancing across workers

**Worker Pool (`worker_pool.go`)**:
- Concurrent execution of monitoring tasks
- Configurable worker count
- Job queuing and result handling

**HTTP Client (`http_client.go`)**:
- Robust HTTP client with retry logic
- Configurable timeouts and redirects
- Response body size limiting
- Error handling and classification

#### Flow:
1. Scheduler identifies due endpoints
2. Jobs are queued to worker pool
3. Workers execute HTTP requests via HTTP client
4. Results are stored in database
5. Incident detector analyzes results

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

RESTful API with clear separation of concerns.

#### Route Structure:
```go
// Public routes (no auth required)
r.HandleFunc("/api/public/status", handlers.GetPublicStatus)
r.HandleFunc("/api/public/endpoints", handlers.GetPublicEndpoints)

// Admin routes (auth required)
admin := r.PathPrefix("/api/admin").Subrouter()
admin.Use(middleware.RequireAuth)
admin.HandleFunc("/endpoints", handlers.GetEndpoints)
admin.HandleFunc("/incidents", handlers.GetIncidents)
```

#### Key Handlers:
- **Endpoint Management**: CRUD operations for monitoring endpoints
- **Incident Management**: View, create, update incidents
- **Monitoring Data**: Historical logs and real-time metrics
- **Authentication**: Login, logout, session management

### 4. Real-time Updates (SSE)

Server-Sent Events for live dashboard updates.

#### Implementation:
```go
func (app *Application) HandleSSE(w http.ResponseWriter, r *http.Request) {
    // Setup SSE headers
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    
    // Stream updates
    for {
        select {
        case <-r.Context().Done():
            return
        case <-time.After(5 * time.Second):
            // Send periodic updates
            data, _ := json.Marshal(getCurrentStats())
            fmt.Fprintf(w, "data: %s\n\n", data)
            w.(http.Flusher).Flush()
        }
    }
}
```

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

The frontend is built with modern React patterns:

#### Project Structure:
```
frontend/app/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── admin-layout.tsx # Admin dashboard layout
│   ├── status-page.tsx  # Public status page
│   └── monitoring-charts.tsx # Data visualization
├── routes/              # Page components
│   ├── admin/           # Admin pages
│   ├── dashboard.tsx    # Main dashboard
│   └── login.tsx        # Authentication
├── lib/                 # Utilities and hooks
│   ├── api.ts          # API client
│   ├── auth.tsx        # Authentication context
│   └── utils.ts        # Utility functions
└── root.tsx            # App root component
```

### Key Components

#### Admin Dashboard (`routes/admin/`)
- **Endpoints Management**: CRUD interface for monitoring endpoints
- **Incident Management**: View and manage incidents
- **Monitoring Dashboard**: Real-time monitoring data
- **Performance Analytics**: Charts and metrics

#### Status Page (`components/status-page.tsx`)
- **Public Interface**: No authentication required
- **Real-time Updates**: Live status information
- **Incident Timeline**: Public incident history
- **Performance Metrics**: Response time charts

#### Data Visualization (`components/monitoring-charts.tsx`)
- **Response Time Charts**: Historical performance data
- **Uptime Statistics**: Availability metrics
- **Error Rate Trends**: Error analysis
- **Interactive Dashboards**: Drill-down capabilities

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
   # Add tests
   just test
   
   # Update database schema if needed
   just db-migrate-create add_endpoint_groups
   # Edit migration file
   just db-migrate-up
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
   # Start full stack
   just dev
   
   # Test end-to-end functionality
   # Check API endpoints
   # Verify UI updates
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