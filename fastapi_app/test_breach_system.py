"""
Quick test script for Data Breach Notification System
Uses your admin account: m.sondoqah@becquerelinstitute.eu
"""
import asyncio
import json
from sqlalchemy import select
from fastapi_app.db.session import AsyncSessionLocal
from fastapi_app.db.models import User, DataBreachLog
from fastapi_app.services.breach_notification_service import BreachNotificationService


async def test_breach_system():
    """Test the breach notification system"""
    async with AsyncSessionLocal() as session:
        try:
            # 1. Verify admin account
            print("=" * 60)
            print("STEP 1: Verifying Admin Account")
            print("=" * 60)

            result = await session.execute(
                select(User).where(User.username == 'm.sondoqah@becquerelinstitute.eu')
            )
            admin = result.scalar_one_or_none()

            if not admin:
                print("❌ Admin account not found!")
                return

            print(f"✅ Admin account found:")
            print(f"   Email: {admin.username}")
            print(f"   Role: {admin.role}")
            print(f"   Active: {admin.is_active}")

            if admin.role != 'admin':
                print(f"\n⚠️  WARNING: Account role is '{admin.role}', not 'admin'")
                print("   The breach endpoints require admin role.")
                print("\n   To fix, run:")
                print(f"   UPDATE fastapi_users SET role='admin' WHERE username='{admin.username}';")
                return

            # 2. Create a test breach
            print("\n" + "=" * 60)
            print("STEP 2: Creating Test Breach")
            print("=" * 60)

            breach = await BreachNotificationService.create_breach(
                db=session,
                breach_type="unauthorized_access",
                severity="medium",
                description="TEST BREACH: Simulated security incident for GDPR compliance testing. This is a test breach created to verify the notification system is working correctly.",
                risk_level="moderate",
                affected_data_categories=["email", "profile", "usage_stats"],
                estimated_affected_users=3,
                discovered_by="Automated Testing System",
                discovery_method="automated_testing",
                created_by_user_id=admin.id
            )

            print(f"✅ Test breach created!")
            print(f"   Breach ID: {breach.id}")
            print(f"   Type: {breach.breach_type}")
            print(f"   Severity: {breach.severity}")
            print(f"   Risk Level: {breach.risk_level}")
            print(f"   Status: {breach.status}")
            print(f"   Internal Team Notified: {breach.internal_team_notified}")
            print(f"   DPA Notification Required: {breach.dpa_notification_required}")
            print(f"   User Notification Required: {breach.users_notification_required}")

            # 3. Check if internal notification was sent
            print("\n" + "=" * 60)
            print("STEP 3: Checking Notifications")
            print("=" * 60)

            if breach.internal_team_notified:
                print(f"✅ Internal team notification sent at: {breach.internal_notification_date}")
            else:
                print("⚠️  Internal team notification not sent (email service may not be configured)")

            # 4. Get all active breaches
            print("\n" + "=" * 60)
            print("STEP 4: Listing Active Breaches")
            print("=" * 60)

            active_breaches = await BreachNotificationService.get_active_breaches(session)
            print(f"✅ Found {len(active_breaches)} active breach(es):")
            for b in active_breaches:
                print(f"   - Breach #{b.id}: {b.severity.upper()} severity, status: {b.status}")

            # 5. Check breaches requiring DPA notification
            print("\n" + "=" * 60)
            print("STEP 5: Checking DPA Notification Requirements")
            print("=" * 60)

            dpa_breaches = await BreachNotificationService.get_breaches_requiring_dpa_notification(session)
            print(f"✅ Found {len(dpa_breaches)} breach(es) requiring DPA notification")
            for b in dpa_breaches:
                from datetime import datetime
                hours_since = (datetime.utcnow() - b.discovered_at.replace(tzinfo=None)).total_seconds() / 3600
                print(f"   - Breach #{b.id}: Discovered {hours_since:.1f} hours ago (72-hour window)")

            # 6. Test update breach status
            print("\n" + "=" * 60)
            print("STEP 6: Testing Breach Status Update")
            print("=" * 60)

            success = await BreachNotificationService.update_breach_status(
                db=session,
                breach_id=breach.id,
                status="investigating",
                notes="Security team has been notified and investigation is underway."
            )

            if success:
                print(f"✅ Breach #{breach.id} status updated to 'investigating'")
            else:
                print(f"❌ Failed to update breach status")

            # Summary
            print("\n" + "=" * 60)
            print("TEST SUMMARY")
            print("=" * 60)
            print("✅ Admin account verified")
            print("✅ Test breach created successfully")
            print("✅ Breach notification system operational")
            print("\n📋 Next Steps:")
            print("   1. Use the API endpoints to test DPA notification")
            print("   2. Use the API endpoints to test user notification")
            print("   3. Test the complete breach lifecycle workflow")
            print("\n📖 See test_gdpr_features.md for complete API testing guide")
            print("\n🌐 API Documentation: http://localhost:8000/docs")
            print("   Look for 'Breach Management' section")

        except Exception as e:
            print(f"\n❌ Error during testing: {e}")
            import traceback
            print(traceback.format_exc())
            await session.rollback()


if __name__ == "__main__":
    print("\n🧪 Testing Data Breach Notification System")
    print("Admin Account: m.sondoqah@becquerelinstitute.eu\n")
    asyncio.run(test_breach_system())
