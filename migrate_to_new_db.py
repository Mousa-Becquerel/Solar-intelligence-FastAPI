"""
Data Migration Script: Old Flask DB → New FastAPI DB
Migrates all production data to new RDS instance with new schema
"""
import asyncio
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from fastapi_app.db.models import Base

# ============================================================================
# Configuration
# ============================================================================

# OLD DATABASE (Production Flask)
OLD_DB_URL = "postgresql://solar_admin:datahub1@solar-intelligence-db.cp6wsmk62efj.eu-north-1.rds.amazonaws.com:5432/solar_intelligence"

# NEW DATABASE (will be provided after RDS creation)
NEW_DB_URL = "postgresql+asyncpg://solar_admin_v2:Datahub1_@solar-intelligence-v2.cp6wsmk62efj.eu-north-1.rds.amazonaws.com:5432/solar_intelligence_v2"

# ============================================================================
# Migration Functions
# ============================================================================

def get_sync_engine(db_url):
    """Create synchronous engine for old database"""
    return create_engine(db_url.replace('+asyncpg', ''))


def get_async_engine(db_url):
    """Create async engine for new database"""
    return create_async_engine(db_url, echo=False)


async def init_new_database(new_db_url):
    """Initialize new database schema"""
    print("=" * 80)
    print("STEP 1: Initializing New Database Schema")
    print("=" * 80)

    engine = get_async_engine(new_db_url)

    async with engine.begin() as conn:
        # Create all tables from FastAPI models
        await conn.run_sync(Base.metadata.create_all)

    print("✅ All FastAPI tables created successfully!")
    await engine.dispose()


async def migrate_users(old_db_url, new_db_url):
    """Migrate users from old 'user' table to new 'fastapi_users' table"""
    print("\n" + "=" * 80)
    print("STEP 2: Migrating Users")
    print("=" * 80)

    # Connect to old DB (sync)
    old_engine = get_sync_engine(old_db_url)

    # Connect to new DB (async)
    new_engine = get_async_engine(new_db_url)
    AsyncSessionLocal = sessionmaker(new_engine, class_=AsyncSession, expire_on_commit=False)

    with old_engine.connect() as old_conn:
        # Fetch all users from old database
        result = old_conn.execute(text('SELECT * FROM "user" ORDER BY id'))
        users = result.fetchall()
        columns = result.keys()

        print(f"Found {len(users)} users to migrate")

        async with AsyncSessionLocal() as new_session:
            migrated = 0
            errors = 0

            for user in users:
                try:
                    user_dict = dict(zip(columns, user))

                    # Map old schema to new schema
                    insert_query = text("""
                        INSERT INTO fastapi_users (
                            id, username, password_hash, full_name, role, is_active, created_at,
                            email_verified, verification_token, verification_token_expiry,
                            reset_token, reset_token_expiry,
                            gdpr_consent_given, gdpr_consent_date,
                            terms_accepted, terms_accepted_date,
                            marketing_consent, marketing_consent_date,
                            privacy_policy_version, terms_version,
                            plan_type, query_count, last_query_date,
                            plan_start_date, plan_end_date,
                            monthly_query_count, last_reset_date,
                            deleted, deletion_requested_at, deletion_reason,
                            processing_restricted, restriction_requested_at,
                            restriction_reason, restriction_grounds
                        ) VALUES (
                            :id, :username, :password_hash, :full_name, :role, :is_active, :created_at,
                            true, NULL, NULL,
                            :reset_token, :reset_token_expiry,
                            :gdpr_consent_given, :gdpr_consent_date,
                            :terms_accepted, :terms_accepted_date,
                            :marketing_consent, :marketing_consent_date,
                            :privacy_policy_version, :terms_version,
                            :plan_type, :query_count, :last_query_date,
                            :plan_start_date, :plan_end_date,
                            :monthly_query_count, :last_reset_date,
                            :deleted, :deletion_requested_at, :deletion_reason,
                            false, NULL, NULL, NULL
                        )
                    """)

                    await new_session.execute(insert_query, user_dict)
                    migrated += 1

                    if migrated % 10 == 0:
                        print(f"  Migrated {migrated}/{len(users)} users...")

                except Exception as e:
                    errors += 1
                    print(f"  ❌ Error migrating user {user_dict.get('username')}: {e}")

            await new_session.commit()

    print(f"\n✅ User migration complete: {migrated} migrated, {errors} errors")
    await new_engine.dispose()


