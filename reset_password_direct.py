"""
Reset password directly in database using bcrypt
This bypasses the werkzeug issue and lets you login immediately
"""
import asyncio
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def reset_password():
    email = "sondoqahmousa97@gmail.com"
    new_password = input(f"Enter new password for {email}: ")

    # Hash password with bcrypt (same as FastAPI uses for new users)
    password_bytes = new_password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

    print(f"\nNew bcrypt hash: {password_hash[:50]}...")

    engine = create_async_engine(
        'postgresql+asyncpg://solar_admin_v2:Datahub1_@solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com:5432/solar_intelligence_v2'
    )

    async with engine.begin() as conn:
        # Update password
        await conn.execute(
            text('UPDATE fastapi_users SET password_hash = :hash WHERE username = :email'),
            {'hash': password_hash, 'email': email}
        )
        print(f"✅ Password updated for {email}")
        print("You can now login with your new password!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_password())
