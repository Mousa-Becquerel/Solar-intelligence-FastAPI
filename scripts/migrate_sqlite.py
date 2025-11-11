"""
SQLite Database Migration Script
Adds profile-related columns to User table
"""
import sqlite3
import os
from pathlib import Path

# Get the database path
BASE_DIR = Path(__file__).parent.parent
DB_PATH = BASE_DIR / "instance" / "chat_history.db"

# Alternative paths to check
ALT_PATHS = [
    BASE_DIR / "chat_history.db",
    BASE_DIR / "instance" / "app.db",
    BASE_DIR / "app.db",
]

def find_database():
    """Find the SQLite database file"""
    if DB_PATH.exists():
        return DB_PATH

    for path in ALT_PATHS:
        if path.exists():
            return path

    # List all .db files in directory
    print("Database not found in expected locations. Searching...")
    for db_file in BASE_DIR.rglob("*.db"):
        if 'venv' not in str(db_file) and 'site-packages' not in str(db_file):
            print(f"Found: {db_file}")
            response = input(f"Use this database? (yes/no): ")
            if response.lower() in ['yes', 'y']:
                return db_file

    return None

def run_migration():
    """Add new columns to User table"""
    db_path = find_database()

    if not db_path:
        print("❌ Could not find database file!")
        print(f"   Expected location: {DB_PATH}")
        print("\nPlease specify the database path manually or create it first.")
        return False

    print(f"✓ Using database: {db_path}")
    print()

    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get existing columns
        cursor.execute("PRAGMA table_info(user)")
        existing_columns = {row[1] for row in cursor.fetchall()}

        print("Existing columns in 'user' table:")
        for col in sorted(existing_columns):
            print(f"  - {col}")
        print()

        # Define new columns to add
        new_columns = {
            'plan_type': "VARCHAR(20) DEFAULT 'free'",
            'query_count': "INTEGER DEFAULT 0",
            'last_query_date': "TIMESTAMP",
            'plan_start_date': "TIMESTAMP",
            'plan_end_date': "TIMESTAMP",
            'monthly_query_count': "INTEGER DEFAULT 0",
            'last_reset_date': "TIMESTAMP",
        }

        print("Starting migration...")
        print("=" * 60)

        for column_name, column_type in new_columns.items():
            if column_name in existing_columns:
                print(f"↓ Column '{column_name}' already exists - skipping")
            else:
                try:
                    cursor.execute(f'ALTER TABLE user ADD COLUMN {column_name} {column_type}')
                    conn.commit()
                    print(f"✓ Added column: {column_name}")
                except Exception as e:
                    print(f"✗ Error adding column {column_name}: {e}")
                    conn.rollback()

        print("=" * 60)
        print()

        # Verify columns were added
        cursor.execute("PRAGMA table_info(user)")
        all_columns = [row[1] for row in cursor.fetchall()]

        print("Final columns in 'user' table:")
        for col in sorted(all_columns):
            marker = "✓" if col in new_columns else " "
            print(f"  {marker} {col}")

        conn.close()

        print()
        print("=" * 60)
        print("✓ Migration completed successfully!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Restart your Docker container: docker-compose restart")
        print("2. Navigate to: http://127.0.0.1:5000/profile")
        print()

        return True

    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("SQLite Database Migration - Profile Columns")
    print("=" * 60)
    print()

    run_migration()
