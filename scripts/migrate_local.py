"""
SQLite Migration for Local Development
"""
import sqlite3
from pathlib import Path

# Find database
BASE_DIR = Path(__file__).parent.parent
db_paths = [
    BASE_DIR / "instance" / "chat_history.db",
    BASE_DIR / "chat_history.db",
]

db_path = None
for path in db_paths:
    if path.exists():
        db_path = path
        break

if not db_path:
    print("ERROR: Could not find database file!")
    print("Checked locations:")
    for path in db_paths:
        print(f"  - {path}")
    exit(1)

print("=" * 60)
print("SQLite Migration - Profile Columns")
print("=" * 60)
print(f"Database: {db_path}")
print()

# Connect and migrate
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get existing columns
cursor.execute("PRAGMA table_info(user)")
existing = {row[1] for row in cursor.fetchall()}

# Define new columns
new_cols = {
    'plan_type': "VARCHAR(20) DEFAULT 'free'",
    'query_count': "INTEGER DEFAULT 0",
    'last_query_date': "TIMESTAMP",
    'plan_start_date': "TIMESTAMP",
    'plan_end_date': "TIMESTAMP",
    'monthly_query_count': "INTEGER DEFAULT 0",
    'last_reset_date': "TIMESTAMP",
}

print("Migrating...")
for col_name, col_type in new_cols.items():
    if col_name in existing:
        print(f"  [SKIP] {col_name} (already exists)")
    else:
        try:
            cursor.execute(f'ALTER TABLE user ADD COLUMN {col_name} {col_type}')
            conn.commit()
            print(f"  [OK]   Added {col_name}")
        except Exception as e:
            print(f"  [ERR]  {col_name}: {e}")
            conn.rollback()

conn.close()

print()
print("=" * 60)
print("Migration Complete!")
print("=" * 60)
print()
print("Next: Restart your local Flask app and go to /profile")
