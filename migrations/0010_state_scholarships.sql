-- State Scholarship Programs
-- Data source: NASSGAP Annual Survey (nassgapsurvey.com)

CREATE TABLE IF NOT EXISTS state_scholarships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  state TEXT NOT NULL,
  program_name TEXT NOT NULL,
  expenditures INTEGER,  -- Total program expenditures in dollars
  recipients INTEGER,    -- Number of recipients
  lottery_funding INTEGER, -- Amount funded by lottery (if applicable)

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(year, state, program_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_state_scholarships_state ON state_scholarships(state);
CREATE INDEX IF NOT EXISTS idx_state_scholarships_year ON state_scholarships(year);
CREATE INDEX IF NOT EXISTS idx_state_scholarships_program ON state_scholarships(program_name);

-- State grant totals by year (aggregated from NASSGAP Table 1)
CREATE TABLE IF NOT EXISTS state_grant_totals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  state TEXT NOT NULL,
  need_based_undergrad INTEGER,     -- Need-based grants for undergraduates
  need_based_grad INTEGER,          -- Need-based grants for graduates
  need_based_uncategorized INTEGER, -- Need-based grants uncategorized
  non_need_undergrad INTEGER,       -- Non-need-based grants for undergraduates
  non_need_grad INTEGER,            -- Non-need-based grants for graduates
  non_need_uncategorized INTEGER,   -- Non-need-based grants uncategorized
  total_grant_aid INTEGER,          -- Total grant aid

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(year, state)
);

CREATE INDEX IF NOT EXISTS idx_state_grant_totals_state ON state_grant_totals(state);
CREATE INDEX IF NOT EXISTS idx_state_grant_totals_year ON state_grant_totals(year);