async def migrate_conversations(old_db_url, new_db_url):
    """Migrate conversations"""
    print("\n" + "=" * 80)
    print("STEP 3: Migrating Conversations")
    print("=" * 80)

    old_engine = get_sync_engine(old_db_url)
    new_engine = get_async_engine(new_db_url)
    AsyncSessionLocal = sessionmaker(new_engine, class_=AsyncSession, expire_on_commit=False)

    with old_engine.connect() as old_conn:
        result = old_conn.execute(text('SELECT * FROM conversation ORDER BY id'))
        conversations = result.fetchall()
        columns = result.keys()

        print(f"Found {len(conversations)} conversations to migrate")

        async with AsyncSessionLocal() as new_session:
            migrated = 0
            errors = 0

            for conv in conversations:
                try:
                    conv_dict = dict(zip(columns, conv))

                    insert_query = text("""
                        INSERT INTO fastapi_conversations (
                            id, user_id, title, agent_type, created_at
                        ) VALUES (
                            :id, :user_id, :title, :agent_type, :created_at
                        )
                    """)

                    await new_session.execute(insert_query, conv_dict)
                    migrated += 1

                    if migrated % 100 == 0:
                        print(f"  Migrated {migrated}/{len(conversations)} conversations...")

                except Exception as e:
                    errors += 1
                    print(f"  ❌ Error migrating conversation {conv_dict.get('id')}: {e}")

            await new_session.commit()

    print(f"\n✅ Conversation migration complete: {migrated} migrated, {errors} errors")
    await new_engine.dispose()


async def migrate_messages(old_db_url, new_db_url):
    """Migrate messages"""
    print("\n" + "=" * 80)
    print("STEP 4: Migrating Messages")
    print("=" * 80)

    old_engine = get_sync_engine(old_db_url)
    new_engine = get_async_engine(new_db_url)
    AsyncSessionLocal = sessionmaker(new_engine, class_=AsyncSession, expire_on_commit=False)

    with old_engine.connect() as old_conn:
        result = old_conn.execute(text('SELECT * FROM message ORDER BY id'))
        messages = result.fetchall()
        columns = result.keys()

        print(f"Found {len(messages)} messages to migrate")

        async with AsyncSessionLocal() as new_session:
            migrated = 0
            errors = 0

            for msg in messages:
                try:
                    msg_dict = dict(zip(columns, msg))

                    # Map old schema fields to new schema
                    mapped_msg = {
                        'id': msg_dict['id'],
                        'conversation_id': msg_dict['conversation_id'],
                        'role': msg_dict.get('sender', msg_dict.get('role', 'user')),  # sender → role
                        'content': msg_dict['content'],
                        'created_at': msg_dict.get('timestamp', msg_dict.get('created_at'))  # timestamp → created_at
                    }

                    insert_query = text("""
                        INSERT INTO fastapi_messages (
                            id, conversation_id, role, content, created_at
                        ) VALUES (
                            :id, :conversation_id, :role, :content, :created_at
                        )
                    """)

                    await new_session.execute(insert_query, mapped_msg)
                    migrated += 1

                    if migrated % 500 == 0:
                        print(f"  Migrated {migrated}/{len(messages)} messages...")

                except Exception as e:
                    errors += 1
                    print(f"  ❌ Error migrating message {msg_dict.get('id')}: {e}")

            await new_session.commit()

    print(f"\n✅ Message migration complete: {migrated} migrated, {errors} errors")
    await new_engine.dispose()


