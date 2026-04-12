CREATE TABLE IF NOT EXISTS operator_credentials (
    id UUID PRIMARY KEY,
    role staff_role NOT NULL,
    login_id TEXT NOT NULL UNIQUE,
    secret_hash TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_credentials_role_active
    ON operator_credentials (role, active);

CREATE TABLE IF NOT EXISTS operator_sessions (
    id UUID PRIMARY KEY,
    credential_id UUID NOT NULL REFERENCES operator_credentials(id) ON DELETE CASCADE,
    role staff_role NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_sessions_token_active
    ON operator_sessions (session_token, active);

ALTER TABLE staff_users
    ADD COLUMN IF NOT EXISTS login_id TEXT,
    ADD COLUMN IF NOT EXISTS password_hash TEXT;
