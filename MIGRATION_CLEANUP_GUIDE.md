# Migration Cleanup Guide - Flask to React

**Date**: 2025-11-11
**Status**: Ready for cleanup after React migration complete

---

## Overview

This document identifies all files and folders that can be safely removed after the React migration is complete. The backend (Flask) remains, but the old Flask frontend (templates, static files, routes) can be cleaned up.

---

## ✅ KEEP - Required for Production

### Backend Core (Flask API)
```
app/                          # Flask application core
├── __init__.py              # App factory
├── extensions.py            # Flask extensions (db, migrate, etc.)
├── config.py                # Configuration
├── models.py                # SQLAlchemy models
├── routes/                  # API routes (keep all)
│   ├── auth_routes.py
│   ├── chat_routes.py
│   ├── conversation_routes.py
│   ├── admin_routes.py
│   ├── agent_routes.py
│   ├── survey_routes.py
│   └── waitlist_routes.py
├── services/                # Business logic (keep all)
│   ├── auth_service.py
│   ├── chat_service.py
│   ├── conversation_service.py
│   ├── admin_service.py
│   ├── agent_service.py
│   └── survey_service.py
├── schemas/                 # Pydantic schemas (keep all)
└── utils/                   # Utility functions (keep all)
```

### AI Agents (Core Business Logic)
```
market_intelligence_agent.py
module_prices_agent.py
news_agent.py
digitalization_trend_agent.py
manufacturer_financial_agent.py
nzia_policy_agent.py
nzia_market_impact_agent.py
leo_om_agent.py
pydantic_weaviate_agent.py
```

### React Frontend (New)
```
react-frontend/              # Keep entire folder
├── src/
├── public/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Database & Migrations
```
instance/                    # SQLite database (development)
migrations/                  # Alembic database migrations
models.py                    # Database models
```

### Configuration & Dependencies
```
.env                         # Environment variables
.env.fastapi.example         # Example config (optional)
requirements.txt             # Python dependencies
pyproject.toml              # Poetry config
poetry.lock                 # Poetry lock file
```

### Data & Datasets
```
datasets/                    # CSV data files
Market_Database_FY_Final.csv
BI_Market_Data.xlsx
template.pptx               # PowerPoint template
```

### Deployment & Docker
```
Dockerfile                   # Docker config (if using)
docker-compose.yml          # Docker compose
deployment/                 # AWS deployment configs
```

### Tests
```
tests/                      # Backend tests
tests_fastapi/             # FastAPI tests (if migrating to FastAPI)
```

### Utilities & Scripts
```
utils/                      # Utility functions
services/                   # Service layer
```

### Assets (Images/Logos that React might reference)
```
static/
├── becquerel_logo.png     # Company logo (React may need)
├── images/                # Product images (React may need)
└── logos/                 # Other logos (React may need)
```

### Documentation (Optional but Recommended)
```
README.md
DATABASE_SCHEMA_FINAL.md
CRITICAL_FIX_COMPLETE.md
MIGRATION_STATUS.md
```

---

## ❌ CAN DELETE - Old Flask Frontend

### Templates (HTML - Replaced by React)
```
templates/                   # DELETE entire folder
├── 400.html
├── 403.html
├── 404.html
├── 500.html
├── admin_create_user.html
├── admin_pending_users.html
├── admin_users.html
├── agents.html
├── agents.html.backup
├── contact.html
├── forgot_password.html
├── index.html              # Old Flask chat page
├── landing.html            # Old Flask landing page
├── login.html              # Old Flask login
├── privacy_policy.html     # Old Flask privacy page
├── profile.html            # Old Flask profile page
├── register.html           # Old Flask registration
├── request_deletion.html   # Old Flask deletion page
├── reset_password.html     # Old Flask password reset
├── terms_of_service.html   # Old Flask terms page
└── waitlist.html           # Old Flask waitlist
```

**Reason**: All pages now served by React frontend

---

### Static Files (CSS/JS - Replaced by React)
```
static/
├── css/                    # DELETE entire folder
│   ├── admin.css
│   ├── agents.css
│   ├── contact.css
│   ├── landing.css
│   ├── login.css
│   ├── main.css
│   ├── privacy.css
│   ├── profile.css
│   ├── register.css
│   └── layouts/
│       ├── app-layout.css
│       └── landing-layout.css
├── js/                     # DELETE entire folder
│   ├── admin/
│   ├── agents/
│   ├── auth/
│   ├── chat/
│   ├── contact/
│   ├── landing/
│   ├── modules/
│   │   ├── core/
│   │   │   ├── api.js
│   │   │   ├── api.js.backup
│   │   │   ├── api-fastapi.js
│   │   │   └── state.js
│   │   └── ui/
│   ├── profile/
│   ├── survey/
│   └── main.js
├── query_examples.js       # DELETE - now in React
├── test-fastapi.html       # DELETE - test file
└── plots/                  # DELETE - old matplotlib plots (deprecated)
```

**Reason**: All UI/UX now handled by React components. React uses its own bundled CSS/JS.

---

### Flask Routes for Frontend Pages (Replaced by React Router)
```
routes/profile.py           # DELETE - React handles profile page now
app/__init__.py             # KEEP but remove template routes:
  - @app.route('/')         # Remove - React handles landing
  - @app.route('/login')    # Remove - React handles auth
  - @app.route('/register') # Remove - React handles auth
  - @app.route('/chat')     # Remove - React handles chat
  - @app.route('/agents')   # Remove - React handles agents
  - @app.route('/profile')  # Remove - React handles profile
  - @app.route('/admin/*')  # Remove - React handles admin
  - etc.