async def migrate_hired_agents(old_db_url, new_db_url):
    """Migrate hired agents"""
    print("\n" + "=" * 80)
    print("STEP 5: Migrating Hired Agents")
    print("=" * 80)

    old_engine = get_sync_engine(old_db_url)
    new_engine = get_async_engine(new_db_url)
    AsyncSessionLocal = sessionmaker(new_engine, class_=AsyncSession, expire_on_commit=False)

    with old_engine.connect() as old_conn:
        result = old_conn.execute(text('SELECT * FROM hired_agent ORDER BY id'))
        agents = result.fetchall()
        columns = result.keys()

        print(f"Found {len(agents)} hired agents to migrate")

        async with AsyncSessionLocal() as new_session:
            migrated = 0
            errors = 0

            for agent in agents:
                try:
                    agent_dict = dict(zip(columns, agent))

                    insert_query = text("""
                        INSERT INTO fastapi_hired_agent (
                            id, user_id, agent_type, hired_at, is_active
                        ) VALUES (
                            :id, :user_id, :agent_type, :hired_at, :is_active
                        )
                    """)

                    await new_session.execute(insert_query, agent_dict)
                    migrated += 1

                except Exception as e:
                    errors += 1
                    print(f"  ❌ Error migrating agent {agent_dict.get('id')}: {e}")

            await new_session.commit()

    print(f"\n✅ Hired agents migration complete: {migrated} migrated, {errors} errors")
    await new_engine.dispose()


async def migrate_other_tables(old_db_url, new_db_url):
    """Migrate remaining tables: waitlist, contact_request, surveys, etc."""
    print("\n" + "=" * 80)
    print("STEP 6: Migrating Other Tables")
    print("=" * 80)

    old_engine = get_sync_engine(old_db_url)
    new_engine = get_async_engine(new_db_url)
    AsyncSessionLocal = sessionmaker(new_engine, class_=AsyncSession, expire_on_commit=False)

    # Define table mappings
    table_mappings = [
        ('waitlist', 'fastapi_waitlist', ['id', 'email', 'full_name', 'company', 'use_case', 'referral_source', 'created_at', 'status']),
        ('contact_request', 'fastapi_contact_requests', ['id', 'user_id', 'email', 'name', 'subject', 'message', 'status', 'created_at', 'resolved_at', 'resolved_by', 'resolution_notes', 'priority', 'category', 'phone']),
        ('user_survey', 'fastapi_user_survey', ['id', 'user_id', 'company_name', 'industry', 'project_type', 'system_size', 'timeline', 'budget_range', 'location', 'created_at']),
        ('user_survey_stage2', 'fastapi_user_survey_stage2', ['id', 'user_id', 'rating', 'feedback', 'features_requested', 'would_recommend', 'contact_for_followup', 'created_at', 'agent_feedback', 'ease_of_use', 'feature_satisfaction', 'improvement_suggestions']),
        ('agent_access', 'fastapi_agent_access', ['id', 'agent_type', 'required_plan', 'is_enabled', 'description', 'created_at', 'updated_at']),
        ('agent_whitelist', 'fastapi_agent_whitelist', ['id', 'user_id', 'agent_type', 'granted_at', 'granted_by', 'expires_at', 'reason', 'is_active']),
    ]

    async with AsyncSessionLocal() as new_session:
        for old_table, new_table, columns in table_mappings:
            try:
                with old_engine.connect() as old_conn:
                    result = old_conn.execute(text(f'SELECT * FROM {old_table} ORDER BY id'))
                    rows = result.fetchall()
                    old_columns = result.keys()

                    if len(rows) == 0:
                        print(f"  ⚠️  {old_table}: No data to migrate")
                        continue

                    print(f"\n  Migrating {old_table} → {new_table} ({len(rows)} rows)")

                    migrated = 0
                    for row in rows:
                        try:
                            row_dict = dict(zip(old_columns, row))

                            # Build dynamic insert query
                            cols_str = ', '.join(columns)
                            vals_str = ', '.join([f':{col}' for col in columns])

                            insert_query = text(f"""
                                INSERT INTO {new_table} ({cols_str})
                                VALUES ({vals_str})
                            """)

                            await new_session.execute(insert_query, row_dict)
                            migrated += 1

                        except Exception as e:
                            print(f"    ❌ Error migrating row {row_dict.get('id')}: {e}")

                    await new_session.commit()
                    print(f"  ✅ {old_table}: {migrated} rows migrated")

            except Exception as e:
                print(f"  ❌ Error migrating table {old_table}: {e}")

    await new_engine.dispose()


