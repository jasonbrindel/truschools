-- Error logging table for tracking application errors
CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT,
  method TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type TEXT,
  url TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  extra_data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index for querying recent errors
CREATE INDEX IF NOT EXISTS idx_error_log_created_at ON error_log(created_at DESC);

-- Index for filtering by endpoint
CREATE INDEX IF NOT EXISTS idx_error_log_endpoint ON error_log(endpoint);
