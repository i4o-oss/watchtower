-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN name VARCHAR(255) DEFAULT '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users
DROP COLUMN IF EXISTS password,
DROP COLUMN IF EXISTS name;
-- +goose StatementEnd
