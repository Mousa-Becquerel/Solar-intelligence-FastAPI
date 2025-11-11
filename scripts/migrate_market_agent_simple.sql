-- Simple Migration: Update all 'market' to 'market_intel'
-- Copy and paste this into pgAdmin

-- Update conversations
UPDATE conversations
SET agent_type = 'market_intel'
WHERE agent_type = 'market';

-- Update hired_agents (if any exist)
UPDATE hired_agents
SET agent_type = 'market_intel'
WHERE agent_type = 'market';

-- Verify the changes
SELECT agent_type, COUNT(*) as count
FROM conversations
GROUP BY agent_type
ORDER BY agent_type;
