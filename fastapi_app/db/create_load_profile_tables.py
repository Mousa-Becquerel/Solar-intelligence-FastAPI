"""
Create Load Profile tables for Storage Optimization Agent
Run this once to create the load profile persistence tables
"""
import asyncio
from sqlalchemy import text
from fastapi_app.db.session import AsyncSessionLocal


async def create_load_profile_tables():
    """Create conversation load profile tables"""
    async with AsyncSessionLocal() as session:
        try:
            # Create ConversationLoadProfile table
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS fastapi_conversation_load_profiles (
                    id SERIAL PRIMARY KEY,
                    conversation_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,

                    -- Profile identification
                    name VARCHAR(100) NOT NULL,
                    file_name VARCHAR(255),

                    -- Profile data - stored as JSON array of 8760 hourly values
                    profile_data TEXT NOT NULL,

                    -- Metadata
                    annual_demand_kwh FLOAT NOT NULL,
                    hours_count INTEGER DEFAULT 8760,
                    is_daily_profile BOOLEAN DEFAULT FALSE,

                    -- Status
                    is_active BOOLEAN DEFAULT TRUE,

                    -- Timestamps
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))

            # Create indexes for efficient lookups
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_load_profiles_conversation_id
                ON fastapi_conversation_load_profiles(conversation_id);
            """))

            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_load_profiles_user_id
                ON fastapi_conversation_load_profiles(user_id);
            """))

            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_load_profiles_is_active
                ON fastapi_conversation_load_profiles(is_active);
            """))

            # Create unique constraint for name per conversation
            await session.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_load_profiles_conv_name
                ON fastapi_conversation_load_profiles(conversation_id, name);
            """))

            await session.commit()
            print("✅ Load profile tables created successfully!")
            return True

        except Exception as e:
            print(f"❌ Error creating load profile tables: {e}")
            await session.rollback()
            return False


async def check_table_exists():
    """Check if the table already exists"""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'fastapi_conversation_load_profiles'
                );
            """))
            exists = result.scalar()
            return exists
        except Exception as e:
            print(f"Error checking table existence: {e}")
            return False


if __name__ == "__main__":
    async def main():
        exists = await check_table_exists()
        if exists:
            print("ℹ️  Load profile table already exists")
        else:
            await create_load_profile_tables()

    asyncio.run(main())
