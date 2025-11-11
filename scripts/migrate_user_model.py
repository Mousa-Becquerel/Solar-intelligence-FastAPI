"""
Database migration script to add usage tracking fields to User model

Run this script to update the database schema:
    python scripts/migrate_user_model.py
"""
import os
import sys
from datetime import datetime

# Add parent directory to path to import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from sqlalchemy import text

def migrate_database():
    """Add new columns to User table"""
    with app.app_context():
        try:
            print("Starting database migration...")

            # Check if columns already exist
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('user')]

            # Define new columns to add
            new_columns = {
                'plan_type': "VARCHAR(20) DEFAULT 'free'",
                'query_count': "INTEGER DEFAULT 0",
                'last_query_date': "TIMESTAMP",
                'plan_start_date': "TIMESTAMP",
                'plan_end_date': "TIMESTAMP",
                'monthly_query_count': "INTEGER DEFAULT 0",
                'last_reset_date': "TIMESTAMP"
            }

            # Add columns if they don't exist
            for column_name, column_type in new_columns.items():
                if column_name not in columns:
                    print(f"Adding column: {column_name}")
                    try:
                        db.session.execute(text(
                            f"ALTER TABLE \"user\" ADD COLUMN {column_name} {column_type}"
                        ))
                        db.session.commit()
                        print(f"✓ Added column: {column_name}")
                    except Exception as e:
                        print(f"✗ Error adding column {column_name}: {e}")
                        db.session.rollback()
                else:
                    print(f"↓ Column already exists: {column_name}")

            print("\n✓ Migration completed successfully!")

        except Exception as e:
            print(f"\n✗ Migration failed: {e}")
            db.session.rollback()
            raise


if __name__ == '__main__':
    print("=" * 60)
    print("User Model Migration Script")
    print("=" * 60)
    print()

    response = input("This will modify the database schema. Continue? (yes/no): ")

    if response.lower() in ['yes', 'y']:
        migrate_database()
    else:
        print("Migration cancelled.")
