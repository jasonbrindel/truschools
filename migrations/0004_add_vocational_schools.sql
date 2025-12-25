-- Migration: Add vocational schools support
-- Adds institution_category and vocational_type fields to colleges table

-- Add institution_category to distinguish between colleges and vocational schools
-- Values: 'college' (4-year), 'community_college' (2-year), 'vocational' (less-than-2-year)
ALTER TABLE colleges ADD COLUMN institution_category TEXT DEFAULT 'college';

-- Add vocational_type for subcategorization of vocational schools
-- Values: 'beauty', 'trade', 'healthcare', 'technology', 'other'
ALTER TABLE colleges ADD COLUMN vocational_type TEXT;

-- Add ICLEVEL from IPEDS (1=4-year, 2=2-year, 3=less-than-2-year)
ALTER TABLE colleges ADD COLUMN iclevel INTEGER;

-- Add program-specific fields useful for vocational schools
ALTER TABLE colleges ADD COLUMN program_length TEXT;  -- e.g., "12 months", "600 hours"
ALTER TABLE colleges ADD COLUMN accreditation TEXT;
ALTER TABLE colleges ADD COLUMN job_placement_rate INTEGER;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_colleges_institution_category ON colleges(institution_category);
CREATE INDEX IF NOT EXISTS idx_colleges_vocational_type ON colleges(vocational_type);
CREATE INDEX IF NOT EXISTS idx_colleges_iclevel ON colleges(iclevel);

-- Update existing colleges with their category based on sector
-- 4-year institutions
UPDATE colleges SET institution_category = 'college', iclevel = 1
WHERE sector LIKE '%4-year%' OR is_four_year = 1;

-- 2-year institutions
UPDATE colleges SET institution_category = 'community_college', iclevel = 2
WHERE (sector LIKE '%2-year%' OR is_two_year = 1) AND institution_category = 'college';