async def validate_migration(old_db_url, new_db_url):
    """Validate that migration was successful"""
    print("\n" + "=" * 80)
    print("STEP 7: Validating Migration")
    print("=" * 80)

    old_engine = get_sync_engine(old_db_url)
    new_engine = get_async_engine(new_db_url)
    AsyncSessionLocal = sessionmaker(new_engine, class_=AsyncSession, expire_on_commit=False)

    validations = []

    # Check user counts
    with old_engine.connect() as old_conn:
        old_user_count = old_conn.execute(text('SELECT COUNT(*) FROM "user"')).scalar()

    async with AsyncSessionLocal() as new_session:
        result = await new_session.execute(text('SELECT COUNT(*) FROM fastapi_users'))
        new_user_count = result.scalar()

    validations.append(('Users', old_user_count, new_user_count))

    # Check conversation counts
    with old_engine.connect() as old_conn:
        old_conv_count = old_conn.execute(text('SELECT COUNT(*) FROM conversation')).scalar()

    async with AsyncSessionLocal() as new_session:
        result = await new_session.execute(text('SELECT COUNT(*) FROM fastapi_conversations'))
        new_conv_count = result.scalar()

    validations.append(('Conversations', old_conv_count, new_conv_count))

    # Check message counts
    with old_engine.connect() as old_conn:
        old_msg_count = old_conn.execute(text('SELECT COUNT(*) FROM message')).scalar()

    async with AsyncSessionLocal() as new_session:
        result = await new_session.execute(text('SELECT COUNT(*) FROM fastapi_messages'))
        new_msg_count = result.scalar()

    validations.append(('Messages', old_msg_count, new_msg_count))

    # Check hired agents counts
    with old_engine.connect() as old_conn:
        old_agent_count = old_conn.execute(text('SELECT COUNT(*) FROM hired_agent')).scalar()

    async with AsyncSessionLocal() as new_session:
        result = await new_session.execute(text('SELECT COUNT(*) FROM fastapi_hired_agent'))
        new_agent_count = result.scalar()

    validations.append(('Hired Agents', old_agent_count, new_agent_count))

    # Print validation results
    print("\n📊 Validation Results:")
    print("-" * 80)
    all_valid = True
    for table, old_count, new_count in validations:
        status = "✅" if old_count == new_count else "❌"
        print(f"{status} {table:20s} Old: {old_count:6d}  New: {new_count:6d}  {'MATCH' if old_count == new_count else 'MISMATCH!'}")
        if old_count != new_count:
            all_valid = False

    print("-" * 80)
    if all_valid:
        print("✅ All validations passed! Migration successful!")
    else:
        print("⚠️  Some validations failed. Please review the mismatches above.")

    await new_engine.dispose()


async def main():
    """Main migration workflow"""
    print("\n" + "=" * 80)
    print("Solar Intelligence Database Migration")
    print("Old Flask DB → New FastAPI DB")
    print("=" * 80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    # Check configuration
    if "YOUR_NEW_PASSWORD" in NEW_DB_URL or "YOUR_NEW_ENDPOINT" in NEW_DB_URL:
        print("\n❌ ERROR: Please update NEW_DB_URL with actual values!")
        print("\nEdit this file and replace:")
        print("  - YOUR_NEW_PASSWORD with your database password")
        print("  - YOUR_NEW_ENDPOINT with your RDS endpoint")
        sys.exit(1)

    try:
        # Step 1: Initialize new database
        await init_new_database(NEW_DB_URL)

        # Step 2-6: Migrate data
        await migrate_users(OLD_DB_URL, NEW_DB_URL)
        await migrate_conversations(OLD_DB_URL, NEW_DB_URL)
        await migrate_messages(OLD_DB_URL, NEW_DB_URL)
        await migrate_hired_agents(OLD_DB_URL, NEW_DB_URL)
        await migrate_other_tables(OLD_DB_URL, NEW_DB_URL)

        # Step 7: Validate
        await validate_migration(OLD_DB_URL, NEW_DB_URL)

        print("\n" + "=" * 80)
        print("✅ MIGRATION COMPLETE!")
        print("=" * 80)
        print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("\nNext steps:")
        print("1. Review validation results above")
        print("2. Test login with an existing user")
        print("3. Update ECS task definition with new DATABASE_URL")
        print("4. Deploy to production")
        print("=" * 80)

    except Exception as e:
        print(f"\n❌ MIGRATION FAILED: {e}")
        import traceback
        print(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
