-- Migration: Add restriction of processing fields to User table
-- Created: 2025-11-20
-- Purpose: GDPR Article 18 - Right to Restriction of Processing

-- Add restriction fields to fastapi_users table
ALTER TABLE fastapi_users ADD COLUMN IF NOT EXISTS processing_restricted BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE fastapi_users ADD COLUMN IF NOT EXISTS restriction_requested_at TIMESTAMP NULL;
ALTER TABLE fastapi_users ADD COLUMN IF NOT EXISTS restriction_reason TEXT NULL;
ALTER TABLE fastapi_users ADD COLUMN IF NOT EXISTS restriction_grounds VARCHAR(50) NULL;

-- Create index for efficient querying of restricted users
CREATE INDEX IF NOT EXISTS idx_users_processing_restricted ON fastapi_users(processing_restricted) WHERE processing_restricted = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN fastapi_users.processing_restricted IS 'GDPR Art. 18: Whether user has restricted data processing';
COMMENT ON COLUMN fastapi_users.restriction_requested_at IS 'When the restriction was requested';
COMMENT ON COLUMN fastapi_users.restriction_reason IS 'User explanation for restriction request';
COMMENT ON COLUMN fastapi_users.restriction_grounds IS 'Legal grounds: accuracy, unlawful, no_longer_needed, objection';
