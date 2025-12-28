-- Newsletter subscriptions table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    categories TEXT NOT NULL,  -- Comma-separated list of subscribed categories
    status TEXT NOT NULL DEFAULT 'active',  -- 'active', 'unsubscribed'
    ip_hash TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscriptions(status);
