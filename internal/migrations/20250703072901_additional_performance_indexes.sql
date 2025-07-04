-- +goose Up
-- +goose StatementBegin
-- Additional performance optimization indexes

-- Index for user authentication queries
CREATE INDEX IF NOT EXISTS idx_user_email_lookup ON "user"(email) WHERE email IS NOT NULL;

-- Index for endpoint filtering and sorting
CREATE INDEX IF NOT EXISTS idx_endpoint_created_at ON "endpoint"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_enabled_created_at ON "endpoint"(enabled, created_at DESC);

-- Composite index for monitoring logs pagination with time filtering
CREATE INDEX IF NOT EXISTS idx_monitoring_log_timestamp_endpoint_pagination
ON "monitoring_log"(timestamp DESC, endpoint_id, success);

-- Index for incident filtering and pagination
CREATE INDEX IF NOT EXISTS idx_incident_status_severity_created_at
ON "incident"(status, severity, created_at DESC);

-- Index for incident timeline queries
CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident_created_at
ON "incident_timeline"(incident_id, created_at ASC);

-- Index for endpoint incidents lookup
CREATE INDEX IF NOT EXISTS idx_endpoint_incident_endpoint_affected
ON "endpoint_incident"(endpoint_id, affected_start DESC, affected_end);

-- Partial index for active endpoint monitoring
CREATE INDEX IF NOT EXISTS idx_endpoint_monitoring_active
ON "endpoint"(check_interval_seconds, updated_at) WHERE enabled = true;

-- Index for uptime calculations - removed time predicate to avoid IMMUTABLE function requirement
CREATE INDEX IF NOT EXISTS idx_monitoring_log_uptime_calc
ON "monitoring_log"(endpoint_id, timestamp DESC, success);

-- Covering index for endpoint health summary view optimization - removed time predicate
CREATE INDEX IF NOT EXISTS idx_monitoring_log_health_summary
ON "monitoring_log"(endpoint_id, timestamp DESC, success, response_time_ms);

-- Index for recent activity queries
CREATE INDEX IF NOT EXISTS idx_incident_timeline_recent
ON "incident_timeline"(created_at DESC, event_type, incident_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Drop the additional indexes
DROP INDEX IF EXISTS idx_user_email_lookup;
DROP INDEX IF EXISTS idx_endpoint_created_at;
DROP INDEX IF EXISTS idx_endpoint_enabled_created_at;
DROP INDEX IF EXISTS idx_monitoring_log_timestamp_endpoint_pagination;
DROP INDEX IF EXISTS idx_incident_status_severity_created_at;
DROP INDEX IF EXISTS idx_incident_timeline_incident_created_at;
DROP INDEX IF EXISTS idx_endpoint_incident_endpoint_affected;
DROP INDEX IF EXISTS idx_endpoint_monitoring_active;
DROP INDEX IF EXISTS idx_monitoring_log_uptime_calc;
DROP INDEX IF EXISTS idx_monitoring_log_health_summary;
DROP INDEX IF EXISTS idx_incident_timeline_recent;
-- +goose StatementEnd
