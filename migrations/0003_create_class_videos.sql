-- Create class_videos table
CREATE TABLE IF NOT EXISTS class_videos (
  class_id INTEGER PRIMARY KEY,
  dept TEXT,
  course TEXT,
  class TEXT,
  dept_page TEXT,
  course_page TEXT,
  class_page TEXT,
  class_order INTEGER,
  class_tagline TEXT,
  class_description TEXT,
  tags TEXT,
  author TEXT,
  author_tagline TEXT,
  author_web TEXT,
  author_description TEXT,
  author_citation TEXT,
  embed_url TEXT
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_class_videos_dept_page ON class_videos(dept_page);
CREATE INDEX IF NOT EXISTS idx_class_videos_course_page ON class_videos(course_page);
CREATE INDEX IF NOT EXISTS idx_class_videos_class_page ON class_videos(class_page);