```

**Keep Only**: API routes that return JSON (not HTML templates)

---

### Old FastAPI Experiment (If Not Using)
```
fastapi_app/                # DELETE if not migrating to FastAPI
Dockerfile.fastapi          # DELETE if not using FastAPI
docker-compose.fastapi.yml  # DELETE if not using FastAPI
requirements-fastapi.txt    # DELETE if not using FastAPI
pyproject-fastapi.toml      # DELETE if not using FastAPI
test_fastapi.py             # DELETE if not testing FastAPI
test_fastapi_simple.py      # DELETE if not testing FastAPI
```

**Note**: Only delete if you're staying with Flask. If migrating backend to FastAPI, keep these.

---

### Migration Documentation (Optional Cleanup)
```
# Keep for reference (recommended):
DATABASE_SCHEMA_FINAL.md
CRITICAL_FIX_COMPLETE.md
MIGRATION_STATUS.md
START_HERE.md

# Can delete (historical context):
ADMIN_SERVICE_COMPLETE.md
AGENT_ACCESS_COMPLETE.md
AGENT_ACCESS_FIX.md
AGENT_MEMORY_ISSUE.md
AGENT_SERVICE_COMPLETE.md
AUTH_ENDPOINTS_COMPLETE.md
AUTH_FEATURES_COMPLETE.md
BACKEND_AUDIT_COMPLETE.md
CHAT_PROCESSING_COMPLETE.md
CLEANUP_COMPLETED.md
CLEANUP_RECOMMENDATIONS.md
CONNECTION_POOLING_COMPLETE.md
CONVERSATION_ENDPOINTS_COMPLETE.md
CONVERSATION_SERVICE_COMPLETE.md
CONVERSATION_TESTS_COMPLETE.md
FASTAPI_QUICKSTART.md
FINAL_CLEANUP_SUMMARY.md
FRONTEND_INTEGRATION_COMPLETE.md
FRONTEND_INTEGRATION_GUIDE.md
LANDING_PAGE_REFACTORING_COMPLETE.md
LANDING_REACT_MIGRATION_READINESS.md
LANDING_REFACTORING_SUCCESS.md
MATERIAL_DESIGN_3_IMPLEMENTATION.md
PHASE1_AUTHSERVICE_COMPLETE.md
PHASE1_MIGRATION_SUMMARY.md
PHASE1_SERVICE_MIGRATION_PLAN.md
PRODUCTION_FEATURES_TODO.md
QUICK_START_INTEGRATION.md
README_FASTAPI.md
README_INTEGRATION.md
REFACTORING_SUMMARY.md
REMOVE_MATPLOTLIB_PLOTS.md
SURVEY_SYSTEM_COMPLETE.md
verify_isolation.md
```

---

### Utility Scripts (Old Frontend-Related)
```
extract_and_move_styles.py  # DELETE - was for refactoring old CSS
remove_inline_scripts.py    # DELETE - was for refactoring old templates
remove_inline_styles.py     # DELETE - was for refactoring old templates
```

---

### Temporary/Cache Files
```
__pycache__/                # Can delete (regenerates)
.logfire/                   # Can delete (logging cache)
flask_session/              # Can delete (old sessions)
memory_dumps/               # DELETE - debugging files
tests_output/               # DELETE - test outputs
nul                         # DELETE - Windows artifact
```

---

## 🔍 Files to Review Before Deleting

### Assets (Images/Logos)
```
static/
├── becquerel_logo.png      # Check if React uses this
├── images/                 # Check if React references any
└── logos/                  # Check if React references any
```

**Action**:
1. Search React codebase for references to these files
2. If React imports them, either:
   - Copy to `react-frontend/public/` OR
   - Update React to import from `/static/` path
3. Then delete from `static/`

### Query Examples
```
static/query_examples.js    # Check if React uses this data
```

**Action**:
1. Check if React has equivalent in `src/constants/` or similar
2. If data is needed, migrate to React
3. Then delete

---

## 📋 Step-by-Step Cleanup Process

### Phase 1: Verify React Works Completely
- [ ] All pages load in React (login, register, chat, profile, etc.)
- [ ] All API calls work correctly
- [ ] Old messages display correctly
- [ ] New messages save correctly
- [ ] Admin panel works
- [ ] Surveys work
- [ ] Agent hiring works

### Phase 2: Backup Before Cleanup
```bash
# Create backup of old frontend
mkdir -p ../backups/old_flask_frontend
cp -r templates ../backups/old_flask_frontend/
cp -r static ../backups/old_flask_frontend/
cp -r routes/profile.py ../backups/old_flask_frontend/
```

### Phase 3: Remove Templates
```bash
# Delete all Flask templates
rm -rf templates/
```

### Phase 4: Remove Static Files (Except Assets)
```bash
# Keep images/logos temporarily, delete CSS/JS
cd static
rm -rf css/
rm -rf js/
rm -f query_examples.js
rm -f test-fastapi.html
rm -rf plots/

