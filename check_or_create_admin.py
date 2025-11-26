"""
Check if admin exists, or create one for testing
"""
import asyncio
from sqlalchemy import select
from fastapi_app.db.session import AsyncSessionLocal
from fastapi_app.db.models import User
import bcrypt


async def check_or_create_admin():
    """Check if admin exists, or create one"""
    async with AsyncSessionLocal() as session:
        try:
            # Check for existing admin
            result = await session.execute(
                select(User).where(User.role == 'admin').limit(1)
            )
            admin = result.scalar_one_or_none()

            if admin:
                print(f"✅ Admin account exists:")
                print(f"   Email: {admin.username}")
                print(f"   ID: {admin.id}")
                print(f"   Role: {admin.role}")
                return admin.username

            # Create test admin
            print("⚠️  No admin account found. Creating test admin...")

            # Hash password
            password = "admin123456"
            password_hash = bcrypt.hashpw(
                password.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')

            admin = User(
                username="admin@solarintelligence.com",
                password_hash=password_hash,
                full_name="Admin User",
                role="admin",
                is_active=True,
                email_verified=True,
                plan_type="premium",
                gdpr_consent_given=True,
                terms_accepted=True
            )

            session.add(admin)
            await session.commit()
            await session.refresh(admin)

            print(f"✅ Test admin created!")
            print(f"   Email: {admin.username}")
            print(f"   Password: {password}")
            print(f"   ID: {admin.id}")
            print(f"\n⚠️  IMPORTANT: Change this password in production!")

            return admin.username

        except Exception as e:
            print(f"❌ Error: {e}")
            await session.rollback()
            return None


if __name__ == "__main__":
    asyncio.run(check_or_create_admin())
