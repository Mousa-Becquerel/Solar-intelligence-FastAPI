"""
Add restriction of processing fields to User table
Run this once to add GDPR Article 18 fields
"""
import asyncio
from sqlalchemy import text
from fastapi_app.db.session import AsyncSessionLocal


async def add_restriction_fields():
    """Add restriction fields to fastapi_users table"""
    async with AsyncSessionLocal() as session:
        try:
            # Add restriction fields
            await session.execute(text("""
                ALTER TABLE fastapi_users ADD COLUMN IF NOT EXISTS processing_restricted BOOLEAN DEFAULT FALSE NOT NULL;
            """))

            await session.execute(text("""
                ALTER TABLE fastapi_users ADD COLUMN IF NOT EXISTS restriction_requested_at TIMESTAMP NULL;
            """))

            await session.execute(text("""
                ALTER TABLE fastapi_users ADD COLUMN IF NOT EXISTS restriction_reason TEXT NULL;
            """))

            await session.execute(text("""
                ALTER TABLE fastapi_users ADD COLUMN IF NOT EXISTS restriction_grounds VARCHAR(50) NULL;
            """))

            # Create index
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_users_processing_restricted
                ON fastapi_users(processing_restricted)
                WHERE processing_restricted = TRUE;
            """))

            await session.commit()
            print("✅ Restriction fields added successfully!")
            return True

        except Exception as e:
            print(f"❌ Error adding restriction fields: {e}")
            await session.rollback()
            return False


if __name__ == "__main__":
    asyncio.run(add_restriction_fields())
