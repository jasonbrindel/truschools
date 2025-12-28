-- FAFSA Federal School Codes
-- Source: https://fsapartners.ed.gov/knowledge-center/library/resource-type/Federal%20School%20Code%20Lists
-- This table contains the official Federal School Codes used on FAFSA applications

CREATE TABLE IF NOT EXISTS fafsa_school_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_code TEXT NOT NULL UNIQUE,
  school_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state_code TEXT,
  zip_code TEXT,
  province TEXT,
  country TEXT,
  postal_code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fafsa_school_code ON fafsa_school_codes(school_code);
CREATE INDEX IF NOT EXISTS idx_fafsa_state_code ON fafsa_school_codes(state_code);
CREATE INDEX IF NOT EXISTS idx_fafsa_school_name ON fafsa_school_codes(school_name);
CREATE INDEX IF NOT EXISTS idx_fafsa_city_state ON fafsa_school_codes(city, state_code);
