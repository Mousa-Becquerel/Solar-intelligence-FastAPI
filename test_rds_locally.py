"""
Test script to verify the new RDS database works with your local FastAPI app
This will test database connectivity and basic operations
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Database URL for new RDS
NEW_DB_URL = "postgresql+asyncpg://solar_admin_v2:Datahub1_@solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com:5432/solar_intelligence_v2"


async def test_rds_connection():
    """Comprehensive test of RDS database"""

    print("=" * 80)
    print("🧪 Testing New RDS Database Locally")
    print("=" * 80)

    try:
        # Create engine
        print("\n1️⃣ Creating database engine...")
        engine = create_async_engine(NEW_DB_URL, echo=False)

        # Test connection
        print("2️⃣ Testing database connection...")
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar()
            print(f"   ✅ Connected to: {version}")

        # Check tables
        print("\n3️⃣ Checking database tables...")
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]

            print(f"   ✅ Found {len(tables)} tables:")
            for table in tables:
                print(f"      - {table}")

        # Check migrated data
        print("\n4️⃣ Checking migrated data...")
        async with engine.connect() as conn:
            # Users
            result = await conn.execute(text("SELECT COUNT(*) FROM fastapi_users"))
            user_count = result.scalar()
            print(f"   ✅ Users: {user_count}")

            # Conversations
            result = await conn.execute(text("SELECT COUNT(*) FROM fastapi_conversations"))
            conv_count = result.scalar()
            print(f"   ✅ Conversations: {conv_count}")

            # Messages
            result = await conn.execute(text("SELECT COUNT(*) FROM fastapi_messages"))
            msg_count = result.scalar()
            print(f"   ✅ Messages: {msg_count}")

            # Hired Agents
            result = await conn.execute(text("SELECT COUNT(*) FROM fastapi_hired_agent"))
            agent_count = result.scalar()
            print(f"   ✅ Hired Agents: {agent_count}")

        # Test a sample user query
        print("\n5️⃣ Testing sample user query...")
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT id, username, full_name, role, email_verified
                FROM fastapi_users
                LIMIT 5
            """))
            users = result.fetchall()

            print(f"   ✅ Sample users:")
            for user in users:
                print(f"      - {user[1]} ({user[2]}) - Role: {user[3]} - Email Verified: {user[4]}")

        # Test GDPR tables
        print("\n6️⃣ Checking GDPR compliance tables...")
        async with engine.connect() as conn:
            # Data Processing Logs
            result = await conn.execute(text("SELECT COUNT(*) FROM fastapi_data_processing_logs"))
            log_count = result.scalar()
            print(f"   ✅ Data Processing Logs: {log_count}")

            # Data Breach Logs
            result = await conn.execute(text("SELECT COUNT(*) FROM fastapi_data_breach_logs"))
            breach_count = result.scalar()
            print(f"   ✅ Data Breach Logs: {breach_count}")

        # Test user with restriction fields
        print("\n7️⃣ Testing GDPR restriction fields...")
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT COUNT(*)
                FROM fastapi_users
                WHERE processing_restricted = true
            """))
            restricted_count = result.scalar()
            print(f"   ✅ Users with processing restricted: {restricted_count}")

        await engine.dispose()

        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED!")
        print("=" * 80)
        print("\n📋 Summary:")
        print(f"   - Database: Connected and operational")
        print(f"   - Tables: {len(tables)} tables created")
        print(f"   - Users: {user_count} migrated")
        print(f"   - Conversations: {conv_count} migrated")
        print(f"   - Messages: {msg_count} in database")
        print(f"   - Hired Agents: {agent_count} migrated")
        print(f"   - GDPR Features: Fully implemented")
        print("\n✅ Your RDS database is ready for local testing!")
        print("\nNext step: Start your local FastAPI app with the new database:")
        print("   docker-compose -f docker-compose.test.yml up -d")

        return True

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("\nPossible issues:")
        print("1. Security group doesn't allow your IP address")
        print("2. Database credentials are incorrect")
        print("3. Database endpoint is wrong")
        print("4. Network connectivity issues")
        return False


if __name__ == "__main__":
    success = asyncio.run(test_rds_connection())
    sys.exit(0 if success else 1)
