"""
Delete all conversations that have no messages.
These are leftover from the old database migration.
"""
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Get database URL from environment
DATABASE_URL = os.getenv('FASTAPI_DATABASE_URL', '')

async def delete_empty_conversations():
    """Delete conversations with no messages."""
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # First, count how many empty conversations exist
        print("=" * 80)
        print("CHECKING FOR EMPTY CONVERSATIONS")
        print("=" * 80)

        count_result = await conn.execute(text("""
            SELECT COUNT(*) as empty_count
            FROM fastapi_conversations c
            WHERE NOT EXISTS (
                SELECT 1
                FROM fastapi_messages m
                WHERE m.conversation_id = c.id
            )
        """))
        empty_count = count_result.scalar()

        print(f"Found {empty_count} conversations with no messages")

        if empty_count == 0:
            print("No empty conversations to delete!")
            return

        # Show sample of conversations to be deleted
        print("\n" + "=" * 80)
        print("SAMPLE OF CONVERSATIONS TO BE DELETED (showing first 10):")
        print("=" * 80)

        sample_result = await conn.execute(text("""
            SELECT c.id, c.user_id, c.title, c.created_at
            FROM fastapi_conversations c
            WHERE NOT EXISTS (
                SELECT 1
                FROM fastapi_messages m
                WHERE m.conversation_id = c.id
            )
            ORDER BY c.created_at DESC
            LIMIT 10
        """))

        for row in sample_result:
            print(f"  ID={row.id}, User={row.user_id}, Title={row.title}, Created={row.created_at}")

        # Delete empty conversations
        print("\n" + "=" * 80)
        print("DELETING EMPTY CONVERSATIONS...")
        print("=" * 80)

        delete_result = await conn.execute(text("""
            DELETE FROM fastapi_conversations
            WHERE id IN (
                SELECT c.id
                FROM fastapi_conversations c
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM fastapi_messages m
                    WHERE m.conversation_id = c.id
                )
            )
        """))

        deleted_count = delete_result.rowcount
        print(f"✅ Successfully deleted {deleted_count} empty conversations")

        # Verify deletion
        print("\n" + "=" * 80)
        print("VERIFICATION:")
        print("=" * 80)

        verify_result = await conn.execute(text("""
            SELECT COUNT(*) as remaining_empty
            FROM fastapi_conversations c
            WHERE NOT EXISTS (
                SELECT 1
                FROM fastapi_messages m
                WHERE m.conversation_id = c.id
            )
        """))
        remaining = verify_result.scalar()

        total_result = await conn.execute(text("SELECT COUNT(*) FROM fastapi_conversations"))
        total = total_result.scalar()

        print(f"  Remaining empty conversations: {remaining}")
        print(f"  Total conversations: {total}")
        print(f"  All conversations now have messages: {remaining == 0}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(delete_empty_conversations())
