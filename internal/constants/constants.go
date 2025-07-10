package constants

// HTTP Status Messages
const (
	ErrInternalServer    = "Internal server error"
	ErrInvalidJSON       = "Invalid JSON"
	ErrInvalidID         = "Invalid ID"
	ErrInvalidEndpointID = "Invalid endpoint ID"
	ErrInvalidIncidentID = "Invalid incident ID"
	ErrNotFound          = "Not found"
	ErrEndpointNotFound  = "Endpoint not found"
	ErrIncidentNotFound  = "Incident not found"
	ErrUnauthorized      = "Unauthorized"
	ErrForbidden         = "Forbidden"
	ErrBadRequest        = "Bad request"
)

// Pagination Defaults
const (
	DefaultPage      = 1
	DefaultLimit     = 50
	DefaultTimeHours = 24
	MaxLimit         = 100
	MaxTimeHours     = 720 // 30 days
	MaxLogsLimit     = 200
)

// Database Constraints
const (
	MinEndpointTimeout    = 1    // seconds
	MaxEndpointTimeout    = 60   // seconds
	MinCheckInterval      = 30   // seconds
	MaxCheckInterval      = 3600 // 1 hour
	DefaultCheckInterval  = 300  // 5 minutes
	DefaultTimeout        = 30   // seconds
	DefaultExpectedStatus = 200
)

// Content Types
const (
	ContentTypeJSON = "application/json"
	ContentTypeText = "text/plain"
	ContentTypeHTML = "text/html"
)

// Header Names
const (
	HeaderContentType   = "Content-Type"
	HeaderXCSRFToken    = "X-CSRF-Token"
	HeaderAuthorization = "Authorization"
)

// Incident Statuses
const (
	IncidentStatusOpen       = "open"
	IncidentStatusInProgress = "in_progress"
	IncidentStatusResolved   = "resolved"
)

// Incident Severities
const (
	IncidentSeverityLow      = "low"
	IncidentSeverityMedium   = "medium"
	IncidentSeverityHigh     = "high"
	IncidentSeverityCritical = "critical"
)

// HTTP Methods
const (
	MethodGET     = "GET"
	MethodPOST    = "POST"
	MethodPUT     = "PUT"
	MethodDELETE  = "DELETE"
	MethodPATCH   = "PATCH"
	MethodOPTIONS = "OPTIONS"
)
