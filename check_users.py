import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_users():
    engine = create_async_engine(
        'postgresql+asyncpg://solar_admin_v2:Datahub1_@solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com:5432/solar_intelligence_v2'
    )

    async with engine.connect() as conn:
        # Count total users
        result = await conn.execute(text('SELECT COUNT(*) FROM fastapi_users'))
        total = result.scalar()
        print(f'📊 Total users in production database: {total}')

        # Show recent users
        result = await conn.execute(
            text('SELECT id, username, created_at, is_active, email_verified FROM fastapi_users ORDER BY created_at DESC LIMIT 10')
        )
        users = result.fetchall()
        print(f'\n📋 Recent users:')
        for user in users:
            print(f'  - ID: {user[0]}, Email: {user[1]}, Created: {user[2]}, Active: {user[3]}, Verified: {user[4]}')

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_users())
