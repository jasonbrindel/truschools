-- Add old_page_name column to colleges for legacy URL redirects
ALTER TABLE colleges ADD COLUMN old_page_name TEXT;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_colleges_old_page_name ON colleges(old_page_name);
