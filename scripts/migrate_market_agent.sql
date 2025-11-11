-- =====================================================================
-- Database Migration: Market Agent → Market Intelligence Agent
-- =====================================================================
-- This SQL script migrates existing data from 'market' to 'market_intel'
-- Run this in pgAdmin or any PostgreSQL client
-- =====================================================================

BEGIN;

-- Show current state before migration
SELECT 'BEFORE MIGRATION - Conversations:' as info;
SELECT agent_type, COUNT(*) as count
FROM conversations
GROUP BY agent_type
ORDER BY agent_type;

SELECT 'BEFORE MIGRATION - Hired Agents:' as info;
SELECT agent_type, COUNT(*) as count
FROM hired_agents
GROUP BY agent_type
ORDER BY agent_type;

-- Update conversations from 'market' to 'market_intel'
UPDATE conversations
SET agent_type = 'market_intel'
WHERE agent_type = 'market';

-- Get count of updated conversations
SELECT 'Updated conversations:' as info, COUNT(*) as updated_count
FROM conversations
WHERE agent_type = 'market_intel';

-- Update hired_agents from 'market' to 'market_intel'
UPDATE hired_agents
SET agent_type = 'market_intel'
WHERE agent_type = 'market';

-- Get count of updated hired agents
SELECT 'Updated hired agents:' as info, COUNT(*) as updated_count
FROM hired_agents
WHERE agent_type = 'market_intel';

-- Show final state after migration
SELECT 'AFTER MIGRATION - Conversations:' as info;
SELECT agent_type, COUNT(*) as count
FROM conversations
GROUP BY agent_type
ORDER BY agent_type;

SELECT 'AFTER MIGRATION - Hired Agents:' as info;
SELECT agent_type, COUNT(*) as count
FROM hired_agents
GROUP BY agent_type
ORDER BY agent_type;

-- Verify no 'market' records remain
SELECT 'Verification - Should be 0:' as info;
SELECT
    (SELECT COUNT(*) FROM conversations WHERE agent_type = 'market') as market_conversations,
    (SELECT COUNT(*) FROM hired_agents WHERE agent_type = 'market') as market_hired_agents;

COMMIT;

-- If everything looks good, the changes are now permanent
-- If something went wrong, you can run: ROLLBACK; instead of COMMIT;
