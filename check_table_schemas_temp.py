"""
Check and compare old vs new table schemas
"""
import asyncio
import os
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL', '').replace('postgresql://', 'postgresql+asyncpg://')

async def check_schemas():
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Check OLD messages table schema
        print("=" * 80)
        print("OLD 'messages' TABLE SCHEMA:")
        print("=" * 80)
        old_schema = await conn.execute(text("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'messages'
            ORDER BY ordinal_position
        """))
        for row in old_schema:
            print(f"  {row.column_name:20} {row.data_type:20} max_len={row.character_maximum_length} nullable={row.is_nullable}")

        # Check NEW fastapi_messages table schema
        print("\n" + "=" * 80)
        print("NEW 'fastapi_messages' TABLE SCHEMA:")
        print("=" * 80)
        new_schema = await conn.execute(text("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'fastapi_messages'
            ORDER BY ordinal_position
        """))
        for row in new_schema:
            print(f"  {row.column_name:20} {row.data_type:20} max_len={row.character_maximum_length} nullable={row.is_nullable}")

        # Check sample from old table
        print("\n" + "=" * 80)
        print("SAMPLE DATA FROM OLD 'messages' TABLE:")
        print("=" * 80)
        old_sample = await conn.execute(text("""
            SELECT id, conversation_id, sender, LEFT(content::text, 100) as content_preview, timestamp
            FROM messages
            LIMIT 3
        """))
        for row in old_sample:
            print(f"  ID={row.id}, ConvID={row.conversation_id}, Sender={row.sender}")
            print(f"    Content: {row.content_preview}")
            print(f"    Time: {row.timestamp}")
            print()

        # Check counts
        print("=" * 80)
        print("RECORD COUNTS:")
        print("=" * 80)
        old_count = await conn.execute(text("SELECT COUNT(*) FROM messages"))
        new_count = await conn.execute(text("SELECT COUNT(*) FROM fastapi_messages"))
        print(f"  OLD messages table: {old_count.scalar()} records")
        print(f"  NEW fastapi_messages table: {new_count.scalar()} records")

        # Check conversations too
        old_conv_count = await conn.execute(text("SELECT COUNT(*) FROM conversations"))
        new_conv_count = await conn.execute(text("SELECT COUNT(*) FROM fastapi_conversations"))
        print(f"  OLD conversations table: {old_conv_count.scalar()} records")
        print(f"  NEW fastapi_conversations table: {new_conv_count.scalar()} records")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_schemas())
