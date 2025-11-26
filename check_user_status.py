import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_user():
    engine = create_async_engine(
        'postgresql+asyncpg://solar_admin_v2:Datahub1_@solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com:5432/solar_intelligence_v2'
    )

    async with engine.connect() as conn:
        # Check migrated user
        result = await conn.execute(
            text('SELECT id, username, is_active, email_verified, password_hash FROM fastapi_users WHERE username = :username'),
            {'username': 'sondoqahmousa97@gmail.com'}
        )
        row = result.first()
        if row:
            print(f'User ID: {row[0]}')
            print(f'Username: {row[1]}')
            print(f'is_active: {row[2]}')
            print(f'email_verified: {row[3]}')
            print(f'Password hash format: {row[4][:50]}...')
        else:
            print("User not found")

        print("\n---\n")

        # Check new user
        result = await conn.execute(
            text('SELECT id, username, is_active, email_verified, verification_token FROM fastapi_users WHERE username = :username'),
            {'username': 'm.sondoqah@becquerelinstitute.eu'}
        )
        row = result.first()
        if row:
            print(f'New User ID: {row[0]}')
            print(f'Username: {row[1]}')
            print(f'is_active: {row[2]}')
            print(f'email_verified: {row[3]}')
            print(f'verification_token: {row[4][:30] if row[4] else None}...')
        else:
            print("New user not found")

    await engine.dispose()

asyncio.run(check_user())
