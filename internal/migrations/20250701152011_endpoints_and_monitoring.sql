-- +goose Up
-- +goose StatementBegin
-- Create endpoints table for monitoring targets
CREATE TABLE IF NOT EXISTS "endpoint" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    url VARCHAR(2048) NOT NULL,
    method VARCHAR(10) DEFAULT 'GET' CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')),
    headers JSONB DEFAULT '{}',
    body TEXT DEFAULT '',
    expected_status_code INTEGER DEFAULT 200,
    timeout_seconds INTEGER DEFAULT 30 CHECK (timeout_seconds > 0 AND timeout_seconds <= 300),
    check_interval_seconds INTEGER DEFAULT 300 CHECK (check_interval_seconds >= 60),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monitoring_logs table for storing check results
CREATE TABLE IF NOT EXISTS "monitoring_log" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID NOT NULL REFERENCES "endpoint"(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    success BOOLEAN NOT NULL,
    response_body_sample TEXT, -- Store first 1000 chars of response for debugging
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_endpoint_enabled ON "endpoint"(enabled);
CREATE INDEX IF NOT EXISTS idx_endpoint_url ON "endpoint"(url);
CREATE INDEX IF NOT EXISTS idx_monitoring_log_endpoint_id ON "monitoring_log"(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_log_timestamp ON "monitoring_log"(timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_log_success ON "monitoring_log"(success);
CREATE INDEX IF NOT EXISTS idx_monitoring_log_endpoint_timestamp ON "monitoring_log"(endpoint_id, timestamp);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "monitoring_log";
DROP TABLE IF EXISTS "endpoint";
-- +goose StatementEnd
