-- Add old_page_name column to store legacy URL slugs for redirects
ALTER TABLE schools ADD COLUMN old_page_name TEXT;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_schools_old_page_name ON schools(old_page_name);
