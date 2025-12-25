-- scorecard_json: All College Scorecard data with JSON fields
-- Generated: 2025-12-24T15:57:17.005Z
-- Total source columns: 3306

DROP TABLE IF EXISTS scorecard_json;

CREATE TABLE scorecard_json (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unitid TEXT NOT NULL UNIQUE,
  opeid TEXT,
  opeid6 TEXT,
  basics TEXT,        -- JSON: name, location, type, accreditation
  designations TEXT,  -- JSON: HBCU, HSI, etc.
  costs TEXT,         -- JSON: tuition, net prices, aid
  admissions TEXT,    -- JSON: acceptance rate, test scores
  demographics TEXT,  -- JSON: enrollment, race/ethnicity
  completion TEXT,    -- JSON: graduation rates, retention
  programs TEXT,      -- JSON: PCIP percentages by field
  earnings TEXT,      -- JSON: median earnings by year
  debt TEXT,          -- JSON: debt levels, repayment
  cohort TEXT,        -- JSON: detailed cohort tracking
  other TEXT          -- JSON: all remaining columns
);

CREATE INDEX idx_scorecard_json_unitid ON scorecard_json(unitid);
CREATE INDEX idx_scorecard_json_opeid ON scorecard_json(opeid);
