"""
Initialize GDPR-related database tables
Run this once to create the DataProcessingLog table
"""
import asyncio
from sqlalchemy import text
from fastapi_app.db.session import AsyncSessionLocal


async def create_gdpr_tables():
    """Create GDPR compliance tables"""
    async with AsyncSessionLocal() as session:
        try:
            # Create DataProcessingLog table
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS fastapi_data_processing_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    activity_type VARCHAR(50) NOT NULL,
                    endpoint VARCHAR(255),
                    method VARCHAR(10),
                    ip_address VARCHAR(45),
                    user_agent VARCHAR(255),
                    purpose TEXT,
                    data_categories TEXT,
                    legal_basis VARCHAR(50),
                    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    performed_by_user_id INTEGER
                );
            """))

            # Create indexes
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_data_processing_logs_user_id
                ON fastapi_data_processing_logs(user_id);
            """))

            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_data_processing_logs_activity_type
                ON fastapi_data_processing_logs(activity_type);
            """))

            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_data_processing_logs_timestamp
                ON fastapi_data_processing_logs(timestamp);
            """))

            await session.commit()
            print("✅ GDPR tables created successfully!")
            return True

        except Exception as e:
            print(f"❌ Error creating GDPR tables: {e}")
            await session.rollback()
            return False


if __name__ == "__main__":
    asyncio.run(create_gdpr_tables())
