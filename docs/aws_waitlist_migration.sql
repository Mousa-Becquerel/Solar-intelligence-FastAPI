-- Manual migration for AWS RDS PostgreSQL database
-- This adds the interested_agents column to the waitlist table

-- Step 1: Check if the column already exists
-- Run this first to verify:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'waitlist'
ORDER BY ordinal_position;

-- Step 2: Add the interested_agents column if it doesn't exist
-- This is safe to run multiple times (will error if column exists, but won't break anything)
ALTER TABLE waitlist
ADD COLUMN interested_agents TEXT;

-- Step 3: Verify the column was added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'waitlist'
  AND column_name = 'interested_agents';

-- Expected output:
-- column_name         | data_type | is_nullable
-- interested_agents  | text      | YES
