"""
Flask Cleanup Script

This script removes all Flask-related files and directories from the codebase.
Run with --dry-run to see what would be deleted without actually deleting.
Run with --execute to perform the actual deletion.
"""
import os
import shutil
import argparse
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Files and directories to remove
ITEMS_TO_REMOVE = [
    # Flask application
    "app/",

    # Flask configuration
    "run_refactored.py",
    "models.py",
    "app_config_bridge.py",

    # Flask Docker files
    "Dockerfile",  # Keep Dockerfile.fastapi
    "docker-compose.yml",  # Keep docker-compose.fastapi.yml
    "docker-compose.test.yml",

    # Templates and static files (replaced by React)
    "templates/",
    "static/",

    # Old Flask routes
    "routes/",

    # Flask migration scripts
    "migrations/",

    # Flask test files
    "tests/test_blueprints.py",
    "tests/test_services.py",
    "tests/test_new_config.py",
    "tests/test_simple_integration.py",
    "tests/test_refactored_integration.py",
    "tests/conftest.py",

    # Old agent files (if not used by FastAPI)
    "leo_om_agent.py",
    "module_prices_agent.py",
    "pydantic_weaviate_agent.py",
    "market_intelligence_agent.py.backup",
    "PV Manufacturer_analysis.py",
    "Aniza_Policy_Agent_TBA.py",

    # Old scripts
    "reset_user_password.py",
    "extract_and_move_styles.py",
    "remove_inline_scripts.py",
    "remove_inline_styles.py",

    # Flask deployment scripts
    "deployment/scripts/init_database.py",

    # Old documentation
    "ADMIN_SERVICE_COMPLETE.md",
    "AGENT_ACCESS_COMPLETE.md",
    "AGENT_ACCESS_FIX.md",
    "AGENT_MEMORY_ISSUE.md",
    "AGENT_SERVICE_COMPLETE.md",
    "AUTH_ENDPOINTS_COMPLETE.md",
    "AUTH_FEATURES_COMPLETE.md",
    "BACKEND_AUDIT_COMPLETE.md",
    "CHAT_PROCESSING_COMPLETE.md",
    "CLEANUP_COMPLETED.md",
    "CLEANUP_RECOMMENDATIONS.md",
    "CONNECTION_POOLING_COMPLETE.md",
    "CONVERSATION_ENDPOINTS_COMPLETE.md",
    "CONVERSATION_SERVICE_COMPLETE.md",
    "CONVERSATION_TESTS_COMPLETE.md",
    "FASTAPI_QUICKSTART.md",
    "FINAL_CLEANUP_SUMMARY.md",
    "FRONTEND_INTEGRATION_COMPLETE.md",
    "FRONTEND_INTEGRATION_GUIDE.md",
    "LANDING_PAGE_REFACTORING_COMPLETE.md",
    "LANDING_REACT_MIGRATION_READINESS.md",
    "LANDING_REFACTORING_SUCCESS.md",
    "MATERIAL_DESIGN_3_IMPLEMENTATION.md",
    "PHASE1_AUTHSERVICE_COMPLETE.md",
    "PHASE1_MIGRATION_SUMMARY.md",
    "PHASE1_SERVICE_MIGRATION_PLAN.md",
    "PRODUCTION_FEATURES_TODO.md",
    "QUICK_START_INTEGRATION.md",
    "README_FASTAPI.md",
    "README_INTEGRATION.md",
    "REFACTORING_SUMMARY.md",
    "REMOVE_MATPLOTLIB_PLOTS.md",
    "SURVEY_SYSTEM_COMPLETE.md",
    "verify_isolation.md",
    "START_HERE.md",
    "MIGRATION_STATUS.md",

    # Old data files
    "BI_Market_Data.xlsx",
    "Market_Database_FY_Final.csv",

    # Test HTML files
    "static/test-fastapi.html",
]

# Files to KEEP (important!)
KEEP_FILES = [
    "Dockerfile.fastapi",
    "docker-compose.fastapi.yml",
    "fastapi_app/",
    "react-frontend/",
    "datasets/",
    "scripts/",
    "docs/",
    # Agent files used by FastAPI
    "market_intelligence_agent.py",
    "news_agent.py",
    "digitalization_trend_agent.py",
    "nzia_policy_agent.py",
    "nzia_market_impact_agent.py",
    "manufacturer_financial_agent.py",
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
    print("DRY RUN - Flask Cleanup Preview")
    print("=" * 70)
    print("\nThe following items will be REMOVED:\n")

    total_size = 0
    items_found = []
    items_not_found = []

    for item in ITEMS_TO_REMOVE:
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
        for item in items_not_found[:10]:  # Show first 10
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
    print("  python scripts/cleanup_flask.py --execute")
    print("=" * 70)


def execute_cleanup():
    """Actually delete the files"""
    print("=" * 70)
    print("EXECUTING Flask Cleanup")
    print("=" * 70)
    print("\nRemoving Flask-related files...\n")

    removed_count = 0
    failed_count = 0

    for item in ITEMS_TO_REMOVE:
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
    parser = argparse.ArgumentParser(description="Clean up Flask-related files")
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
        print("\n[WARNING] This will permanently delete Flask-related files!")
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
        print("  python scripts/cleanup_flask.py --dry-run   # Preview what will be deleted")
        print("  python scripts/cleanup_flask.py --execute   # Actually delete the files")


if __name__ == "__main__":
    main()
