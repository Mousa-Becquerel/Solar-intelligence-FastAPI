-- Seed Agent Access Configuration for AWS Production Database
--
-- This script configures agent access control to match frontend metadata
-- Run this on the AWS PostgreSQL database after migration
--
-- IMPORTANT: According to react-frontend/src/constants/agentMetadata.ts:
-- - ONLY nzia_market_impact (Nina) is premium
-- - ALL other agents (including manufacturer_financial/Finn) are FREE
--

-- Insert or update agent access configurations
-- Using INSERT ... ON CONFLICT to make this idempotent

INSERT INTO agent_access (agent_type, required_plan, is_enabled, description, created_at, updated_at)
VALUES
    ('market', 'free', true, 'Market Intelligence Agent - Provides market trends and analysis', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('price', 'free', true, 'Module Prices Agent - Tracks and analyzes PV module pricing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('news', 'free', true, 'News Agent - Latest solar industry news and updates', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('digitalization', 'free', true, 'Digitalization Trends Agent - Digital transformation in solar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('nzia_policy', 'free', true, 'NZIA Policy Agent - European NZIA policy analysis', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('nzia_market_impact', 'premium', true, 'NZIA Market Impact Agent - EU market impact analysis (Premium)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('manufacturer_financial', 'free', true, 'Manufacturer Financial Agent (Finn) - Financial analysis of PV manufacturers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('leo_om', 'free', true, 'Operations & Maintenance Agent - O&M best practices', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('om', 'free', true, 'Operations & Maintenance Agent - O&M best practices', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('weaviate', 'premium', true, 'Database Query Agent - Advanced data retrieval (Premium)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (agent_type)
DO UPDATE SET
    required_plan = EXCLUDED.required_plan,
    is_enabled = EXCLUDED.is_enabled,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- Verification query - run this to check the configuration
SELECT
    agent_type,
    required_plan,
    is_enabled,
    CASE
        WHEN required_plan = 'premium' THEN '💎 PREMIUM'
        ELSE '🆓 FREE'
    END as access_level,
    description
FROM agent_access
ORDER BY
    CASE
        WHEN required_plan = 'premium' THEN 1
        ELSE 2
    END,
    agent_type;

-- Expected output:
-- agent_type              | required_plan | is_enabled | access_level | description
-- ------------------------+---------------+------------+--------------+------------------------------------------
-- nzia_market_impact      | premium       | t          | 💎 PREMIUM   | NZIA Market Impact Agent (Nina) ...
-- weaviate                | premium       | t          | 💎 PREMIUM   | Database Query Agent ...
-- digitalization          | free          | t          | 🆓 FREE      | Digitalization Trends Agent ...
-- leo_om                  | free          | t          | 🆓 FREE      | Operations & Maintenance Agent ...
-- manufacturer_financial  | free          | t          | 🆓 FREE      | Manufacturer Financial Agent (Finn) ...
-- market                  | free          | t          | 🆓 FREE      | Market Intelligence Agent ...
-- news                    | free          | t          | 🆓 FREE      | News Agent ...
-- nzia_policy             | free          | t          | 🆓 FREE      | NZIA Policy Agent ...
-- om                      | free          | t          | 🆓 FREE      | Operations & Maintenance Agent ...
-- price                   | free          | t          | 🆓 FREE      | Module Prices Agent ...
