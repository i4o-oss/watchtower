-- +goose Up
-- +goose StatementBegin
-- Create incidents table for tracking system incidents
CREATE TABLE IF NOT EXISTS "incident" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'identified', 'monitoring', 'resolved')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create endpoint_incidents junction table to link incidents with affected endpoints
CREATE TABLE IF NOT EXISTS "endpoint_incident" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID NOT NULL REFERENCES "endpoint"(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES "incident"(id) ON DELETE CASCADE,
    affected_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    affected_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(endpoint_id, incident_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incident_status ON "incident"(status);
CREATE INDEX IF NOT EXISTS idx_incident_severity ON "incident"(severity);
CREATE INDEX IF NOT EXISTS idx_incident_start_time ON "incident"(start_time);
CREATE INDEX IF NOT EXISTS idx_incident_created_by ON "incident"(created_by);
CREATE INDEX IF NOT EXISTS idx_endpoint_incident_endpoint_id ON "endpoint_incident"(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_incident_incident_id ON "endpoint_incident"(incident_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_incident_affected_start ON "endpoint_incident"(affected_start);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "endpoint_incident";
DROP TABLE IF EXISTS "incident";
-- +goose StatementEnd
