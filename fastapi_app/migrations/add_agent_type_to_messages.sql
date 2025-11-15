-- Add agent_type column to fastapi_messages table
-- This allows tracking which agent answered each message in multi-agent conversations

ALTER TABLE fastapi_messages
ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_agent_type ON fastapi_messages(agent_type);

-- Optional: Update existing bot messages to use the conversation's agent_type
UPDATE fastapi_messages m
SET agent_type = c.agent_type
FROM fastapi_conversations c
WHERE m.conversation_id = c.id
  AND m.sender = 'bot'
  AND m.agent_type IS NULL;
