"""Test password verification with Werkzeug scrypt hash"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_password():
    engine = create_async_engine(
        'postgresql+asyncpg://solar_admin_v2:Datahub1_@solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com:5432/solar_intelligence_v2'
    )

    async with engine.connect() as conn:
        # Get user and password hash
        result = await conn.execute(
            text('SELECT id, username, password_hash FROM fastapi_users WHERE username = :username'),
            {'username': 'sondoqahmousa97@gmail.com'}
        )
        row = result.first()

        if not row:
            print("❌ User not found")
            await engine.dispose()
            return

        user_id, username, password_hash = row
        print(f"✅ User found: {username} (ID: {user_id})")
        print(f"Password hash format: {password_hash[:50]}...")

        # Test werkzeug verification
        try:
            from werkzeug.security import check_password_hash
            print("\n✅ Werkzeug is installed")

            # You'll need to enter your password here for testing
            test_password = input("\nEnter your password to test: ")

            result = check_password_hash(password_hash, test_password)
            if result:
                print("✅ Password verification SUCCESSFUL with Werkzeug!")
            else:
                print("❌ Password verification FAILED - wrong password")

        except ImportError:
            print("❌ Werkzeug is NOT installed")
        except Exception as e:
            print(f"❌ Error during verification: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_password())
