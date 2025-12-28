-- Federal Education Grants and Financial Aid Programs
-- Data source: SAM.gov Assistance Listings (formerly CFDA)

CREATE TABLE IF NOT EXISTS federal_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cfda_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  popular_name TEXT,
  agency TEXT,
  objectives TEXT,
  assistance_type TEXT,
  beneficiary_eligibility TEXT,
  website TEXT,
  deadlines TEXT,

  -- Categorization flags
  is_student_aid INTEGER DEFAULT 0,      -- Direct student financial aid (Pell, FSEOG, Work-Study, etc.)
  is_higher_ed INTEGER DEFAULT 0,        -- Higher education related
  is_k12 INTEGER DEFAULT 0,              -- K-12 education related
  is_career_tech INTEGER DEFAULT 0,      -- Career and technical education
  is_special_ed INTEGER DEFAULT 0,       -- Special education

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_federal_grants_cfda ON federal_grants(cfda_number);
CREATE INDEX IF NOT EXISTS idx_federal_grants_student_aid ON federal_grants(is_student_aid);
CREATE INDEX IF NOT EXISTS idx_federal_grants_higher_ed ON federal_grants(is_higher_ed);

-- Insert key student financial aid programs with full details
INSERT OR REPLACE INTO federal_grants (cfda_number, title, popular_name, agency, objectives, assistance_type, beneficiary_eligibility, website, is_student_aid, is_higher_ed) VALUES
('84.063', 'Federal Pell Grant Program', 'Pell Grant', 'Office of Federal Student Aid, Department of Education',
'To provide need-based grants to low-income undergraduate and certain post-baccalaureate students to promote access to postsecondary education. Students may use their grants at any participating institution.',
'DIRECT PAYMENTS FOR SPECIFIED USE',
'Undergraduate students enrolled or accepted for enrollment in a program leading to a first bachelor''s degree or a program of study that is at least one academic year in length and is a prerequisite for a program at the school leading to a degree. Must be a U.S. citizen or eligible noncitizen, have financial need, and maintain satisfactory academic progress.',
'https://studentaid.gov/understand-aid/types/grants/pell', 1, 1),

('84.007', 'Federal Supplemental Educational Opportunity Grants', 'FSEOG', 'Office of Federal Student Aid, Department of Education',
'To provide need-based grant aid to eligible undergraduate postsecondary students to help meet educational expenses. Priority given to Pell Grant recipients with exceptional financial need.',
'DIRECT PAYMENTS FOR SPECIFIED USE',
'Undergraduate students enrolled or accepted for enrollment as regular students; maintaining satisfactory academic progress; have exceptional financial need; do not owe a refund on a Title IV grant; are not in default on a Title IV loan.',
'https://studentaid.gov/understand-aid/types/grants/fseog', 1, 1),

('84.033', 'Federal Work-Study Program', 'FWS', 'Office of Federal Student Aid, Department of Education',
'To provide part-time employment to eligible undergraduate and graduate students to help meet educational expenses and encourage students receiving program assistance to participate in community service activities.',
'DIRECT PAYMENTS FOR SPECIFIED USE',
'Undergraduate, graduate, and professional students with financial need who are enrolled or accepted for enrollment as regular students and maintaining satisfactory academic progress.',
'https://studentaid.gov/understand-aid/types/work-study', 1, 1),

('84.268', 'Federal Direct Student Loans', 'Direct Loans, Stafford Loans', 'Office of Federal Student Aid, Department of Education',
'To provide low-interest loans to eligible students (and parents of dependent undergraduate students) to help meet the costs of postsecondary education. Includes Direct Subsidized Loans, Direct Unsubsidized Loans, Direct PLUS Loans, and Direct Consolidation Loans.',
'DIRECT LOANS',
'Students enrolled at least half-time in eligible programs at participating schools. For subsidized loans, must demonstrate financial need. Graduate students and parents of dependent undergraduates may borrow PLUS loans.',
'https://studentaid.gov/understand-aid/types/loans', 1, 1),

