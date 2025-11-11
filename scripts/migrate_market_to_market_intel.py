"""
Database Migration Script: Market Agent → Market Intelligence Agent
===================================================================

This script migrates existing conversations and hired agents from the old
'market' agent type to the new 'market_intel' agent type.

The market_intel agent replaces the old market agent with improved capabilities:
- Streaming responses
- Multi-agent workflow (Classification → Intelligence → Plotting)
- OpenAI Agents SDK with code interpreter
- Better plotting capabilities (line, bar, stacked_bar)

Usage:
    python scripts/migrate_market_to_market_intel.py [--dry-run]

Options:
    --dry-run    Show what would be changed without making actual changes
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import db, Conversation, HiredAgent
from app import app
import argparse


def migrate_conversations(dry_run=False):
    """Migrate all conversations from 'market' to 'market_intel' agent type"""
    with app.app_context():
        # Find all conversations using 'market' agent
        market_conversations = Conversation.query.filter_by(agent_type='market').all()

        count = len(market_conversations)
        print(f"\n📊 Found {count} conversation(s) using 'market' agent")

        if count == 0:
            print("✅ No conversations to migrate")
            return 0

        if dry_run:
            print("\n🔍 DRY RUN - Would update the following conversations:")
            for conv in market_conversations:
                print(f"  - Conversation ID: {conv.id}, User ID: {conv.user_id}, Title: {conv.title}")
            print(f"\n⚠️  DRY RUN COMPLETE - No actual changes made")
            return count

        # Perform actual migration
        print(f"\n🔄 Migrating {count} conversation(s)...")
        for conv in market_conversations:
            conv.agent_type = 'market_intel'
            print(f"  ✓ Updated conversation {conv.id}: '{conv.title}'")

        try:
            db.session.commit()
            print(f"\n✅ Successfully migrated {count} conversation(s) from 'market' to 'market_intel'")
            return count
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error during migration: {e}")
            raise


def migrate_hired_agents(dry_run=False):
    """Migrate all hired_agents records from 'market' to 'market_intel' agent type"""
    with app.app_context():
        # Find all hired agents with 'market' agent type
        market_hired = HiredAgent.query.filter_by(agent_type='market').all()

        count = len(market_hired)
        print(f"\n📊 Found {count} hired agent record(s) for 'market' agent")

        if count == 0:
            print("✅ No hired agents to migrate")
            return 0

        if dry_run:
            print("\n🔍 DRY RUN - Would update the following hired agents:")
            for hired in market_hired:
                print(f"  - User ID: {hired.user_id}, Hired at: {hired.hired_at}")
            print(f"\n⚠️  DRY RUN COMPLETE - No actual changes made")
            return count

        # Perform actual migration
        print(f"\n🔄 Migrating {count} hired agent record(s)...")
        for hired in market_hired:
            hired.agent_type = 'market_intel'
            print(f"  ✓ Updated hired agent for user {hired.user_id}")

        try:
            db.session.commit()
            print(f"\n✅ Successfully migrated {count} hired agent record(s) from 'market' to 'market_intel'")
            return count
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error during migration: {e}")
            raise


def main():
    """Main migration function"""
    parser = argparse.ArgumentParser(
        description='Migrate database from market agent to market_intel agent'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be changed without making actual changes'
    )

    args = parser.parse_args()

    print("=" * 70)
    print("  Database Migration: Market Agent → Market Intelligence Agent")
    print("=" * 70)

    if args.dry_run:
        print("\n⚠️  DRY RUN MODE - No actual changes will be made\n")

    try:
        # Migrate conversations
        conv_count = migrate_conversations(dry_run=args.dry_run)

        # Migrate hired agents
        hired_count = migrate_hired_agents(dry_run=args.dry_run)

        # Summary
        print("\n" + "=" * 70)
        print("  Migration Summary")
        print("=" * 70)
        print(f"  Conversations: {conv_count}")
        print(f"  Hired Agents:  {hired_count}")
        print(f"  Total:         {conv_count + hired_count}")

        if args.dry_run:
            print("\n⚠️  This was a DRY RUN - run without --dry-run to apply changes")
        else:
            print("\n✅ Migration completed successfully!")

        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
