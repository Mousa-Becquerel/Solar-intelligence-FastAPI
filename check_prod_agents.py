"""
Check what agents are currently in the production RDS database
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_agents():
    engine = create_async_engine(
        'postgresql+asyncpg://solar_admin_v2:Datahub1_@solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com:5432/solar_intelligence_v2'
    )

    async with engine.connect() as conn:
        # Check if agent_access table exists
        result = await conn.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='agent_access'")
        )
        tables = result.fetchall()

        if not tables:
            print('❌ agent_access table does not exist!')
            return

        # Get all agents
        result = await conn.execute(
            text('SELECT id, agent_type, required_plan, description, is_enabled FROM agent_access ORDER BY id')
        )
        agents = result.fetchall()

        print(f'📊 Total agents in production database: {len(agents)}\n')

        if agents:
            print('📋 Current agents:')
            for agent in agents:
                status = '✅' if agent[4] else '❌'
                plan = '💎 PREMIUM' if agent[2] == 'premium' else '🆓 FREE'
                print(f'  {status} [{agent[0]}] {agent[1]:<25} {plan:<15} - {agent[3]}')
        else:
            print('⚠️  No agents found in database!')

        # Expected agents from seed_agents.py
        expected = [
            'market', 'news', 'digitalization', 'nzia_policy',
            'nzia_market_impact', 'manufacturer_financial', 'component_prices', 'seamless'
        ]

        current_types = [agent[1] for agent in agents]
        missing = [t for t in expected if t not in current_types]
        extra = [t for t in current_types if t not in expected]

        if missing:
            print(f'\n⚠️  Missing agents: {", ".join(missing)}')
        if extra:
            print(f'\n⚠️  Extra/Old agents: {", ".join(extra)}')

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_agents())
