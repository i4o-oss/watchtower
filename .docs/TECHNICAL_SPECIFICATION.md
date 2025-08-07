# Watchtower - Technical Specification Document

*A comprehensive technical specification for the Watchtower Status Page and Monitoring application*

## File System

### Backend Repository Structure

```
watchtower/
├── cmd/
│   └── api/                    # Main application entry point
│       ├── main.go            # Application startup and configuration
│       ├── routes.go          # HTTP route definitions
│       ├── server.go          # HTTP server configuration
│       ├── middleware.go      # Authentication, CORS, security middleware
│       ├── auth.go            # Authentication handlers
│       ├── admin.go           # Admin API handlers
│       ├── public.go          # Public API handlers
│       ├── notifications.go   # Notification management handlers
│       ├── sse.go             # Server-Sent Events implementation
│       ├── health.go          # Health check endpoints
│       └── validation.go      # Input validation utilities
├── internal/
│   ├── data/                  # Database layer
│   │   ├── database.go        # Database connection and setup
│   │   ├── cached_db.go       # Caching wrapper for database operations
│   │   └── models.go          # Database models and operations
│   ├── cache/                 # Caching implementations
│   │   ├── cache.go           # Cache interface definition
│   │   ├── redis.go           # Redis cache implementation
│   │   ├── memory.go          # In-memory cache implementation
│   │   └── noop.go            # No-op cache for testing
│   ├── monitoring/            # Monitoring engine
│   │   ├── engine.go          # Main monitoring engine orchestrator
│   │   ├── scheduler.go       # Job scheduling system
│   │   ├── worker_pool.go     # Worker pool for concurrent monitoring
│   │   ├── http_client.go     # HTTP client for endpoint monitoring
│   │   ├── validator.go       # Response validation logic
│   │   ├── incident_detector.go # Automatic incident detection
│   │   └── integration.go     # External system integrations
│   ├── notification/          # Notification system
│   │   ├── service.go         # Notification service orchestrator
│   │   ├── types.go           # Notification types and interfaces
│   │   ├── trigger.go         # Notification trigger logic
│   │   ├── retry.go           # Retry mechanism for failed notifications
│   │   └── providers/         # Notification provider implementations
│   │       ├── email.go       # SMTP email notifications
│   │       ├── slack.go       # Slack webhook notifications
│   │       ├── discord.go     # Discord webhook notifications
│   │       └── webhook.go     # Generic webhook notifications
│   ├── security/              # Security components
│   │   ├── headers.go         # Security headers middleware
│   │   ├── csrf.go            # CSRF protection
│   │   └── sanitizer.go       # Input sanitization
│   ├── constants/             # Application constants
│   │   └── constants.go       # Global constants and enums
│   └── testutil/              # Testing utilities
│       └── testutil.go        # Test helpers and mocks
├── migrations/                # Database migrations
│   ├── 001_initial_with_uuids.sql
│   ├── 20250701152011_endpoints_and_monitoring.sql
│   ├── 20250701152109_incident_management.sql
│   ├── 20250701152205_performance_optimization.sql
│   ├── 20250702102600_incident_timeline.sql
│   └── 20250703072901_additional_performance_indexes.sql
├── docker/                    # Docker configuration
│   ├── Dockerfile             # Production Docker image
│   ├── Dockerfile.dev         # Development Docker image
│   ├── docker-compose.yml     # Development environment
│   ├── docker-compose.prod.yml # Production environment
│   └── init-scripts/          # Database initialization scripts
└── bin/                       # Compiled binaries
```

### Frontend Repository Structure

```
frontend/
├── app/                       # React Router v7 application
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # shadcn/ui component library
│   │   │   ├── button.tsx     # Button component
│   │   │   ├── card.tsx       # Card component
│   │   │   ├── dialog.tsx     # Modal dialog component
│   │   │   ├── input.tsx      # Form input component
│   │   │   ├── tabs.tsx       # Tab navigation component
│   │   │   └── ...            # Additional UI components
│   │   ├── status-page.tsx    # Public status page component
│   │   ├── admin-layout.tsx   # Admin dashboard layout
│   │   ├── json-editor.tsx    # JSON editor for request bodies
│   │   ├── monitoring-charts.tsx # Uptime and performance charts
│   │   ├── loading-spinner.tsx # Loading state component
│   │   └── toast.tsx          # Notification toast component
│   ├── routes/                # Route components
│   │   ├── home.tsx           # Public status page route
│   │   ├── login.tsx          # Authentication login page
│   │   ├── register.tsx       # Initial admin registration
│   │   ├── dashboard.tsx      # Admin dashboard overview
│   │   └── admin/             # Admin-specific routes
│   │       ├── index.tsx      # Admin dashboard home
│   │       ├── endpoints.tsx  # Endpoint management
│   │       ├── endpoints/     # Endpoint sub-routes
│   │       │   ├── new.tsx    # Create new endpoint
│   │       │   ├── [id].tsx   # View endpoint details
│   │       │   └── [id].edit.tsx # Edit endpoint
│   │       ├── monitoring.tsx # Monitoring dashboard
│   │       ├── incidents.tsx  # Incident management
│   │       ├── incidents/     # Incident sub-routes
│   │       │   ├── new.tsx    # Create new incident
│   │       │   └── [id].tsx   # View/edit incident
│   │       └── notifications/ # Notification management
│   │           ├── notifications.tsx # Main notifications page
│   │           └── channels.tsx # Notification channels
│   ├── lib/                   # Utility libraries
│   │   ├── api.ts             # API client with CSRF handling
│   │   ├── auth.tsx           # Authentication utilities
│   │   ├── utils.ts           # General utility functions
│   │   ├── validation.ts      # Form validation schemas
│   │   └── form-utils.tsx     # TanStack Forms utilities
│   ├── hooks/                 # Custom React hooks
│   │   └── useSSE.ts          # Server-Sent Events hook
│   ├── routes.ts              # Route configuration
│   ├── root.tsx               # Application root component
│   └── app.css                # Global application styles
├── build/                     # Production build output
├── public/                    # Static assets
│   └── favicon.ico            # Application favicon
├── package.json               # Node.js dependencies
├── vite.config.ts             # Vite build configuration
├── tsconfig.json              # TypeScript configuration
├── components.json            # shadcn/ui configuration
└── react-router.config.ts     # React Router configuration
```

