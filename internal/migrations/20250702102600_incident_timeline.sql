-- +goose Up
-- +goose StatementBegin
-- Create incident timeline table for tracking status changes and updates
CREATE TABLE IF NOT EXISTS "incident_timeline" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES "incident"(id) ON DELETE CASCADE,
    user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('status_change', 'update', 'comment', 'endpoint_associated', 'endpoint_removed', 'created', 'resolved')),
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident_id ON "incident_timeline"(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_timeline_created_at ON "incident_timeline"(created_at);
CREATE INDEX IF NOT EXISTS idx_incident_timeline_event_type ON "incident_timeline"(event_type);
CREATE INDEX IF NOT EXISTS idx_incident_timeline_user_id ON "incident_timeline"(user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "incident_timeline";
-- +goose StatementEnd