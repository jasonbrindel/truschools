-- Q&A Poll Responses table
-- Stores user responses to poll questions on school pages

CREATE TABLE IF NOT EXISTS qa_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Question identification
  question_id TEXT NOT NULL,           -- Unique identifier for the question (e.g., "schools-important-factor")
  page_slug TEXT NOT NULL,             -- Page where the question appears (e.g., "schools", "elementary-schools")

  -- Question and answer content
  question_text TEXT NOT NULL,         -- The actual question text
  answer_text TEXT NOT NULL,           -- The answer the user selected

  -- User tracking (anonymous)
  session_id TEXT,                     -- Optional session ID to prevent duplicate votes
  ip_hash TEXT,                        -- Hashed IP for basic duplicate prevention
  user_agent TEXT,                     -- Browser info for analytics

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_qa_responses_question_id ON qa_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_qa_responses_page_slug ON qa_responses(page_slug);
CREATE INDEX IF NOT EXISTS idx_qa_responses_created_at ON qa_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_qa_responses_session ON qa_responses(session_id);

-- View for aggregated results
CREATE VIEW IF NOT EXISTS qa_response_stats AS
SELECT
  question_id,
  page_slug,
  question_text,
  answer_text,
  COUNT(*) as vote_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY question_id), 1) as percentage
FROM qa_responses
GROUP BY question_id, answer_text
ORDER BY question_id, vote_count DESC;
