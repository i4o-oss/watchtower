-- +goose Up
-- +goose StatementBegin
-- Additional performance optimizations and constraints

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_monitoring_log_endpoint_success_timestamp
ON "monitoring_log"(endpoint_id, success, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_log_timestamp_success
ON "monitoring_log"(timestamp DESC, success);

-- Add constraint to ensure incident end_time is after start_time
ALTER TABLE "incident" ADD CONSTRAINT chk_incident_end_after_start
CHECK (end_time IS NULL OR end_time >= start_time);

-- Add constraint to ensure endpoint_incident affected_end is after affected_start
ALTER TABLE "endpoint_incident" ADD CONSTRAINT chk_endpoint_incident_end_after_start
CHECK (affected_end IS NULL OR affected_end >= affected_start);

-- Add constraint for valid HTTP methods
ALTER TABLE "endpoint" ADD CONSTRAINT chk_endpoint_valid_method
CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'));

-- Add constraint for valid incident severities
ALTER TABLE "incident" ADD CONSTRAINT chk_incident_valid_severity
CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Add constraint for valid incident statuses
ALTER TABLE "incident" ADD CONSTRAINT chk_incident_valid_status
CHECK (status IN ('open', 'investigating', 'identified', 'monitoring', 'resolved'));

-- Add constraint for reasonable timeout values
ALTER TABLE "endpoint" ADD CONSTRAINT chk_endpoint_timeout_range
CHECK (timeout_seconds > 0 AND timeout_seconds <= 300);

-- Add constraint for reasonable check intervals
ALTER TABLE "endpoint" ADD CONSTRAINT chk_endpoint_interval_range
CHECK (check_interval_seconds >= 1);

-- Add constraint for valid response times (should be positive)
ALTER TABLE "monitoring_log" ADD CONSTRAINT chk_monitoring_log_response_time
CHECK (response_time_ms IS NULL OR response_time_ms >= 0);

-- Add partial index for enabled endpoints only (frequently queried)
CREATE INDEX IF NOT EXISTS idx_endpoint_enabled_true
ON "endpoint"(id, name, url, check_interval_seconds) WHERE enabled = true;

-- Add partial index for failed monitoring logs (important for alerting)
CREATE INDEX IF NOT EXISTS idx_monitoring_log_failures
ON "monitoring_log"(endpoint_id, timestamp DESC, error_message) WHERE success = false;

-- Add partial index for open incidents (frequently queried)
CREATE INDEX IF NOT EXISTS idx_incident_open
ON "incident"(severity, start_time DESC) WHERE status != 'resolved';

-- Create a view for endpoint health summary
CREATE OR REPLACE VIEW endpoint_health_summary AS
SELECT
    e.id,
    e.name,
    e.url,
    e.enabled,
    COUNT(ml.id) as total_checks,
    COUNT(CASE WHEN ml.success = true THEN 1 END) as successful_checks,
    COUNT(CASE WHEN ml.success = false THEN 1 END) as failed_checks,
    ROUND(
        (COUNT(CASE WHEN ml.success = true THEN 1 END)::decimal / NULLIF(COUNT(ml.id), 0)) * 100,
        2
    ) as uptime_percentage,
    AVG(ml.response_time_ms) as avg_response_time_ms,
    MAX(ml.timestamp) as last_check_time
FROM "endpoint" e
LEFT JOIN "monitoring_log" ml ON e.id = ml.endpoint_id
    AND ml.timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY e.id, e.name, e.url, e.enabled;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Drop constraints and indexes
DROP VIEW IF EXISTS endpoint_health_summary;
DROP INDEX IF EXISTS idx_endpoint_enabled_true;
DROP INDEX IF EXISTS idx_monitoring_log_failures;
DROP INDEX IF EXISTS idx_incident_open;
DROP INDEX IF EXISTS idx_monitoring_log_endpoint_success_timestamp;
DROP INDEX IF EXISTS idx_monitoring_log_timestamp_success;

ALTER TABLE "incident" DROP CONSTRAINT IF EXISTS chk_incident_end_after_start;
ALTER TABLE "endpoint_incident" DROP CONSTRAINT IF EXISTS chk_endpoint_incident_end_after_start;
ALTER TABLE "endpoint" DROP CONSTRAINT IF EXISTS chk_endpoint_valid_method;
ALTER TABLE "incident" DROP CONSTRAINT IF EXISTS chk_incident_valid_severity;
ALTER TABLE "incident" DROP CONSTRAINT IF EXISTS chk_incident_valid_status;
ALTER TABLE "endpoint" DROP CONSTRAINT IF EXISTS chk_endpoint_timeout_range;
ALTER TABLE "endpoint" DROP CONSTRAINT IF EXISTS chk_endpoint_interval_range;
ALTER TABLE "monitoring_log" DROP CONSTRAINT IF EXISTS chk_monitoring_log_response_time;
-- +goose StatementEnd
