-- TrueSchools Database Schema for Cloudflare D1
-- Initial migration: Core tables

-- Schools table (K-12)
CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_name TEXT NOT NULL,
  page_name TEXT NOT NULL,
  nces_id TEXT,

  -- School type flags
  is_public INTEGER DEFAULT 1,
  is_charter INTEGER DEFAULT 0,
  is_magnet INTEGER DEFAULT 0,
  is_high_school INTEGER DEFAULT 0,
  is_middle_school INTEGER DEFAULT 0,
  is_elementary INTEGER DEFAULT 0,
  is_kindergarten INTEGER DEFAULT 0,
  is_preschool INTEGER DEFAULT 0,

  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  state_abbr TEXT,
  zip TEXT,
  zip4 TEXT,
  county TEXT,
  lat REAL,
  lng REAL,
  locale TEXT,

  -- Contact
  phone TEXT,
  website TEXT,

  -- District info
  district_name TEXT,
  district_nces_id TEXT,

  -- Enrollment
  total_students INTEGER,
  pk_students INTEGER,
  k_students INTEGER,
  g1_students INTEGER,
  g2_students INTEGER,
  g3_students INTEGER,
  g4_students INTEGER,
  g5_students INTEGER,
  g6_students INTEGER,
  g7_students INTEGER,
  g8_students INTEGER,
  g9_students INTEGER,
  g10_students INTEGER,
  g11_students INTEGER,
  g12_students INTEGER,
  ungraded_students INTEGER,

  -- Demographics
  male_students INTEGER,
  female_students INTEGER,
  white_students INTEGER,
  black_students INTEGER,
  hispanic_students INTEGER,
  asian_students INTEGER,
  native_american_students INTEGER,
  pacific_islander_students INTEGER,
  multiracial_students INTEGER,

  -- Lunch program (economic indicator)
  free_lunch_students INTEGER,
  reduced_lunch_students INTEGER,

  -- Staff
  pupil_teacher_ratio REAL,
  fte_teachers REAL,

  -- Grade levels
  low_grade TEXT,
  high_grade TEXT,
  school_level TEXT,

  -- Status
  operational_status TEXT,
  active INTEGER DEFAULT 1,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for schools
CREATE INDEX IF NOT EXISTS idx_schools_state ON schools(state_abbr);
CREATE INDEX IF NOT EXISTS idx_schools_city ON schools(city);
CREATE INDEX IF NOT EXISTS idx_schools_zip ON schools(zip);
CREATE INDEX IF NOT EXISTS idx_schools_page_name ON schools(page_name);
CREATE INDEX IF NOT EXISTS idx_schools_nces_id ON schools(nces_id);
CREATE INDEX IF NOT EXISTS idx_schools_is_public ON schools(is_public);
CREATE INDEX IF NOT EXISTS idx_schools_is_charter ON schools(is_charter);
CREATE INDEX IF NOT EXISTS idx_schools_is_magnet ON schools(is_magnet);
CREATE INDEX IF NOT EXISTS idx_schools_school_level ON schools(school_level);

-- Colleges/Universities table
CREATE TABLE IF NOT EXISTS colleges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER,
  institution_name TEXT NOT NULL,
  page_name TEXT NOT NULL,
  aliases TEXT,

  -- Classification
  sector TEXT,
  control TEXT,
  institution_level TEXT,
  hbcu INTEGER DEFAULT 0,

  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  state_abbr TEXT,
  zip TEXT,
  county TEXT,
  lat REAL,
  lng REAL,
  locale TEXT,

  -- Contact
  phone TEXT,
  website TEXT,
  admissions_url TEXT,
  financial_aid_url TEXT,
  application_url TEXT,

  -- Enrollment
  total_enrollment INTEGER,
  enrollment_ft INTEGER,
  enrollment_pt INTEGER,
  undergraduate_enrollment INTEGER,
  graduate_enrollment INTEGER,
  pct_female INTEGER,
  pct_white INTEGER,
  pct_black INTEGER,
  pct_hispanic INTEGER,
  pct_asian INTEGER,
  pct_native_american INTEGER,

  -- Retention & graduation
  retention_rate_ft INTEGER,
  retention_rate_pt INTEGER,
  graduation_rate INTEGER,

  -- Costs
  tuition_in_state INTEGER,
  tuition_out_state INTEGER,

  -- Degrees offered
  offers_doctoral INTEGER DEFAULT 0,
  offers_masters INTEGER DEFAULT 0,
  offers_bachelors INTEGER DEFAULT 0,
  offers_associates INTEGER DEFAULT 0,
  offers_certificate INTEGER DEFAULT 0,

  -- Financial aid
  pct_receiving_aid INTEGER,
  avg_grant_aid INTEGER,
  avg_pell_grant INTEGER,
  avg_federal_grant INTEGER,
  avg_loan_amount INTEGER,

  -- Staff
  student_faculty_ratio INTEGER,
  total_staff INTEGER,

  -- Status
  active INTEGER DEFAULT 1,
  closed_date TEXT,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for colleges
