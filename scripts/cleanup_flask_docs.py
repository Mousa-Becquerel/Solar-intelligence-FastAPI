"""
Flask Documentation Cleanup Script

This script removes all Flask-related documentation files
and deployment scripts from the codebase.

Run with --dry-run to see what would be deleted.
Run with --execute to perform the actual deletion.
"""
import os
import shutil
import argparse
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Documentation files to remove (Flask-related)
DOCS_TO_REMOVE = [
    # Root level Flask migration docs
    "ADMIN_PAGES_MIGRATION_PLAN.md",
    "CLEANUP_COMPLETE.md",
    "CRITICAL_FIX_COMPLETE.md",
    "DATABASE_SCHEMA_FINAL.md",
    "MIGRATION_CLEANUP_GUIDE.md",

    # Docs folder Flask references
    "docs/PHASE1_REFACTORING_PLAN.md",
    "docs/PHASE1_REFACTORING_SUMMARY.md",
    "docs/PHASE1_FINAL_SUMMARY.md",
    "docs/PHASE1_COMPLETE_SUMMARY.md",
    "docs/IMPLEMENTATION_PLAN.md",
    "docs/CLEAN_ARCHITECTURE_IMPLEMENTATION_PLAN.md",
    "docs/CHATBOT_MODULARIZATION_PLAN.md",
    "docs/DATABASE_MIGRATION_PLAN.md",
    "docs/REACT_MIGRATION_PLAN.md",
    "docs/REACT_MIGRATION_CHECKLIST.md",
    "docs/MIGRATION_ROADMAP.md",
    "docs/MIGRATION_VERIFICATION.md",

    # Archive folder (entire folder can go)
    "docs/archive/",
]

# Deployment scripts to update (keep but update)
SCRIPTS_TO_UPDATE = [
    "deployment/scripts/secure_production.py",
    "deployment/scripts/update_deployment.py",
]

# Files to KEEP (important!)
KEEP_FILES = [
    "docs/",  # Keep docs folder itself
    "deployment/",  # Keep deployment folder
    "README.md",
    "docs/README.md",
    "docs/ARCHITECTURE_DIAGRAM.md",
    "docs/comprehensive-user-guide.md",
    "docs/pv-market-analysis-user-guide.md",
]


def check_item_exists(item_path):
    """Check if file or directory exists"""
    return item_path.exists()


def get_size(path):
    """Get size of file or directory in MB"""
    if path.is_file():
        return path.stat().st_size / (1024 * 1024)
    elif path.is_dir():
        total = sum(f.stat().st_size for f in path.rglob('*') if f.is_file())
        return total / (1024 * 1024)
    return 0


def dry_run():
    """Show what would be deleted without actually deleting"""
    print("=" * 70)
    print("DRY RUN - Flask Documentation Cleanup Preview")
    print("=" * 70)
    print("\nThe following items will be REMOVED:\n")

    total_size = 0
    items_found = []
    items_not_found = []

    for item in DOCS_TO_REMOVE:
        item_path = BASE_DIR / item
        if check_item_exists(item_path):
            size = get_size(item_path)
            total_size += size
            item_type = "DIR " if item_path.is_dir() else "FILE"
            print(f"  [{item_type}] {item:50} ({size:8.2f} MB)")
            items_found.append(item)
        else:
            items_not_found.append(item)

    print("\n" + "-" * 70)
    print(f"Total items to remove: {len(items_found)}")
    print(f"Total size: {total_size:.2f} MB")
    print("-" * 70)

    if items_not_found:
        print(f"\nItems already removed or not found: {len(items_not_found)}")
        for item in items_not_found[:10]:
            print(f"  - {item}")
        if len(items_not_found) > 10:
            print(f"  ... and {len(items_not_found) - 10} more")

    print("\n" + "=" * 70)
    print("IMPORTANT: These files will be KEPT:")
    print("=" * 70)
    for item in KEEP_FILES:
        item_path = BASE_DIR / item
        if check_item_exists(item_path):
            print(f"  [OK] {item}")

    print("\n" + "=" * 70)
    print("To execute the cleanup, run:")
    print("  python scripts/cleanup_flask_docs.py --execute")
    print("=" * 70)


def execute_cleanup():
    """Actually delete the files"""
    print("=" * 70)
    print("EXECUTING Flask Documentation Cleanup")
    print("=" * 70)
    print("\nRemoving Flask-related documentation...\n")

    removed_count = 0
    failed_count = 0

    for item in DOCS_TO_REMOVE:
        item_path = BASE_DIR / item
        if check_item_exists(item_path):
            try:
                if item_path.is_dir():
                    shutil.rmtree(item_path)
                    print(f"  [OK] Removed directory: {item}")
                else:
                    item_path.unlink()
                    print(f"  [OK] Removed file: {item}")
                removed_count += 1
            except Exception as e:
                print(f"  [FAIL] Failed to remove {item}: {e}")
                failed_count += 1

    print("\n" + "=" * 70)
    print(f"Cleanup completed!")
    print(f"  Items removed: {removed_count}")
    print(f"  Items failed: {failed_count}")
    print("=" * 70)

    if failed_count > 0:
        print("\nSome items could not be removed. You may need to:")
        print("  1. Close any programs using these files")
        print("  2. Run the script with administrator privileges")
        print("  3. Manually delete the failed items")


def main():
    parser = argparse.ArgumentParser(description="Clean up Flask-related documentation")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete the files"
    )

    args = parser.parse_args()

    if args.execute:
        print("\n[WARNING] This will permanently delete Flask-related documentation!")
        response = input("Are you sure you want to continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Cleanup cancelled.")
            return
        execute_cleanup()
    elif args.dry_run:
        dry_run()
    else:
        print("Please specify either --dry-run or --execute")
        print("\nUsage:")
        print("  python scripts/cleanup_flask_docs.py --dry-run   # Preview")
        print("  python scripts/cleanup_flask_docs.py --execute   # Delete")


if __name__ == "__main__":
    main()
