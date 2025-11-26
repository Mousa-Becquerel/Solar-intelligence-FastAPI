"""
Create Data Breach Log tables
Run this once to create the breach management tables
"""
import asyncio
from sqlalchemy import text
from fastapi_app.db.session import AsyncSessionLocal


async def create_breach_tables():
    """Create data breach log tables"""
    async with AsyncSessionLocal() as session:
        try:
            # Create DataBreachLog table
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS fastapi_data_breach_logs (
                    id SERIAL PRIMARY KEY,

                    -- Breach Details
                    breach_type VARCHAR(50) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    description TEXT NOT NULL,
                    affected_data_categories TEXT,
                    estimated_affected_users INTEGER,

                    -- Discovery & Timeline
                    discovered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    breach_occurred_at TIMESTAMP,
                    contained_at TIMESTAMP,
                    resolved_at TIMESTAMP,

                    -- Discovery Details
                    discovered_by VARCHAR(100),
                    discovery_method VARCHAR(100),

                    -- Impact Assessment
                    risk_level VARCHAR(20) NOT NULL,
                    likely_consequences TEXT,
                    technical_measures TEXT,
                    organizational_measures TEXT,

                    -- Notification Status
                    internal_team_notified BOOLEAN DEFAULT FALSE,
                    internal_notification_date TIMESTAMP,

                    dpa_notified BOOLEAN DEFAULT FALSE,
                    dpa_notification_date TIMESTAMP,
                    dpa_notification_required BOOLEAN DEFAULT TRUE,

                    users_notified BOOLEAN DEFAULT FALSE,
                    users_notification_date TIMESTAMP,
                    users_notification_required BOOLEAN DEFAULT FALSE,

                    -- Remediation
                    remediation_steps TEXT,
                    prevention_measures TEXT,

                    -- Status
                    status VARCHAR(20) NOT NULL DEFAULT 'open',

                    -- Metadata
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP,
                    created_by_user_id INTEGER,

                    -- Notes
                    notes TEXT
                );
            """))

            # Create indexes
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_data_breach_logs_severity
                ON fastapi_data_breach_logs(severity);
            """))

            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_data_breach_logs_status
                ON fastapi_data_breach_logs(status);
            """))

            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_data_breach_logs_created_at
                ON fastapi_data_breach_logs(created_at);
            """))

            await session.commit()
            print("✅ Data breach log tables created successfully!")
            return True

        except Exception as e:
            print(f"❌ Error creating breach tables: {e}")
            await session.rollback()
            return False


if __name__ == "__main__":
    asyncio.run(create_breach_tables())