## Feature Specifications

### Feature 1: User Authentication & Authorization System

**Feature Goal**: Provide secure admin-only access with single admin registration and automatic lockdown after first user creation.

**API Relationships**:
- `POST /api/v1/auth/register` - Initial admin registration (blocked after first user)
- `POST /api/v1/auth/login` - Admin authentication
- `POST /api/v1/auth/logout` - Session termination
- `GET /api/v1/auth/me` - Current user information
- `GET /api/v1/auth/registration-status` - Check if registration is allowed

**Detailed Feature Requirements**:

1. **Single Admin Registration Flow**:
   - Detect empty database state on application startup
   - Redirect visitors from home route (`/`) to registration when no users exist
   - Allow first user to register as primary administrator
   - Automatically disable all registration functionality after first successful signup
   - Block subsequent registration attempts with 403 Forbidden responses

2. **Session-Based Authentication**:
   - Use bcrypt for password hashing with default cost factor
   - Generate secure session tokens stored server-side
   - Implement automatic session expiration
   - Support "Remember Me" functionality with extended session duration
   - Session validation on protected routes

3. **Security Features**:
   - Rate limiting on authentication endpoints (5 attempts per minute per IP)
   - CSRF protection for all state-changing operations
   - Secure session cookie configuration (HttpOnly, Secure in production)
   - Input validation and sanitization on all auth endpoints
   - Audit logging for authentication events

**Detailed Implementation Guide**:

1. **Database Schema**:
```sql
-- User table (already exists)
CREATE TABLE "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session storage (recommend server-side session store)
-- Implementation uses in-memory or Redis-based session management
```

2. **Backend Implementation**:
   - `internal/data/models.go`: User model with password hashing methods
   - `cmd/api/auth.go`: Authentication handlers with rate limiting
   - `cmd/api/middleware.go`: Authentication middleware for protected routes
   - Session store initialization in `cmd/api/main.go`
   - Registration status tracking via user count query

3. **Frontend Implementation**:
   - `app/routes/login.tsx`: Login form with TanStack Forms validation
   - `app/routes/register.tsx`: Registration form (conditionally available)
   - `app/lib/auth.tsx`: Authentication context and utilities
   - Protected route wrapper components
   - Automatic redirection logic based on authentication state

4. **Security Considerations**:
   - Password complexity requirements (minimum 8 characters, mixed case, numbers)
   - Rate limiting implementation using in-memory or Redis store
   - CSRF token generation and validation
   - Secure session cookie configuration
   - Protection against timing attacks in password verification

### Feature 2: Endpoint Monitoring Configuration

**Feature Goal**: Allow administrators to configure and manage HTTP endpoints for continuous monitoring with flexible parameters.

**API Relationships**:
- `GET /api/v1/admin/endpoints` - List all monitoring endpoints with pagination
- `POST /api/v1/admin/endpoints` - Create new monitoring endpoint
- `GET /api/v1/admin/endpoints/{id}` - Retrieve specific endpoint details  
- `PUT /api/v1/admin/endpoints/{id}` - Update endpoint configuration
- `DELETE /api/v1/admin/endpoints/{id}` - Remove endpoint from monitoring
- `GET /api/v1/admin/endpoints/{id}/logs` - Get monitoring logs for endpoint
- `GET /api/v1/admin/endpoints/{id}/incidents` - Get incidents for endpoint

**Detailed Feature Requirements**:

