-- Migration: Add DataProcessingLog table for GDPR Article 30 compliance
-- Created: 2025-11-20
-- Purpose: Track all data processing activities for transparency and compliance

CREATE TABLE IF NOT EXISTS fastapi_data_processing_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    purpose TEXT,
    data_categories TEXT,
    legal_basis VARCHAR(50),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by_user_id INTEGER
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_user_id ON fastapi_data_processing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_activity_type ON fastapi_data_processing_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_timestamp ON fastapi_data_processing_logs(timestamp);

-- Add comments for documentation
COMMENT ON TABLE fastapi_data_processing_logs IS 'GDPR Article 30: Records of data processing activities';
COMMENT ON COLUMN fastapi_data_processing_logs.user_id IS 'User whose data was processed';
COMMENT ON COLUMN fastapi_data_processing_logs.activity_type IS 'Type of processing: data_access, data_export, data_modification, data_deletion';
COMMENT ON COLUMN fastapi_data_processing_logs.purpose IS 'Why the data was processed';
COMMENT ON COLUMN fastapi_data_processing_logs.data_categories IS 'JSON array of data categories processed';
COMMENT ON COLUMN fastapi_data_processing_logs.legal_basis IS 'Legal basis: consent, contract, legitimate_interest, legal_obligation';
COMMENT ON COLUMN fastapi_data_processing_logs.performed_by_user_id IS 'User ID who performed the action (for admin access tracking)';