CREATE INDEX IF NOT EXISTS idx_colleges_state ON colleges(state_abbr);
CREATE INDEX IF NOT EXISTS idx_colleges_city ON colleges(city);
CREATE INDEX IF NOT EXISTS idx_colleges_page_name ON colleges(page_name);
CREATE INDEX IF NOT EXISTS idx_colleges_unit_id ON colleges(unit_id);
CREATE INDEX IF NOT EXISTS idx_colleges_sector ON colleges(sector);
CREATE INDEX IF NOT EXISTS idx_colleges_control ON colleges(control);

-- States reference table
CREATE TABLE IF NOT EXISTS states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  abbr TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

-- Cities reference table
CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  state_abbr TEXT NOT NULL,
  state_name TEXT NOT NULL,
  UNIQUE(slug, state_abbr)
);

CREATE INDEX IF NOT EXISTS idx_cities_state ON cities(state_abbr);
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);

-- Insert all US states
INSERT OR IGNORE INTO states (abbr, name, slug) VALUES
  ('AL', 'Alabama', 'alabama'),
  ('AK', 'Alaska', 'alaska'),
  ('AZ', 'Arizona', 'arizona'),
  ('AR', 'Arkansas', 'arkansas'),
  ('CA', 'California', 'california'),
  ('CO', 'Colorado', 'colorado'),
  ('CT', 'Connecticut', 'connecticut'),
  ('DE', 'Delaware', 'delaware'),
  ('DC', 'District of Columbia', 'district-of-columbia'),
  ('FL', 'Florida', 'florida'),
  ('GA', 'Georgia', 'georgia'),
  ('HI', 'Hawaii', 'hawaii'),
  ('ID', 'Idaho', 'idaho'),
  ('IL', 'Illinois', 'illinois'),
  ('IN', 'Indiana', 'indiana'),
  ('IA', 'Iowa', 'iowa'),
  ('KS', 'Kansas', 'kansas'),
  ('KY', 'Kentucky', 'kentucky'),
  ('LA', 'Louisiana', 'louisiana'),
  ('ME', 'Maine', 'maine'),
  ('MD', 'Maryland', 'maryland'),
  ('MA', 'Massachusetts', 'massachusetts'),
  ('MI', 'Michigan', 'michigan'),
  ('MN', 'Minnesota', 'minnesota'),
  ('MS', 'Mississippi', 'mississippi'),
  ('MO', 'Missouri', 'missouri'),
  ('MT', 'Montana', 'montana'),
  ('NE', 'Nebraska', 'nebraska'),
  ('NV', 'Nevada', 'nevada'),
  ('NH', 'New Hampshire', 'new-hampshire'),
  ('NJ', 'New Jersey', 'new-jersey'),
  ('NM', 'New Mexico', 'new-mexico'),
  ('NY', 'New York', 'new-york'),
  ('NC', 'North Carolina', 'north-carolina'),
  ('ND', 'North Dakota', 'north-dakota'),
  ('OH', 'Ohio', 'ohio'),
  ('OK', 'Oklahoma', 'oklahoma'),
  ('OR', 'Oregon', 'oregon'),
  ('PA', 'Pennsylvania', 'pennsylvania'),
  ('RI', 'Rhode Island', 'rhode-island'),
  ('SC', 'South Carolina', 'south-carolina'),
  ('SD', 'South Dakota', 'south-dakota'),
  ('TN', 'Tennessee', 'tennessee'),
  ('TX', 'Texas', 'texas'),
  ('UT', 'Utah', 'utah'),
  ('VT', 'Vermont', 'vermont'),
  ('VA', 'Virginia', 'virginia'),
  ('WA', 'Washington', 'washington'),
  ('WV', 'West Virginia', 'west-virginia'),
  ('WI', 'Wisconsin', 'wisconsin'),
  ('WY', 'Wyoming', 'wyoming');
