-- Migration script to copy messages from old tables to new FastAPI tables
-- Run this on AWS RDS database

-- Step 1: Migrate conversations (if not already done)
INSERT INTO fastapi_conversations (id, user_id, title, agent_type, created_at)
SELECT id, user_id, title, agent_type, created_at
FROM conversations
WHERE id NOT IN (SELECT id FROM fastapi_conversations)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Migrate messages
INSERT INTO fastapi_messages (id, conversation_id, sender, content, agent_type, timestamp)
SELECT id, conversation_id, sender, content, agent_type, timestamp
FROM messages
WHERE id NOT IN (SELECT id FROM fastapi_messages)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Update sequences to avoid ID conflicts
SELECT setval('fastapi_conversations_id_seq', (SELECT MAX(id) FROM fastapi_conversations));
SELECT setval('fastapi_messages_id_seq', (SELECT MAX(id) FROM fastapi_messages));

-- Step 4: Verify migration
SELECT
    'conversations' as table_name,
    (SELECT COUNT(*) FROM conversations) as old_count,
    (SELECT COUNT(*) FROM fastapi_conversations) as new_count;

SELECT
    'messages' as table_name,
    (SELECT COUNT(*) FROM messages) as old_count,
    (SELECT COUNT(*) FROM fastapi_messages) as new_count;
