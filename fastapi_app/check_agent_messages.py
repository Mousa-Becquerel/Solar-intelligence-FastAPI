"""
Check agent_messages table structure and contents
"""
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL', '')

async def check_agent_messages():
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Check agent_messages schema
        print("=" * 80)
        print("AGENT_MESSAGES TABLE SCHEMA:")
        print("=" * 80)
        schema = await conn.execute(text("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'agent_messages'
            ORDER BY ordinal_position
        """))
        for row in schema:
            print(f"  {row.column_name:25} {row.data_type:25} max_len={row.character_maximum_length} nullable={row.is_nullable}")

        # Check sample data
        print()
        print("=" * 80)
        print("AGENT_MESSAGES SAMPLE DATA:")
        print("=" * 80)
        sample = await conn.execute(text("""
            SELECT id, session_id, sender, LEFT(content::text, 80) as content_preview, timestamp
            FROM agent_messages
            ORDER BY timestamp DESC
            LIMIT 10
        """))
        for row in sample:
            print(f"  ID={row.id}, SessionID={row.session_id}, Sender={row.sender}")
            print(f"    Content: {row.content_preview}")
            print(f"    Time: {row.timestamp}")
            print()

        # Check agent_sessions schema
        print("=" * 80)
        print("AGENT_SESSIONS TABLE SCHEMA:")
        print("=" * 80)
        sessions_schema = await conn.execute(text("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'agent_sessions'
            ORDER BY ordinal_position
        """))
        for row in sessions_schema:
            print(f"  {row.column_name:25} {row.data_type:25} max_len={row.character_maximum_length} nullable={row.is_nullable}")

        # Check sample agent_sessions
        print()
        print("=" * 80)
        print("AGENT_SESSIONS SAMPLE DATA:")
        print("=" * 80)
        sessions_sample = await conn.execute(text("""
            SELECT id, user_id, agent_type, created_at, updated_at
            FROM agent_sessions
            ORDER BY updated_at DESC
            LIMIT 10
        """))
        for row in sessions_sample:
            print(f"  ID={row.id}, UserID={row.user_id}, AgentType={row.agent_type}")
            print(f"    Created: {row.created_at}, Updated: {row.updated_at}")
            print()

        # Compare structures
        print("=" * 80)
        print("COMPARISON:")
        print("=" * 80)
        print(f"  fastapi_conversations: 1064 records")
        print(f"  fastapi_messages: 106 records")
        print(f"  agent_sessions: 31 records")
        print(f"  agent_messages: 141 records")
        print()
        print("LIKELY ISSUE: Messages are stored in agent_messages (old Flask structure)")
        print("              but the FastAPI app queries fastapi_messages!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_agent_messages())
