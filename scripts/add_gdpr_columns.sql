-- AWS Database Migration Script
-- Adds missing GDPR columns to the User table for Solar Intelligence Platform

BEGIN;

-- Add GDPR consent columns if they don't exist
DO $$
BEGIN
    -- gdpr_consent_given
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'gdpr_consent_given') THEN
        ALTER TABLE "user" ADD COLUMN gdpr_consent_given BOOLEAN DEFAULT FALSE NOT NULL;
        RAISE NOTICE 'Added column: gdpr_consent_given';
    ELSE
        RAISE NOTICE 'Column gdpr_consent_given already exists';
    END IF;

    -- gdpr_consent_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'gdpr_consent_date') THEN
        ALTER TABLE "user" ADD COLUMN gdpr_consent_date TIMESTAMP;
        RAISE NOTICE 'Added column: gdpr_consent_date';
    ELSE
        RAISE NOTICE 'Column gdpr_consent_date already exists';
    END IF;

    -- terms_accepted
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'terms_accepted') THEN
        ALTER TABLE "user" ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE NOT NULL;
        RAISE NOTICE 'Added column: terms_accepted';
    ELSE
        RAISE NOTICE 'Column terms_accepted already exists';
    END IF;

    -- terms_accepted_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'terms_accepted_date') THEN
        ALTER TABLE "user" ADD COLUMN terms_accepted_date TIMESTAMP;
        RAISE NOTICE 'Added column: terms_accepted_date';
    ELSE
        RAISE NOTICE 'Column terms_accepted_date already exists';
    END IF;

    -- marketing_consent
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'marketing_consent') THEN
        ALTER TABLE "user" ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE NOT NULL;
        RAISE NOTICE 'Added column: marketing_consent';
    ELSE
        RAISE NOTICE 'Column marketing_consent already exists';
    END IF;

    -- marketing_consent_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'marketing_consent_date') THEN
        ALTER TABLE "user" ADD COLUMN marketing_consent_date TIMESTAMP;
        RAISE NOTICE 'Added column: marketing_consent_date';
    ELSE
        RAISE NOTICE 'Column marketing_consent_date already exists';
    END IF;

    -- privacy_policy_version
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'privacy_policy_version') THEN
        ALTER TABLE "user" ADD COLUMN privacy_policy_version VARCHAR(10) DEFAULT '1.0';
        RAISE NOTICE 'Added column: privacy_policy_version';
    ELSE
        RAISE NOTICE 'Column privacy_policy_version already exists';
    END IF;

    -- terms_version
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'terms_version') THEN
        ALTER TABLE "user" ADD COLUMN terms_version VARCHAR(10) DEFAULT '1.0';
        RAISE NOTICE 'Added column: terms_version';
    ELSE
        RAISE NOTICE 'Column terms_version already exists';
    END IF;
END$$;

-- Update existing users with default GDPR values
UPDATE "user" 
SET 
    gdpr_consent_given = COALESCE(gdpr_consent_given, FALSE),
    terms_accepted = COALESCE(terms_accepted, FALSE),
    marketing_consent = COALESCE(marketing_consent, FALSE),
    privacy_policy_version = COALESCE(privacy_policy_version, '1.0'),
    terms_version = COALESCE(terms_version, '1.0')
WHERE 
    gdpr_consent_given IS NULL 
    OR terms_accepted IS NULL 
    OR marketing_consent IS NULL
    OR privacy_policy_version IS NULL
    OR terms_version IS NULL;

-- Verify the migration
SELECT 
    'Migration verification' as status,
    COUNT(*) as total_users
FROM "user";

-- Show updated table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user' 
ORDER BY ordinal_position;

COMMIT;

-- Success message
SELECT 'GDPR columns migration completed successfully!' as result;
