"""
Seed Agent Access Configuration

Initializes the AgentAccess table with correct plan requirements
matching the frontend agent metadata.

According to frontend metadata (react-frontend/src/constants/agentMetadata.ts):
- ONLY nzia_market_impact (Nina) is premium
- ALL other agents should be available on free plan
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from fastapi_app.db.models import AgentAccess
from fastapi_app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


AGENT_CONFIGURATIONS = [
    {
        "agent_type": "market",
        "required_plan": "free",
        "description": "Market Intelligence Agent - Provides market trends and analysis",
        "is_enabled": True
    },
    {
        "agent_type": "news",
        "required_plan": "free",
        "description": "News Agent - Latest solar industry news and updates",
        "is_enabled": True
    },
    {
        "agent_type": "digitalization",
        "required_plan": "free",
        "description": "Digitalization Trends Agent - Digital transformation in solar",
        "is_enabled": True
    },
    {
        "agent_type": "nzia_policy",
        "required_plan": "free",
        "description": "NZIA Policy Agent - European NZIA policy analysis",
        "is_enabled": True
    },
    {
        "agent_type": "nzia_market_impact",
        "required_plan": "premium",
        "description": "NZIA Market Impact Agent - EU market impact analysis (Premium)",
        "is_enabled": True
    },
    {
        "agent_type": "manufacturer_financial",
        "required_plan": "free",
        "description": "Manufacturer Financial Agent - Financial analysis of PV manufacturers",
        "is_enabled": True
    }
]


async def seed_agent_access():
    """
    Seed the AgentAccess table with correct configurations

    This function is idempotent - it can be run multiple times safely.
    It will create missing agents or update existing ones.
    """
    async with AsyncSessionLocal() as db:
        try:
            logger.info("🌱 Seeding agent access configurations...")

            created_count = 0
            updated_count = 0

            for config in AGENT_CONFIGURATIONS:
                agent_type = config["agent_type"]

                # Check if agent already exists
                result = await db.execute(
                    select(AgentAccess).where(AgentAccess.agent_type == agent_type)
                )
                existing_agent = result.scalar_one_or_none()

                if existing_agent:
                    # Update existing agent
                    existing_agent.required_plan = config["required_plan"]
                    existing_agent.description = config["description"]
                    existing_agent.is_enabled = config["is_enabled"]
                    updated_count += 1
                    logger.info(f"   ✏️  Updated: {agent_type} (required_plan={config['required_plan']})")
                else:
                    # Create new agent
                    new_agent = AgentAccess(
                        agent_type=agent_type,
                        required_plan=config["required_plan"],
                        description=config["description"],
                        is_enabled=config["is_enabled"]
                    )
                    db.add(new_agent)
                    created_count += 1
                    logger.info(f"   ➕ Created: {agent_type} (required_plan={config['required_plan']})")

            await db.commit()

            logger.info(f"✅ Agent access seeding complete:")
            logger.info(f"   - Created: {created_count} agents")
            logger.info(f"   - Updated: {updated_count} agents")
            logger.info(f"   - Total: {len(AGENT_CONFIGURATIONS)} agents configured")
            logger.info(f"   - Premium agents: nzia_market_impact")
            logger.info(f"   - Free agents: market, news, digitalization, nzia_policy, manufacturer_financial")

        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Error seeding agent access: {e}")
            raise


async def verify_agent_access():
    """Verify agent access configuration is correct"""
    async with AsyncSessionLocal() as db:
        try:
            logger.info("🔍 Verifying agent access configuration...")

            result = await db.execute(select(AgentAccess))
            all_agents = result.scalars().all()

            logger.info(f"   Total agents in database: {len(all_agents)}")

            for agent in all_agents:
                status = "✅" if agent.is_enabled else "❌"
                plan_emoji = "💎" if agent.required_plan == "premium" else "🆓"
                logger.info(
                    f"   {status} {plan_emoji} {agent.agent_type}: "
                    f"required_plan={agent.required_plan}, enabled={agent.is_enabled}"
                )

            # Check critical agents
            result = await db.execute(
                select(AgentAccess).where(AgentAccess.agent_type == "manufacturer_financial")
            )
            finn_agent = result.scalar_one_or_none()

            if finn_agent:
                if finn_agent.required_plan == "free":
                    logger.info("   ✅ VERIFIED: manufacturer_financial (Finn) is FREE (correct)")
                else:
                    logger.warning(f"   ⚠️  WARNING: manufacturer_financial (Finn) requires '{finn_agent.required_plan}' (should be 'free')")
            else:
                logger.warning("   ⚠️  WARNING: manufacturer_financial (Finn) not found in database")

            result = await db.execute(
                select(AgentAccess).where(AgentAccess.agent_type == "nzia_market_impact")
            )
            nina_agent = result.scalar_one_or_none()

            if nina_agent:
                if nina_agent.required_plan == "premium":
                    logger.info("   ✅ VERIFIED: nzia_market_impact (Nina) is PREMIUM (correct)")
                else:
                    logger.warning(f"   ⚠️  WARNING: nzia_market_impact (Nina) requires '{nina_agent.required_plan}' (should be 'premium')")
            else:
                logger.warning("   ⚠️  WARNING: nzia_market_impact (Nina) not found in database")

        except Exception as e:
            logger.error(f"❌ Error verifying agent access: {e}")
            raise


if __name__ == "__main__":
    import asyncio

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    # Run seeding
    asyncio.run(seed_agent_access())
    asyncio.run(verify_agent_access())
