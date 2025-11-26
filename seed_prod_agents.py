"""
Seed production database with agent configurations
Run this script to ensure all agents are properly configured in production RDS
"""
import asyncio
import sys
import os

# Add fastapi_app to path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'fastapi_app'))

# Override database URL to use production RDS
os.environ['FASTAPI_DATABASE_URL'] = 'postgresql+asyncpg://solar_admin_v2:Datahub1_@solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com:5432/solar_intelligence_v2'

from fastapi_app.db.seed_agents import seed_agent_access, verify_agent_access
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

async def main():
    logger.info("🚀 Seeding production database agents...")
    logger.info("📍 Database: solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com")

    try:
        await seed_agent_access()
        await verify_agent_access()
        logger.info("✅ Production agent seeding complete!")
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
