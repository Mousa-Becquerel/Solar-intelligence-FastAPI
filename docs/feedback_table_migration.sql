-- Migration: Add Feedback table to PostgreSQL database
-- Date: 2025-10-02
-- Description: Creates feedback table for storing user feedback submissions

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES "user"(id),
    rating INTEGER NOT NULL,
    feedback_text TEXT,
    allow_followup BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(256),

    -- Constraints
    CONSTRAINT feedback_rating_check CHECK (rating >= 1 AND rating <= 5)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Verify table creation
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_name = 'feedback'
ORDER BY
    ordinal_position;

-- Check if table is empty (expected after migration)
SELECT COUNT(*) as feedback_count FROM feedback;
