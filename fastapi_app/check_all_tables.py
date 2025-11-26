"""
Check all tables in the database
"""
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL', '')

async def check_all_tables():
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # List all tables
        print("=" * 80)
        print("ALL TABLES IN DATABASE:")
        print("=" * 80)
        tables_result = await conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))

        tables = []
        for row in tables_result:
            tables.append(row.table_name)
            print(f"  - {row.table_name}")

        print()
        print("=" * 80)
        print("RECORD COUNTS FOR EACH TABLE:")
        print("=" * 80)

        for table in tables:
            try:
                count_result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = count_result.scalar()
                print(f"  {table:40} {count:8} records")
            except Exception as e:
                print(f"  {table:40} ERROR: {str(e)[:50]}")

        # Check fastapi_messages in detail
        print()
        print("=" * 80)
        print("FASTAPI_MESSAGES SAMPLE:")
        print("=" * 80)
        messages_result = await conn.execute(text("""
            SELECT id, conversation_id, sender, LEFT(content, 50) as content_preview, timestamp
            FROM fastapi_messages
            ORDER BY timestamp DESC
            LIMIT 5
        """))
        for row in messages_result:
            print(f"  ID={row.id}, ConvID={row.conversation_id}, Sender={row.sender}")
            print(f"    Content: {row.content_preview}")
            print(f"    Time: {row.timestamp}")
            print()

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_all_tables())