('84.379', 'Teacher Education Assistance for College and Higher Education Grants', 'TEACH Grant', 'Office of Federal Student Aid, Department of Education',
'To provide grants to students who intend to teach in high-need fields in public or private elementary or secondary schools that serve low-income students. Recipients must fulfill a service obligation or the grant converts to a loan.',
'DIRECT PAYMENTS FOR SPECIFIED USE',
'Students enrolled in TEACH Grant-eligible programs who agree to teach for at least four years in a high-need field at a low-income school. Must maintain a 3.25 GPA.',
'https://studentaid.gov/understand-aid/types/grants/teach', 1, 1),

('84.408', 'Postsecondary Education Scholarships for Veteran''s Dependents', 'Iraq and Afghanistan Service Grant', 'Office of Federal Student Aid, Department of Education',
'To provide grant aid to students whose parent or guardian died as a result of military service in Iraq or Afghanistan after September 11, 2001.',
'DIRECT PAYMENTS FOR SPECIFIED USE',
'Students who are not Pell-eligible only due to EFC; whose parent or guardian was a member of the Armed Forces and died in Iraq or Afghanistan after 9/11; and were under 24 years old or enrolled at an eligible institution when parent or guardian died.',
'https://studentaid.gov/understand-aid/types/grants/iraq-afghanistan-service', 1, 1),

('84.042', 'TRIO Student Support Services', 'SSS', 'Office of Postsecondary Education, Department of Education',
'To increase college retention and graduation rates of eligible students; to increase the transfer rate of eligible students from two-year to four-year institutions; and to foster an institutional climate supportive of the success of students who are limited English proficient, students from groups that are traditionally underrepresented in postsecondary education, students with disabilities, students who are homeless children and youths, students who are in foster care or are aging out of the foster care system, or other disconnected students.',
'PROJECT GRANTS',
'First-generation college students, low-income individuals, and students with disabilities enrolled at participating institutions.',
'https://www2.ed.gov/programs/triostudsupp/index.html', 1, 1),

('84.044', 'TRIO Talent Search', 'TS', 'Office of Postsecondary Education, Department of Education',
'To identify qualified youths with potential for postsecondary education, encourage them to complete secondary school and enroll in postsecondary education, and publicize availability of student financial assistance.',
'PROJECT GRANTS',
'Individuals aged 11-27 who have completed grade 5 and meet low-income and/or first-generation criteria, or veterans who do not meet the age requirement.',
'https://www2.ed.gov/programs/triotalent/index.html', 0, 1),

('84.047', 'TRIO Upward Bound', 'UB', 'Office of Postsecondary Education, Department of Education',
'To generate skills and motivation necessary for success in education beyond high school among low-income, first-generation college students and veterans.',
'PROJECT GRANTS',
'High school students from low-income families, potential first-generation college students, and veterans. Students must have a need for academic support.',
'https://www2.ed.gov/programs/trioupbound/index.html', 0, 1),

('84.066', 'TRIO Educational Opportunity Centers', 'EOC', 'Office of Postsecondary Education, Department of Education',
'To provide information and assistance to adults desiring to enter or continue a program of postsecondary education, and assistance in applying for admission and for student financial aid.',
'PROJECT GRANTS',
'Adults who desire to enter or continue postsecondary education programs. Priority is given to low-income individuals and first-generation college students.',
'https://www2.ed.gov/programs/trioeoc/index.html', 0, 1),

('84.334', 'Gaining Early Awareness and Readiness for Undergraduate Programs', 'GEAR UP', 'Office of Postsecondary Education, Department of Education',
'To increase the number of low-income students who are prepared to enter and succeed in postsecondary education. Provides six-year grants to states and partnerships to provide services at high-poverty middle and high schools.',
'PROJECT GRANTS',
'Students in participating schools (grades 7 through 12) and their families. Scholarships may be provided to participating students who enroll in postsecondary education.',
'https://www2.ed.gov/programs/gearup/index.html', 0, 1);
