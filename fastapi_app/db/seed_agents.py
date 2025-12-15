"""
Seed Agent Access Configuration

Initializes the AgentAccess table with correct plan requirements
matching the frontend agent metadata.

Plan hierarchy:
- free: All users can access (Alex, Emma, Finn, Priya, Aniza, Sam)
- analyst: Paid plan, same agents as free but unlimited queries
- strategist: Paid plan, includes Nova and Nina
- enterprise: Full access + custom integrations

Premium agents requiring 'strategist' plan:
- digitalization (Nova)
- nzia_market_impact (Nina)

Analyst plan agents:
- quality (Quinn)

Fallback agents (available to free users after main queries exhausted):
- seamless (Sam) - 10 queries/day
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
        "description": "Market Intelligence Agent (Alex) - Provides market trends and analysis",
        "is_enabled": True,
        "available_in_fallback": False
    },
    {
        "agent_type": "news",
        "required_plan": "free",
        "description": "News Agent (Emma) - Latest solar industry news and updates",
        "is_enabled": True,
        "available_in_fallback": False
    },
    {
        "agent_type": "digitalization",
        "required_plan": "strategist",
        "description": "Digitalization Trends Agent (Nova) - Digital transformation in solar (Strategist)",
        "is_enabled": True,
        "available_in_fallback": False
    },
    {
        "agent_type": "nzia_policy",
        "required_plan": "free",
        "description": "NZIA Policy Agent (Aniza) - European NZIA policy analysis",
        "is_enabled": True,
        "available_in_fallback": False
    },
    {
        "agent_type": "nzia_market_impact",
        "required_plan": "strategist",
        "description": "NZIA Market Impact Agent (Nina) - EU market impact analysis (Strategist)",
        "is_enabled": True,
        "available_in_fallback": False
    },
    {
        "agent_type": "manufacturer_financial",
        "required_plan": "free",
        "description": "Manufacturer Financial Agent (Finn) - Financial analysis of PV manufacturers",
        "is_enabled": True,
        "available_in_fallback": False
    },
    {
        "agent_type": "component_prices",
        "required_plan": "free",
        "description": "Component Prices Agent (Priya) - PV component and raw material price analysis",
        "is_enabled": True,
        "available_in_fallback": False
    },
    {
        "agent_type": "seamless",
        "required_plan": "free",
        "description": "IPV Expert Agent (Sam) - Integrated PV analysis (BIPV, AgriPV, VIPV)",
        "is_enabled": True,
        "available_in_fallback": True  # Sam is available in fallback mode
    },
    {
        "agent_type": "quality",
        "required_plan": "analyst",
        "description": "PV Risk & Reliability Expert (Quinn) - Technical analysis for PV system risks, reliability, and bankability (Analyst)",
        "is_enabled": True,
        "available_in_fallback": False
    },
    {
        "agent_type": "storage_optimization",
        "required_plan": "free",
        "description": "Storage Optimization Expert (Eco) - Battery storage system sizing with solar PV and financial analysis",
        "is_enabled": True,
        "available_in_fallback": False
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
                    existing_agent.available_in_fallback = config.get("available_in_fallback", False)
                    updated_count += 1
                    fallback_str = " [FALLBACK]" if config.get("available_in_fallback") else ""
                    logger.info(f"   ✏️  Updated: {agent_type} (required_plan={config['required_plan']}){fallback_str}")
                else:
                    # Create new agent
                    new_agent = AgentAccess(
                        agent_type=agent_type,
                        required_plan=config["required_plan"],
                        description=config["description"],
                        is_enabled=config["is_enabled"],
                        available_in_fallback=config.get("available_in_fallback", False)
                    )
                    db.add(new_agent)
                    created_count += 1
                    fallback_str = " [FALLBACK]" if config.get("available_in_fallback") else ""
                    logger.info(f"   ➕ Created: {agent_type} (required_plan={config['required_plan']}){fallback_str}")

            await db.commit()

            logger.info(f"✅ Agent access seeding complete:")
            logger.info(f"   - Created: {created_count} agents")
            logger.info(f"   - Updated: {updated_count} agents")
            logger.info(f"   - Total: {len(AGENT_CONFIGURATIONS)} agents configured")
            logger.info(f"   - Strategist agents: digitalization (Nova), nzia_market_impact (Nina)")
            logger.info(f"   - Analyst agents: quality (Quinn)")
            logger.info(f"   - Free agents: market, news, nzia_policy, manufacturer_financial, component_prices, seamless, storage_optimization")
            logger.info(f"   - Fallback agents: seamless (Sam)")

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
                plan_emoji = "💎" if agent.required_plan == "strategist" else "🆓"
                fallback_emoji = "🔄" if getattr(agent, 'available_in_fallback', False) else ""
                logger.info(
                    f"   {status} {plan_emoji} {agent.agent_type}: "
                    f"required_plan={agent.required_plan}, enabled={agent.is_enabled} {fallback_emoji}"
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
                if nina_agent.required_plan == "strategist":
                    logger.info("   ✅ VERIFIED: nzia_market_impact (Nina) is STRATEGIST (correct)")
                else:
                    logger.warning(f"   ⚠️  WARNING: nzia_market_impact (Nina) requires '{nina_agent.required_plan}' (should be 'strategist')")
            else:
                logger.warning("   ⚠️  WARNING: nzia_market_impact (Nina) not found in database")

            # Check fallback agent
            result = await db.execute(
                select(AgentAccess).where(AgentAccess.agent_type == "seamless")
            )
            sam_agent = result.scalar_one_or_none()

            if sam_agent:
                if getattr(sam_agent, 'available_in_fallback', False):
                    logger.info("   ✅ VERIFIED: seamless (Sam) is FALLBACK agent (correct)")
                else:
                    logger.warning("   ⚠️  WARNING: seamless (Sam) is NOT marked as fallback agent")
            else:
                logger.warning("   ⚠️  WARNING: seamless (Sam) not found in database")

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
