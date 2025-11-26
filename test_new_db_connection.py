"""
Quick test script to verify new database connection
Run this after the RDS database is created
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# UPDATE THIS after RDS creation
NEW_DB_URL = "postgresql+asyncpg://solar_admin_v2:Datahub1_@solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com:5432/solar_intelligence_v2"


async def test_connection():
    """Test connection to new database"""
    print("=" * 80)
    print("Testing New Database Connection")
    print("=" * 80)

    if "YOUR_PASSWORD" in NEW_DB_URL or "YOUR_ENDPOINT" in NEW_DB_URL:
        print("\n❌ ERROR: Please update NEW_DB_URL with actual values!")
        print("\nEdit this file and replace:")
        print("  - YOUR_PASSWORD with your database password")
        print("  - YOUR_ENDPOINT with your RDS endpoint")
        return

    try:
        print("\n1. Creating database engine...")
        engine = create_async_engine(NEW_DB_URL, echo=False)

        print("2. Testing connection...")
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar()
            print(f"✅ Connection successful!")
            print(f"   PostgreSQL version: {version}")

            # Check if database is empty
            result = await conn.execute(text("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
            """))
            table_count = result.scalar()
            print(f"\n3. Current state:")
            print(f"   Tables in database: {table_count}")

            if table_count == 0:
                print("   ✅ Database is empty and ready for initialization")
            else:
                print(f"   ⚠️  Database already has {table_count} tables")

        await engine.dispose()

        print("\n" + "=" * 80)
        print("✅ Database connection test PASSED!")
        print("=" * 80)
        print("\nNext step: Run the migration script")

    except Exception as e:
        print(f"\n❌ Connection failed: {e}")
        print("\nPlease check:")
        print("1. RDS endpoint is correct")
        print("2. Password is correct")
        print("3. Security group allows your IP address")
        print("4. Database is in 'Available' state")


if __name__ == "__main__":
    asyncio.run(test_connection())