1. **Endpoint Configuration Options**:
   - URL validation with support for HTTP/HTTPS protocols
   - HTTP method selection (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
   - Custom request headers as key-value pairs with JSON storage
   - Request body configuration with JSON editor for complex payloads
   - Expected HTTP status code specification (default: 200)
   - Timeout configuration (1-300 seconds, default: 30)
   - Monitoring interval selection (60s, 300s, 900s, 1800s, 3600s, 21600s, 43200s, 86400s)
   - Enable/disable toggle for individual endpoints
   - Descriptive name and optional description fields

2. **Validation Rules**:
   - URL format validation and reachability pre-check
   - JSON validation for headers and request body
   - Timeout range validation (1-300 seconds)
   - Check interval minimum of 60 seconds to prevent server overload
   - Header key uniqueness validation
   - Request body size limit (64KB maximum)

3. **UI/UX Requirements**:
   - Responsive form layout with progressive disclosure
   - JSON editor with syntax highlighting and error detection
   - Real-time validation feedback with error messages
   - Bulk operations for enable/disable across multiple endpoints
   - Search and filtering capabilities for endpoint list
   - Export/import functionality for endpoint configurations

**Detailed Implementation Guide**:

1. **Database Schema**:
```sql
CREATE TABLE "endpoint" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    url VARCHAR(2048) NOT NULL,
    method VARCHAR(10) DEFAULT 'GET' 
        CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')),
    headers JSONB DEFAULT '{}',
    body TEXT DEFAULT '',
    expected_status_code INTEGER DEFAULT 200,
    timeout_seconds INTEGER DEFAULT 30 
        CHECK (timeout_seconds > 0 AND timeout_seconds <= 300),
    check_interval_seconds INTEGER DEFAULT 300 
        CHECK (check_interval_seconds >= 60),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_endpoint_enabled ON "endpoint"(enabled);
CREATE INDEX idx_endpoint_url ON "endpoint"(url);
```

2. **Backend Implementation**:
   - `internal/data/models.go`: Endpoint model with HTTPHeaders custom type
   - `cmd/api/admin.go`: CRUD handlers with input validation
   - `cmd/api/validation.go`: URL, JSON, and configuration validation
   - Pagination support with configurable page sizes
   - Bulk operations support for enable/disable actions

3. **Frontend Implementation**:
   - `app/routes/admin/endpoints.tsx`: Endpoint listing with search/filter
   - `app/routes/admin/endpoints/new.tsx`: Endpoint creation form
   - `app/routes/admin/endpoints/[id].edit.tsx`: Endpoint editing form
   - `app/components/json-editor.tsx`: JSON editor component with validation
   - Form validation using TanStack Forms with custom validators
   - Real-time preview of HTTP request configuration

4. **Monitoring Integration**:
   - Automatic scheduling system updates when endpoints are modified
   - Graceful handling of configuration changes during active monitoring
   - Configuration change audit logging
   - Test connection functionality before saving endpoint

### Feature 3: Real-Time Monitoring Engine

**Feature Goal**: Continuously monitor configured endpoints in the background, collect performance metrics, and detect service outages automatically.

**API Relationships**:
- Internal monitoring engine with no direct API exposure
- Integrates with notification system for alerting
- Publishes results via Server-Sent Events to frontend
- Stores monitoring data in `monitoring_log` table

**Detailed Feature Requirements**:

1. **Monitoring Execution**:
   - Concurrent monitoring using configurable worker pool (default: 5 workers)
   - Intelligent job scheduling based on endpoint check intervals
   - HTTP client with proper timeout handling and connection pooling
   - Response time measurement with millisecond precision
   - Request/response logging with configurable sample retention
   - Graceful handling of network failures and DNS resolution issues

2. **Performance Metrics Collection**:
   - Response time tracking for performance trend analysis
   - HTTP status code monitoring and validation
   - Response body sampling for debugging (first 1000 characters)
   - Success/failure rate calculation over configurable time windows
   - Uptime percentage calculation (daily, 30-day, 90-day)
   - Error categorization (network, timeout, status code, DNS)

3. **Incident Detection**:
   - Configurable failure threshold detection (consecutive failures)
   - Automatic incident creation for sustained outages
   - Recovery detection and automatic incident closure
   - Escalation rules based on outage duration
   - False positive reduction through confirmation checks

4. **Data Retention**:
   - Configurable monitoring data retention (default: 90 days)
   - Automated cleanup of old monitoring logs
   - Data aggregation for long-term trend analysis
   - Efficient storage with partitioning by date

**Detailed Implementation Guide**:

1. **Database Schema**:
```sql
CREATE TABLE "monitoring_log" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID NOT NULL REFERENCES "endpoint"(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    success BOOLEAN NOT NULL,
    response_body_sample TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes for efficient queries
CREATE INDEX idx_monitoring_log_endpoint_timestamp ON "monitoring_log"(endpoint_id, timestamp);
CREATE INDEX idx_monitoring_log_success ON "monitoring_log"(success);
CREATE INDEX idx_monitoring_log_timestamp ON "monitoring_log"(timestamp);
```

2. **Backend Implementation**:
   - `internal/monitoring/engine.go`: Main monitoring orchestrator
   - `internal/monitoring/scheduler.go`: Job scheduling system with cron-like functionality
   - `internal/monitoring/worker_pool.go`: Concurrent worker management
   - `internal/monitoring/http_client.go`: HTTP client with timeout and retry logic
   - `internal/monitoring/validator.go`: Response validation and success determination
   - `internal/monitoring/incident_detector.go`: Automatic incident detection logic

3. **Configuration Management**:
```go
type EngineConfig struct {
    WorkerPoolConfig WorkerPoolConfig
    SchedulerConfig  SchedulerConfig
    ValidatorConfig  ValidatorConfig
    HTTPClientConfig HTTPClientConfig
}

type WorkerPoolConfig struct {
    WorkerCount    int
    JobQueueSize   int
    ResultChanSize int
}
```

4. **Integration Points**:
   - Real-time result broadcasting via Server-Sent Events
   - Notification system integration for alert delivery
   - Database integration for persistent monitoring data storage
   - Graceful shutdown handling with proper cleanup

5. **Monitoring Algorithm**:
```
For each enabled endpoint:
1. Schedule monitoring job based on check_interval_seconds
2. Execute HTTP request with configured parameters
3. Measure response time and validate response
4. Record monitoring result in database
5. Check for incident conditions (consecutive failures)
6. Trigger notifications if incident detected
7. Broadcast real-time update via SSE
8. Update internal endpoint status cache
```

### Feature 4: Public Status Page

**Feature Goal**: Provide a public-facing status page displaying real-time service status, uptime statistics, and incident information for end users.

**API Relationships**:
- `GET /api/v1/status` - Current status of all monitored endpoints
- `GET /api/v1/uptime/{endpoint_id}` - Historical uptime data for specific endpoint
- `GET /api/v1/incidents` - Published incident reports
- `GET /api/v1/events` - Server-Sent Events for real-time updates

**Detailed Feature Requirements**:

1. **Status Display Components**:
   - Overall system status indicator (Operational, Degraded Performance, Major Outage)
   - Individual service status cards with color-coded indicators
   - Real-time uptime percentages (today, 30-day, 90-day)
   - Last check timestamp for each service
   - Response time indicators for performance monitoring
   - Responsive grid layout adapting to screen size

2. **Interactive Uptime Visualization**:
   - 90-day uptime graph with daily resolution
   - Interactive hover details showing specific day statistics
   - Click-to-zoom functionality for detailed time periods
   - Color-coded status representation (green=up, yellow=degraded, red=down)
   - Smooth loading animations and skeleton states

3. **Incident Reporting**:
   - Current incident announcements with severity indicators
   - Historical incident timeline with status updates
   - Incident impact scope showing affected services
   - Resolution status and estimated time to resolution
   - Incident update notifications

4. **User Experience Features**:
   - Auto-refresh functionality (configurable interval)
   - Manual refresh button with loading state
   - Responsive design for mobile and desktop
   - Accessibility compliance (WCAG 2.1 AA)
   - SEO optimization with proper meta tags

**Detailed Implementation Guide**:

1. **Frontend Components**:
   - `app/components/status-page.tsx`: Main status page component
   - `app/components/monitoring-charts.tsx`: Uptime visualization components
   - Real-time updates using `app/hooks/useSSE.ts`
   - Responsive CSS using Tailwind utility classes
   - Chart components using Recharts library

2. **Status Calculation Logic**:
```typescript
interface ServiceStatus {
    id: string
    name: string
    status: 'operational' | 'degraded' | 'outage'
    uptime_today: number
    uptime_30_day: number
    uptime_90_day: number
    last_check: string
    response_time_ms?: number
}

// Status determination algorithm:
// - operational: Last 3 checks successful, avg response time < 2x baseline
// - degraded: Some failures or elevated response times
// - outage: Recent consecutive failures or no successful checks
```

3. **Real-Time Updates**:
   - Server-Sent Events implementation for live status updates
   - Automatic reconnection logic for connection interruptions
   - Efficient data synchronization with local component state
   - Visual indicators for connection status

4. **Performance Optimization**:
   - Component memoization for expensive calculations
   - Lazy loading of historical data
   - Efficient chart rendering with data decimation
   - Image optimization and progressive loading
   - CDN integration for static assets

5. **Accessibility Features**:
   - ARIA labels for status indicators
   - Keyboard navigation support
   - Screen reader compatibility
   - High contrast mode support
   - Focus management for interactive elements

### Feature 5: Admin Dashboard & Analytics

**Feature Goal**: Provide comprehensive administrative interface for monitoring system health, managing configurations, and analyzing performance trends.

**API Relationships**:
- `GET /api/v1/admin/monitoring-logs` - Detailed monitoring logs with pagination/filtering
- `GET /api/v1/admin/rate-limit-stats` - API rate limiting statistics
- All endpoint management APIs from Feature 2
- All incident management APIs from Feature 6
- All notification management APIs from Feature 10

**Detailed Feature Requirements**:

1. **Dashboard Overview**:
   - System health metrics summary (uptime, response times, error rates)
   - Recent activity feed showing monitoring events and incidents
   - Quick access to critical functions (create incident, add endpoint)
   - Performance charts showing trends over time
   - Notification delivery statistics
   - Database and cache performance metrics

2. **Monitoring Logs Management**:
   - Detailed monitoring log viewer with advanced filtering
   - Export functionality for monitoring data (CSV, JSON)
   - Log search by endpoint, time range, status, and error messages
   - Bulk operations for log cleanup and archiving
   - Performance analysis tools and trend identification

3. **System Configuration**:
   - Application settings management (cache, monitoring intervals)
   - Security configuration (rate limits, session timeouts)
   - Integration settings for external services
   - Backup and restore functionality
   - Database maintenance tools

4. **Administrative Tools**:
   - User session management and forced logout
   - System resource monitoring (CPU, memory, disk usage)
   - Application log viewer with real-time updates
   - Configuration change audit trail
   - Health check and diagnostic tools

**Detailed Implementation Guide**:

1. **Dashboard Components**:
   - `app/routes/admin/index.tsx`: Main dashboard overview
   - `app/routes/admin/monitoring.tsx`: Detailed monitoring analytics
   - `app/components/admin-layout.tsx`: Consistent admin interface layout
   - Chart components for trend visualization
   - Data tables with sorting, filtering, and pagination

2. **Data Aggregation**:
```sql
-- Monitoring statistics views for efficient dashboard queries
CREATE VIEW endpoint_stats AS
SELECT 
    e.id,
    e.name,
    COUNT(ml.id) as total_checks,
    AVG(ml.response_time_ms) as avg_response_time,
    (COUNT(CASE WHEN ml.success THEN 1 END) * 100.0 / COUNT(ml.id)) as uptime_percentage
FROM endpoint e
LEFT JOIN monitoring_log ml ON e.id = ml.endpoint_id
WHERE ml.timestamp > NOW() - INTERVAL '30 days'
GROUP BY e.id, e.name;
```

3. **Performance Monitoring**:
   - Real-time system metrics collection
   - Database query performance monitoring
   - Cache hit/miss ratio tracking
   - API response time monitoring
   - Memory and CPU usage alerts

4. **Administrative Security**:
   - Role-based access control (future enhancement)
   - Action authorization and audit logging
   - Secure configuration storage
   - Protected administrative endpoints
   - Session management and timeout enforcement

### Feature 6: Incident Management System

**Feature Goal**: Comprehensive incident tracking, timeline management, and communication system for managing service disruptions.

**API Relationships**:
- `GET /api/v1/admin/incidents` - List incidents with pagination and filtering
- `POST /api/v1/admin/incidents` - Create new incident report
- `GET /api/v1/admin/incidents/{id}` - Retrieve incident details with timeline
- `PUT /api/v1/admin/incidents/{id}` - Update incident status and details
- `DELETE /api/v1/admin/incidents/{id}` - Remove incident record
- `GET /api/v1/admin/incidents/{id}/endpoints` - Get affected endpoints
- `POST /api/v1/admin/incidents/{id}/endpoints` - Associate endpoints with incident
- `DELETE /api/v1/admin/incidents/{id}/endpoints/{endpoint_id}` - Remove endpoint association
- `GET /api/v1/admin/incidents/{id}/timeline` - Get incident timeline events
- `POST /api/v1/admin/incidents/{id}/comments` - Add timeline comment

**Detailed Feature Requirements**:

1. **Incident Creation and Management**:
   - Manual incident creation with title, description, and severity
   - Automatic incident detection based on monitoring failures
   - Incident categorization by severity (low, medium, high, critical)
   - Status tracking (open, investigating, identified, monitoring, resolved)
   - Start time and end time management with automatic resolution detection
   - Bulk incident operations for mass updates

2. **Endpoint Association**:
   - Link incidents to affected endpoints with time ranges
   - Visual representation of incident impact scope
   - Automatic endpoint association for monitoring-detected incidents
   - Historical impact analysis for reliability reporting
   - Cascade effect tracking for dependent services

3. **Timeline and Communication**:
   - Chronological incident timeline with all status changes
   - Comment system for incident updates and communication
   - Automatic timeline entries for system events
   - User attribution for all timeline events
   - Rich text support for detailed incident updates

4. **Resolution Management**:
   - Resolution workflow with confirmation steps
   - Post-incident analysis templates
   - Lessons learned documentation
   - Resolution time tracking and SLA monitoring
   - Automatic notification of incident closure

**Detailed Implementation Guide**:

1. **Database Schema**:
```sql
CREATE TABLE "incident" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    severity VARCHAR(20) DEFAULT 'medium' 
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' 
        CHECK (status IN ('open', 'investigating', 'identified', 'monitoring', 'resolved')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "endpoint_incident" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID NOT NULL REFERENCES "endpoint"(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES "incident"(id) ON DELETE CASCADE,
    affected_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    affected_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(endpoint_id, incident_id)
);

CREATE TABLE "incident_timeline" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES "incident"(id) ON DELETE CASCADE,
    user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL 
        CHECK (event_type IN ('status_change', 'update', 'comment', 'endpoint_associated', 'endpoint_removed', 'created', 'resolved')),
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. **Backend Implementation**:
   - `internal/data/models.go`: Incident models with relationships
   - `cmd/api/admin.go`: Incident CRUD handlers with timeline integration
   - Automatic timeline entry creation for all incident changes
   - Transaction handling for multi-table incident operations

3. **Frontend Implementation**:
   - `app/routes/admin/incidents.tsx`: Incident listing with advanced filtering
   - `app/routes/admin/incidents/new.tsx`: Incident creation form
   - `app/routes/admin/incidents/[id].tsx`: Incident detail view with timeline
   - Rich text editor for incident descriptions and updates
   - Real-time updates for collaborative incident management

4. **Automatic Incident Detection**:
```go
// Incident detection algorithm in monitoring engine
type IncidentDetector struct {
    consecutiveFailureThreshold int
    recoveryConfirmationChecks  int
}

func (id *IncidentDetector) ProcessMonitoringResult(result MonitoringResult) {
    if result.Success {
        id.handleSuccessfulCheck(result)
    } else {
        id.handleFailedCheck(result)
    }
}
```

5. **Timeline Event Processing**:
   - Automatic timeline entries for status changes
   - User-initiated comments and updates
   - System-generated events for endpoint associations
   - Metadata storage for complex event data
   - Real-time collaboration features

### Feature 7: Server-Sent Events (Real-Time Updates)

**Feature Goal**: Provide real-time updates to frontend clients for monitoring status changes, incident updates, and system notifications without polling.

**API Relationships**:
- `GET /api/v1/events` - Server-Sent Events endpoint for real-time updates
- Integrates with monitoring engine, incident system, and notification service
- Broadcasts to all connected clients with proper event filtering

**Detailed Feature Requirements**:

1. **Event Broadcasting**:
   - Real-time monitoring result updates for all endpoints
   - Incident status changes and timeline updates
   - System notification delivery confirmations
   - Connection status and health information
   - Selective event filtering based on client subscriptions

2. **Connection Management**:
   - Automatic client connection handling and cleanup
   - Connection heartbeat for detecting disconnected clients
   - Graceful reconnection logic with exponential backoff
   - Connection pooling and resource management
   - Cross-origin support for external integrations

3. **Event Types and Data**:
   - Monitoring events with endpoint ID, status, and metrics
   - Incident events with full incident details and changes
   - System events for maintenance and configuration updates
   - Notification events for delivery status updates
   - Error events for client-side error handling

4. **Performance and Scalability**:
   - Efficient JSON serialization for event data
   - Connection limits and rate limiting per client
   - Memory-efficient client tracking
   - Event buffering for disconnected clients
   - Horizontal scaling considerations

**Detailed Implementation Guide**:

1. **Backend SSE Implementation**:
   - `cmd/api/sse.go`: Server-Sent Events hub and client management
   - Event broadcasting system with topic-based routing
   - Connection lifecycle management with proper cleanup
   - Integration points with monitoring engine and incident system

2. **SSE Hub Architecture**:
```go
type SSEHub struct {
    clients    map[*SSEClient]bool
    register   chan *SSEClient
    unregister chan *SSEClient
    broadcast  chan []byte
    eventTypes map[string]bool
}

type SSEClient struct {
    hub        *SSEHub
    conn       http.ResponseWriter
    send       chan []byte
    clientID   string
    filters    []string
}
```

3. **Frontend SSE Integration**:
   - `app/hooks/useSSE.ts`: React hook for SSE connection management
   - Automatic reconnection logic with exponential backoff
   - Event filtering and type-safe event handling
   - Connection status monitoring and user feedback

4. **Event Message Format**:
```typescript
interface SSEEvent {
    type: 'monitoring' | 'incident' | 'notification' | 'system'
    id: string
    timestamp: string
    data: {
        endpoint_id?: string
        incident_id?: string
        status?: string
        message?: string
        [key: string]: any
    }
}
```

5. **Connection Resilience**:
   - Client-side reconnection with progressive delays
   - Server-side connection health monitoring
   - Event replay mechanism for missed events
   - Graceful degradation when SSE unavailable
   - Fallback to periodic polling if needed

### Feature 8: Caching Strategy & Performance

**Feature Goal**: Implement comprehensive caching layer to optimize database queries, reduce API response times, and improve overall system performance.

**API Relationships**:
- Transparent caching layer for all database operations
- Cache invalidation triggers for data modification APIs
- Performance metrics APIs for cache effectiveness monitoring

**Detailed Feature Requirements**:

1. **Multi-Level Caching**:
   - Redis-based distributed caching for production environments
   - In-memory fallback caching for development and single-instance deployments
   - Application-level caching for expensive computations
   - HTTP response caching with appropriate cache headers
   - Database query result caching with intelligent invalidation

2. **Cache Management**:
   - Automatic cache warming on application startup
   - Intelligent cache invalidation based on data dependencies
   - Configurable TTL (Time To Live) values per data type
   - Cache statistics and hit/miss ratio monitoring
   - Manual cache clearing for administrative operations

3. **Performance Optimization**:
   - Database connection pooling and query optimization
   - Lazy loading for non-critical data
   - Pagination optimization with cursor-based approaches
   - Index optimization for frequent query patterns
   - Background processing for non-urgent operations

4. **Monitoring and Metrics**:
   - Cache performance metrics collection
   - Database query performance monitoring
   - Memory usage tracking and alerts
   - Response time analysis and optimization
   - Bottleneck identification and resolution

**Detailed Implementation Guide**:

1. **Cache Architecture**:
   - `internal/cache/cache.go`: Cache interface definition
   - `internal/cache/redis.go`: Redis implementation with connection pooling
   - `internal/cache/memory.go`: In-memory cache with LRU eviction
   - `internal/cache/noop.go`: No-op cache for testing environments

2. **Cached Database Wrapper**:
```go
type CachedDB struct {
    db    *DB
    cache Cache
    ttl   map[string]time.Duration
}

func (cdb *CachedDB) GetEndpoints() ([]Endpoint, error) {
    key := "endpoints:all"
    
    // Try cache first
    if cached, found := cdb.cache.Get(key); found {
        return cached.([]Endpoint), nil
    }
    
    // Fallback to database
    endpoints, err := cdb.db.GetEndpoints()
    if err != nil {
        return nil, err
    }
    
    // Cache the result
    cdb.cache.Set(key, endpoints, cdb.ttl["endpoints"])
    return endpoints, nil
}
```

3. **Cache Invalidation Strategy**:
   - Write-through caching for immediate consistency
   - Event-driven invalidation for related data changes
   - Pattern-based cache clearing for bulk operations
   - Time-based expiration for eventually consistent data

4. **Performance Monitoring**:
   - Cache hit/miss ratio tracking
   - Query execution time monitoring
   - Memory usage profiling
   - Connection pool utilization metrics
   - Real-time performance dashboards

### Feature 9: Security Framework

**Feature Goal**: Comprehensive security implementation covering authentication, authorization, input validation, and protection against common web vulnerabilities.

**API Relationships**:
- Security middleware applied to all API endpoints
- CSRF token generation and validation endpoints
- Rate limiting enforcement across all public APIs
- Security headers applied to all HTTP responses

**Detailed Feature Requirements**:

1. **Input Validation and Sanitization**:
   - Comprehensive input validation for all API endpoints
   - SQL injection prevention through parameterized queries
   - XSS protection with input sanitization and output encoding
   - File upload validation and virus scanning
   - JSON schema validation for complex request bodies

2. **Authentication and Session Security**:
   - Secure session management with HttpOnly cookies
   - CSRF protection for all state-changing operations
   - Rate limiting on authentication endpoints
   - Account lockout after failed login attempts
   - Secure password storage with bcrypt hashing

3. **API Security**:
   - Rate limiting with configurable limits per endpoint
   - Request size limits to prevent DoS attacks
   - CORS configuration for cross-origin requests
   - Security headers (HSTS, CSP, X-Frame-Options)
   - API versioning and deprecation strategies

4. **Data Protection**:
   - Encryption at rest for sensitive configuration data
   - Secure transmission with TLS/SSL enforcement
   - Data masking for logging and debugging
   - Audit logging for security-relevant events
   - Privacy compliance (GDPR, CCPA considerations)

**Detailed Implementation Guide**:

1. **Security Middleware Stack**:
   - `internal/security/headers.go`: Security headers middleware
   - `internal/security/csrf.go`: CSRF protection implementation
   - `internal/security/sanitizer.go`: Input sanitization utilities
   - `cmd/api/middleware.go`: Authentication and rate limiting middleware

2. **CSRF Protection**:
```go
type CSRFProtection struct {
    cache         Cache
    config        CSRFConfig
    trustedOrigins []string
}

func (c *CSRFProtection) GenerateToken(sessionID string) (string, error) {
    token := generateSecureToken(32)
    key := fmt.Sprintf("csrf:%s", sessionID)
    c.cache.Set(key, token, 1*time.Hour)
    return token, nil
}
```

3. **Rate Limiting Implementation**:
   - Token bucket algorithm for rate limiting
   - Per-IP and per-user rate limits
   - Configurable rate limits by endpoint type
   - Rate limit statistics and monitoring
   - Graceful degradation under high load

4. **Security Configuration**:
```go
type SecurityConfig struct {
    CSRFEnabled       bool
    RateLimitEnabled  bool
    SecureHeaders     SecurityHeadersConfig
    SessionConfig     SessionConfig
    PasswordPolicy    PasswordPolicyConfig
}
```

5. **Audit Logging**:
   - Security event logging with structured format
   - Authentication attempt logging
   - Administrative action audit trail
   - Failed request logging for security analysis
   - Log rotation and secure storage

### Feature 10: Notification System

**Feature Goal**: Comprehensive notification delivery system supporting multiple channels (email, Slack, Discord, webhooks) with configurable rules and retry mechanisms.

**API Relationships**:
- `GET /api/v1/admin/notifications/channels` - List notification channels
- `POST /api/v1/admin/notifications/channels` - Create notification channel
- `PUT /api/v1/admin/notifications/channels/{id}` - Update channel configuration
- `DELETE /api/v1/admin/notifications/channels/{id}` - Remove notification channel
- `POST /api/v1/admin/notifications/test` - Test notification delivery

**Detailed Feature Requirements**:

1. **Notification Channels**:
   - **Email SMTP**: Configurable SMTP server with authentication support
   - **Slack Webhooks**: Integration with Slack workspace webhooks
   - **Discord Webhooks**: Discord server notification support
   - **Generic Webhooks**: HTTP POST notifications to custom endpoints
   - Multi-channel delivery with independent configuration

2. **Notification Triggers**:
   - Endpoint down/up status changes
   - Incident creation, updates, and resolution
   - Monitoring threshold breaches (response time, uptime)
   - Scheduled maintenance window notifications
   - System health alerts and warnings

3. **Delivery Management**:
   - Asynchronous notification processing with queue system
   - Retry mechanism with exponential backoff for failed deliveries
   - Delivery status tracking and reporting
   - Rate limiting to prevent notification spam
   - Template-based message formatting with variable substitution

4. **Configuration and Rules**:
   - Per-endpoint notification rules configuration
   - Severity-based notification filtering
   - Time-based notification scheduling (business hours only)
   - Escalation rules for prolonged outages
   - Notification aggregation to prevent spam

**Detailed Implementation Guide**:

1. **Database Schema**:
```sql
-- Future enhancement - notification channels storage
CREATE TABLE "notification_channel" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'slack', 'discord', 'webhook')),
    configuration JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "notification_rule" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID REFERENCES "endpoint"(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES "notification_channel"(id) ON DELETE CASCADE,
    trigger_types TEXT[] NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "notification_log" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES "notification_channel"(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    delivery_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (delivery_status IN ('pending', 'sent', 'failed', 'retrying')),
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. **Notification Service Architecture**:
   - `internal/notification/service.go`: Main notification orchestrator
   - `internal/notification/types.go`: Notification interfaces and types
   - `internal/notification/providers/`: Individual provider implementations
   - `internal/notification/retry.go`: Retry logic with exponential backoff
   - `internal/notification/trigger.go`: Notification trigger evaluation

3. **Provider Implementations**:
```go
type EmailProvider struct {
    smtpHost     string
    smtpPort     int
    username     string
    password     string
    fromAddress  string
    enabled      bool
}

func (e *EmailProvider) SendNotification(ctx context.Context, data NotificationData) DeliveryResult {
    // SMTP email delivery implementation
    msg := e.formatEmailMessage(data)
    err := e.sendSMTP(msg)
    return DeliveryResult{
        Success:   err == nil,
        Error:     err,
        Timestamp: time.Now(),
    }
}
```

4. **Message Templates**:
```go
type NotificationTemplate struct {
    Type     NotificationType
    Subject  string
    Body     string
    Variables map[string]string
}

// Template for endpoint down notification
var EndpointDownTemplate = NotificationTemplate{
    Type:    NotificationTypeEndpointDown,
    Subject: "🚨 Service Down: {{.EndpointName}}",
    Body: `
Service: {{.EndpointName}}
Status: DOWN
URL: {{.EndpointURL}}
Error: {{.ErrorMessage}}
Time: {{.Timestamp}}
Duration: {{.Duration}}
    `,
}
```

5. **Integration with Monitoring**:
   - Automatic notification triggering from monitoring engine
   - Incident-based notification escalation
   - Recovery notifications with downtime duration
   - Performance threshold breach notifications

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Frontend (React)  │    │   Backend (Go)      │    │   Database (PG)     │
│                     │    │                     │    │                     │
│ • Public Status     │◄──►│ • HTTP API          │◄──►│ • Users             │
│ • Admin Dashboard   │    │ • Authentication    │    │ • Endpoints         │
│ • Real-time SSE     │    │ • Monitoring Engine │    │ • Monitoring Logs   │
│ • Form Management   │    │ • Notifications     │    │ • Incidents         │
└─────────────────────┘    │ • SSE Broadcasting  │    │ • Timeline          │
                           └─────────────────────┘    └─────────────────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐    ┌─────────────────────┐
                           │   Caching Layer     │    │   External Services │
                           │                     │    │                     │
                           │ • Redis (Prod)      │    │ • SMTP Email        │
                           │ • Memory (Dev)      │    │ • Slack Webhooks    │
                           │ • Query Cache       │    │ • Discord Webhooks  │
                           │ • Session Store     │    │ • Generic Webhooks  │
                           └─────────────────────┘    └─────────────────────┘
```

### Technology Stack Selection

**Backend Technology Choices**:
- **Go**: High performance, excellent concurrency, strong typing, minimal deployment footprint
- **Chi Router**: Lightweight, composable HTTP routing with middleware support
- **GORM**: Type-safe ORM with migration support and query optimization
- **PostgreSQL**: ACID compliance, JSON support, excellent performance, mature ecosystem
- **Redis**: High-performance caching, session storage, pub/sub capabilities

**Frontend Technology Choices**:
- **React 18**: Modern React with concurrent features and improved performance
- **React Router v7**: File-based routing, server-side rendering capabilities, type safety
- **Vite**: Fast build tool with hot reload and optimized bundling
- **Tailwind CSS**: Utility-first CSS framework for rapid development
- **shadcn/ui**: High-quality, accessible component library
- **TanStack Forms**: Type-safe form management with validation
- **Recharts**: Declarative charting library for data visualization

### Deployment Architecture

**Development Environment**:
- Docker Compose for local development
- Hot reload for both frontend and backend
- Local PostgreSQL and Redis instances
- Development-specific security configurations

**Production Environment**:
- Docker containerization with multi-stage builds
- Railway Platform deployment with automatic scaling
- Managed PostgreSQL database with connection pooling
- Redis cluster for high availability caching
- CDN integration for static asset delivery

### Database Design Principles

**Schema Design**:
- UUID primary keys for distributed system compatibility
- JSONB fields for flexible configuration storage
- Proper foreign key relationships with cascade options
- Comprehensive indexing strategy for query performance
- Time-zone aware timestamp storage

**Performance Optimization**:
- Compound indexes for common query patterns
- Partial indexes for filtered queries
- Database-level constraints for data integrity
- Connection pooling and query timeout management
- Automated vacuum and maintenance scheduling

### Security Architecture

**Authentication & Authorization**:
- Session-based authentication with secure cookie storage
- CSRF protection for all state-changing operations
- Rate limiting with configurable thresholds
- Input validation and sanitization at all entry points
- Secure password storage with bcrypt hashing

**Data Protection**:
- TLS/SSL encryption for all communications
- Sensitive data encryption at rest
- Comprehensive audit logging
- Privacy-compliant data handling
- Secure configuration management

### Monitoring & Observability

**Application Monitoring**:
- Structured logging with contextual information
- Performance metrics collection and analysis
- Error tracking and alerting
- Database query performance monitoring
- Cache hit/miss ratio tracking

**Infrastructure Monitoring**:
- System resource utilization tracking
- Database connection and performance monitoring
- Network latency and throughput measurement
- Disk usage and I/O performance monitoring
- Service availability and health checks

This technical specification provides a comprehensive foundation for understanding and extending the Watchtower monitoring application, covering all aspects from database design to user interface implementation, with detailed guidance for each feature's requirements and implementation approach.