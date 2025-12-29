-- Add unique constraint to prevent duplicate votes from same session
-- SQLite doesn't support ADD CONSTRAINT, so we create a unique index instead

CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_responses_unique_vote
ON qa_responses(question_id, session_id)
WHERE session_id IS NOT NULL;
