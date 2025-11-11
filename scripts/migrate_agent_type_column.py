"""
Migration script to increase agent_type column size from VARCHAR(16) to VARCHAR(50)
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate():
    # Get database URL from environment
    db_url = os.getenv('FASTAPI_DATABASE_URL', 'postgresql://fastapi_user:fastapi_password@localhost:5433/solar_intelligence_fastapi')

    # Parse connection details
    # Format: postgresql+asyncpg://user:password@host:port/database or postgresql://user:password@host:port/database
    # Remove the postgresql+asyncpg:// or postgresql:// prefix
    db_url_clean = db_url.replace('postgresql+asyncpg://', '').replace('postgresql://', '')

    parts = db_url_clean.split('@')
    user_pass = parts[0].split(':')
    host_db = parts[1].split('/')
    host_port = host_db[0].split(':')

    user = user_pass[0]
    password = user_pass[1]
    host = host_port[0]
    port = int(host_port[1]) if len(host_port) > 1 else 5432
    database = host_db[1]

    print(f"Connecting to {host}:{port}/{database} as {user}")

    try:
        # Connect to database
        conn = await asyncpg.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )

        print("Connected successfully!")

        # Check current column type
        current_type = await conn.fetchval("""
            SELECT character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'fastapi_conversations'
            AND column_name = 'agent_type'
        """)

        print(f"Current agent_type column size: VARCHAR({current_type})")

        if current_type and current_type < 50:
            print("Migrating agent_type column to VARCHAR(50)...")

            # Alter the column
            await conn.execute("""
                ALTER TABLE fastapi_conversations
                ALTER COLUMN agent_type TYPE VARCHAR(50)
            """)

            print("✅ Migration completed successfully!")

            # Verify the change
            new_type = await conn.fetchval("""
                SELECT character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'fastapi_conversations'
                AND column_name = 'agent_type'
            """)

            print(f"New agent_type column size: VARCHAR({new_type})")
        else:
            print("✅ Column is already VARCHAR(50) or larger, no migration needed")

        await conn.close()

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(migrate())
