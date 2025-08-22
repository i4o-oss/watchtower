-- +goose Up
-- +goose StatementBegin
-- Create settings table for application configuration
CREATE TABLE IF NOT EXISTS "settings" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_name VARCHAR(255) NOT NULL DEFAULT 'Watchtower',
    description TEXT DEFAULT '',
    domain VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings record (should only be one)
INSERT INTO "settings" (site_name, description) 
VALUES ('Watchtower', 'Real-time service status and uptime monitoring')
ON CONFLICT DO NOTHING;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "settings";
-- +goose StatementEnd