# Keep for now: images/, logos/, becquerel_logo.png
```

### Phase 5: Clean Flask Routes
**Manually edit** `app/__init__.py` or relevant route files:
- Remove all `@app.route()` decorators that render templates
- Keep only API routes (those returning JSON)

Example:
```python
# REMOVE THIS:
@app.route('/')
def landing():
    return render_template('landing.html')

# KEEP THIS:
@app.route('/api/auth/me')
def get_current_user():
    return jsonify(user_data)
```

### Phase 6: Remove FastAPI Experiment (If Not Using)
```bash
# Only if staying with Flask backend
rm -rf fastapi_app/
rm Dockerfile.fastapi
rm docker-compose.fastapi.yml
rm requirements-fastapi.txt
rm pyproject-fastapi.toml
rm test_fastapi*.py
```

### Phase 7: Remove Migration Documentation (Optional)
```bash
# Keep essential docs, remove historical ones
rm ADMIN_SERVICE_COMPLETE.md
rm AGENT_ACCESS_COMPLETE.md
# ... (see list above)

# Keep these:
# - DATABASE_SCHEMA_FINAL.md
# - CRITICAL_FIX_COMPLETE.md
# - MIGRATION_STATUS.md
# - START_HERE.md
# - README.md
```

### Phase 8: Clean Up Utility Scripts
```bash
rm extract_and_move_styles.py
rm remove_inline_scripts.py
rm remove_inline_styles.py
```

### Phase 9: Clean Up Cache/Temp Files
```bash
rm -rf __pycache__/
rm -rf .logfire/
rm -rf flask_session/
rm -rf memory_dumps/
rm -rf tests_output/
rm nul  # Windows artifact
```

### Phase 10: Update .gitignore
Add to `.gitignore`:
```
# Old Flask frontend (removed)
templates/
static/css/
static/js/
static/query_examples.js
```

### Phase 11: Final Verification
- [ ] Flask backend still runs (`python run_refactored.py` or similar)
- [ ] All API endpoints respond correctly
- [ ] React frontend connects to backend
- [ ] No broken imports or missing files

---

## 🎯 Final Project Structure

After cleanup, your structure should look like:

```
Full_data_DH_bot/
├── app/                     # Flask backend (API only)
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── schemas/            # Data validation
│   └── utils/              # Utilities
├── react-frontend/          # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── datasets/                # Data files
├── migrations/              # Database migrations
├── tests/                   # Backend tests
├── *_agent.py              # AI agent files
├── models.py               # Database models
├── .env                    # Config
├── requirements.txt        # Dependencies
├── Dockerfile              # Docker
├── docker-compose.yml      # Docker compose
└── README.md              # Documentation
```

**Key Changes**:
- ❌ No more `templates/`
- ❌ No more `static/css/` or `static/js/`
- ❌ No more Flask routes that render HTML
- ✅ Only backend API + React frontend

---

## 🚨 Important Notes

### DO NOT Delete:
1. **Agent files** (`*_agent.py`) - Core business logic
2. **Backend API** (`app/routes/`, `app/services/`) - Powers React
3. **Database** (`instance/`, `migrations/`) - Your data
4. **React frontend** (`react-frontend/`) - New frontend
5. **Config files** (`.env`, `requirements.txt`) - Required for running
6. **Data files** (`datasets/`, CSV files) - Agent data sources

### Safe to Delete (Summary):
1. **Flask templates** (`templates/`) - React replaced
2. **Flask static files** (`static/css/`, `static/js/`) - React replaced
3. **Flask frontend routes** (template rendering) - React Router replaced
4. **Migration docs** (optional) - Historical context
5. **Utility scripts** (frontend-related) - No longer needed
6. **Cache/temp files** - Regenerate as needed

---

## 📊 Estimated Space Savings

- `templates/`: ~500KB
- `static/css/`: ~200KB
- `static/js/`: ~500KB
- Migration docs: ~1MB
- Cache files: ~50MB (varies)
- **Total**: ~52MB (approximate)

---

## 🔄 Rollback Plan

If something breaks after cleanup:

1. **Restore from backup**:
   ```bash
   cp -r ../backups/old_flask_frontend/templates ./
   cp -r ../backups/old_flask_frontend/static ./
   ```

2. **Revert Git commit**:
   ```bash
   git log  # Find commit before cleanup
   git revert <commit-hash>
   ```

3. **Use Git history**:
   ```bash
   git checkout HEAD~1 templates/
   git checkout HEAD~1 static/
   ```

---

## ✅ Cleanup Checklist

Before deleting anything:

- [ ] React frontend is fully functional
- [ ] All pages work (auth, chat, profile, admin, etc.)
- [ ] Old messages display correctly
- [ ] New messages save correctly
- [ ] Surveys work
- [ ] Agent hiring works
- [ ] Created backup of old frontend
- [ ] Tested backend API still works after removing template routes
- [ ] Updated `.gitignore`
- [ ] Committed changes to Git

After cleanup:

- [ ] Backend still runs without errors
- [ ] React frontend still connects to backend
- [ ] No broken imports or missing files
- [ ] Verified in browser (clear cache first)
- [ ] Tested on staging/production environment

---

**Last Updated**: 2025-11-11
**Created By**: Claude Code Assistant
**Status**: Ready for use after React migration complete
