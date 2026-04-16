DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'payment_session_status'
    ) THEN
        CREATE TYPE payment_session_status AS ENUM ('pending', 'confirmed', 'expired', 'cancelled');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS payment_sessions (
    id UUID PRIMARY KEY,
    session_token TEXT NOT NULL UNIQUE,
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    table_name_snapshot TEXT NOT NULL,
    table_number_snapshot INTEGER,
    tracking_token_snapshot TEXT,
    amount_total BIGINT NOT NULL CHECK (amount_total >= 0),
    currency_code TEXT NOT NULL,
    payment_provider TEXT NOT NULL,
    payment_mode TEXT NOT NULL,
    payment_label TEXT NOT NULL,
    reference_code TEXT NOT NULL,
    status payment_session_status NOT NULL DEFAULT 'pending',
    confirmed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_table_status
    ON payment_sessions(table_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_token
    ON payment_sessions(session_token);
