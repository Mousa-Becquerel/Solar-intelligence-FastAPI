"""
Fix Agent Access Configuration

This script updates the agent_access table to ensure:
- Only nzia_market_impact (Nina) is premium
- All other visible agents are free
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi_app.db.database import get_db
from fastapi_app.db.models import AgentAccess
from sqlalchemy import select, update
from datetime import datetime


async def main():
    """Fix agent access configuration"""

    # Configuration: agent_type -> required_plan
    CORRECT_CONFIG = {
        'market': 'free',
        'news': 'free',
        'digitalization': 'free',
        'nzia_policy': 'free',
        'manufacturer_financial': 'free',
        'nzia_market_impact': 'premium',  # Only premium agent
        'price': 'free',
        'om': 'free',
        'weaviate': 'premium',  # Not shown but keep as premium
    }

    print("=" * 70)
    print("FIXING AGENT ACCESS CONFIGURATION")
    print("=" * 70)

    async for db in get_db():
        try:
            # Get current configuration
            result = await db.execute(select(AgentAccess))
            agents = result.scalars().all()

            print("\n📋 CURRENT CONFIGURATION:")
            print("-" * 70)
            for agent in agents:
                icon = "💎" if agent.required_plan == 'premium' else "🆓"
                print(f"{icon} {agent.agent_type:25} | {agent.required_plan:10} | enabled={agent.is_enabled}")

            # Update each agent
            print("\n🔧 APPLYING FIXES:")
            print("-" * 70)

            updated_count = 0
            for agent_type, correct_plan in CORRECT_CONFIG.items():
                result = await db.execute(
                    select(AgentAccess).where(AgentAccess.agent_type == agent_type)
                )
                agent = result.scalar_one_or_none()

                if agent:
                    if agent.required_plan != correct_plan:
                        old_plan = agent.required_plan
                        agent.required_plan = correct_plan
                        agent.updated_at = datetime.utcnow()
                        print(f"✅ Updated {agent_type:25} | {old_plan} → {correct_plan}")
                        updated_count += 1
                    else:
                        print(f"✓  {agent_type:25} | Already correct ({correct_plan})")
                else:
                    # Create if doesn't exist
                    new_agent = AgentAccess(
                        agent_type=agent_type,
                        required_plan=correct_plan,
                        is_enabled=True,
                        description=f"{agent_type.replace('_', ' ').title()} Agent",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_agent)
                    print(f"➕ Created {agent_type:25} | {correct_plan}")
                    updated_count += 1

            # Commit changes
            await db.commit()

            # Get updated configuration
            result = await db.execute(select(AgentAccess))
            agents = result.scalars().all()

            print("\n✨ NEW CONFIGURATION:")
            print("-" * 70)
            for agent in agents:
                icon = "💎" if agent.required_plan == 'premium' else "🆓"
                print(f"{icon} {agent.agent_type:25} | {agent.required_plan:10} | enabled={agent.is_enabled}")

            print("\n" + "=" * 70)
            print(f"✅ COMPLETED: {updated_count} agents updated")
            print("=" * 70)

        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            await db.rollback()
            raise
        finally:
            await db.close()
            break


if __name__ == "__main__":
    asyncio.run(main())
