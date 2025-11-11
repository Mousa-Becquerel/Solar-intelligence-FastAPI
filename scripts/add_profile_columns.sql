-- Add profile-related columns to User table
-- Run this script in your PostgreSQL database

-- Add plan_type column (free or premium)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'free';

-- Add query_count column (total queries made)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS query_count INTEGER DEFAULT 0;

-- Add last_query_date column
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_query_date TIMESTAMP;

-- Add plan_start_date column
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMP;

-- Add plan_end_date column (for premium subscriptions)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS plan_end_date TIMESTAMP;

-- Add monthly_query_count column (queries this month)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS monthly_query_count INTEGER DEFAULT 0;

-- Add last_reset_date column (when monthly count was last reset)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user'
AND column_name IN ('plan_type', 'query_count', 'last_query_date', 'plan_start_date', 'plan_end_date', 'monthly_query_count', 'last_reset_date')
ORDER BY column_name;
