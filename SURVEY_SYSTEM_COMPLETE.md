# Survey System Migration - Complete Implementation Guide

## Overview

The survey system has been fully migrated from Flask to FastAPI + React. This document describes the implementation and integration steps.

## ✅ Completed Components

### Backend (FastAPI)

1. **Database Models** ([fastapi_app/db/models.py](fastapi_app/db/models.py:190-220))
   - `UserSurvey` - Stage 1 survey (User Profiling)
   - `UserSurveyStage2` - Stage 2 survey (Market Activity & Behaviour)
   - Both tables created in PostgreSQL: `fastapi_user_survey`, `fastapi_user_survey_stage2`

2. **API Endpoints** ([fastapi_app/api/v1/endpoints/survey.py](fastapi_app/api/v1/endpoints/survey.py))
   - `POST /api/v1/survey/submit-user-survey` - Submit Stage 1 survey
   - `POST /api/v1/survey/submit-user-survey-stage2` - Submit Stage 2 survey
   - `GET /api/v1/survey/check-survey-status` - Check completion status
   - Includes full validation, error handling, and query bonus calculation

3. **Router Registration** ([fastapi_app/api/v1/router.py](fastapi_app/api/v1/router.py:66-69))
   - Survey router registered with `/survey` prefix

### Frontend (React + TypeScript)

1. **Type Definitions** ([react-frontend/src/types/survey.ts](react-frontend/src/types/survey.ts))
   - `UserSurveyData` - Stage 1 form data
   - `UserSurveyStage2Data` - Stage 2 form data
   - `SurveyStatus` - Completion status
   - `SurveySubmitResponse` - API response

2. **API Client Methods** ([react-frontend/src/api/client.ts](react-frontend/src/api/client.ts:419-437))
   - `submitUserSurvey()`
   - `submitUserSurveyStage2()`
   - `checkSurveyStatus()`

3. **Survey Components**
   - [SurveyModal.tsx](react-frontend/src/components/survey/SurveyModal.tsx) - Stage 1 (5 steps)
     - Step 1: Role selection
     - Step 2: Regions of interest
     - Step 3: Familiarity level
     - Step 4: Insight types
     - Step 5: Tailored recommendations

   - [SurveyModalStage2.tsx](react-frontend/src/components/survey/SurveyModalStage2.tsx) - Stage 2 (5 steps)
     - Step 1: Work focus
     - Step 2: PV segments
     - Step 3: Technologies
     - Step 4: Top 3 challenges (max 3)
     - Step 5: Weekly insights (optional)

## 🔧 Integration Instructions

### Where to Integrate

The survey modals need to be integrated into the chat page where query limits are checked. Based on the Flask implementation, surveys should trigger:

- **Stage 1**: When a free user reaches 5 queries
- **Stage 2**: When a free user reaches 10 queries (after completing Stage 1)

### Implementation Steps

#### Step 1: Add Survey State to Chat Page

In your chat page component (likely `ChatPage.tsx` or similar):

```typescript
import { useState, useEffect } from 'react';
import { SurveyModal } from '../components/survey/SurveyModal';
import { SurveyModalStage2 } from '../components/survey/SurveyModalStage2';
import { apiClient } from '../api/client';

// Inside your component:
const [showSurvey1, setShowSurvey1] = useState(false);
const [showSurvey2, setShowSurvey2] = useState(false);
const [surveyStatus, setSurveyStatus] = useState({ stage1_completed: false, stage2_completed: false });

// Check survey status on mount
useEffect(() => {
  const checkStatus = async () => {
    try {
      const status = await apiClient.checkSurveyStatus();
      setSurveyStatus(status);
    } catch (error) {
      console.error('Failed to check survey status:', error);
    }
  };
  checkStatus();
}, []);
```

#### Step 2: Trigger Survey Based on Query Count

When checking if user can make a query:

```typescript
const checkQueryLimit = async () => {
  try {
    const user = await apiClient.getCurrentUser();

    // Free user logic
    if (user.plan_type === 'free') {
      const queryCount = user.monthly_query_count || 0;

      // Stage 1 Survey: Trigger at 5 queries (if not completed)
      if (queryCount === 5 && !surveyStatus.stage1_completed) {
        setShowSurvey1(true);
        return false; // Block query until survey completed
      }

      // Stage 2 Survey: Trigger at 10 queries (if Stage 1 completed but Stage 2 not)
      if (queryCount === 10 && surveyStatus.stage1_completed && !surveyStatus.stage2_completed) {
        setShowSurvey2(true);
        return false; // Block query until survey completed
      }
    }

    return true; // Can proceed with query
  } catch (error) {
    console.error('Failed to check query limit:', error);
    return false;
  }
};
```

#### Step 3: Add Survey Modal Components to JSX

```typescript
return (
  <div>
    {/* Your existing chat UI */}

    {/* Stage 1 Survey Modal */}
    <SurveyModal
      isOpen={showSurvey1}
      onClose={() => setShowSurvey1(false)}
      onSuccess={(newQueryCount, newQueryLimit) => {
        setSurveyStatus({ ...surveyStatus, stage1_completed: true });
        // Optionally update user query count display
        console.log(`New query count: ${newQueryCount}/${newQueryLimit}`);
      }}
    />

    {/* Stage 2 Survey Modal */}
    <SurveyModalStage2
      isOpen={showSurvey2}
      onClose={() => setShowSurvey2(false)}
      onSuccess={(newQueryCount, newQueryLimit) => {
        setSurveyStatus({ ...surveyStatus, stage2_completed: true });
        // Optionally update user query count display
        console.log(`New query count: ${newQueryCount}/${newQueryLimit}`);
      }}
    />
  </div>
);
```

## 📊 Query Limit Logic

### Base Limits (Free Users)
- Initial: 5 queries per month
- After Stage 1 survey: +5 queries (total: 10)
- After Stage 2 survey: +5 queries (total: 15)

### Backend Calculation
The backend survey endpoints automatically:
1. Save the survey response
2. Award 5 bonus queries (stored in `bonus_queries_granted` field)
3. Calculate new query limit including all bonuses
4. Return updated query counts to frontend

### Database Schema
```sql
-- Stage 1 Survey
CREATE TABLE fastapi_user_survey (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    regions TEXT NOT NULL,  -- JSON array
    familiarity VARCHAR(20) NOT NULL,
    insights TEXT NOT NULL,  -- JSON array
    tailored VARCHAR(10),
    bonus_queries_granted INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stage 2 Survey
CREATE TABLE fastapi_user_survey_stage2 (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    work_focus VARCHAR(100) NOT NULL,
    pv_segments TEXT NOT NULL,  -- JSON array
    technologies TEXT NOT NULL,  -- JSON array
    challenges TEXT NOT NULL,  -- JSON array (max 3)
    weekly_insight TEXT,
    bonus_queries_granted INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Testing

### Manual Testing Steps

1. **Create Test Free User**
   ```sql
   -- In PostgreSQL
   UPDATE fastapi_users
   SET plan_type = 'free', monthly_query_count = 4
   WHERE id = <your_test_user_id>;
   ```

2. **Test Stage 1 Survey**
   - Make 1 query (brings count to 5)
   - Survey modal should appear
   - Complete all 5 steps
   - Verify query limit increased to 10

3. **Test Stage 2 Survey**
   - Make 5 more queries (brings count to 10)
   - Stage 2 survey modal should appear
   - Complete all 5 steps
   - Verify query limit increased to 15

4. **Test Survey Status Persistence**
   - Refresh page
   - Surveys should not reappear
   - Check `/api/v1/survey/check-survey-status` endpoint

### API Testing with curl

```bash
# Check survey status
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/survey/check-survey-status

# Submit Stage 1 survey
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Researcher",
    "regions": ["Europe", "North America"],
    "familiarity": "intermediate",
    "insights": ["Market Trends", "Pricing Data"],
    "tailored": "yes"
  }' \
  http://localhost:8000/api/v1/survey/submit-user-survey

# Submit Stage 2 survey
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "work_focus": "Research & Development",
    "pv_segments": ["Residential", "Utility-Scale"],
    "technologies": ["Monocrystalline Silicon", "Bifacial Modules"],
    "challenges": ["Supply Chain Disruptions", "Technology Selection & Performance"],
    "weekly_insight": "I would like insights on pricing trends"
  }' \
  http://localhost:8000/api/v1/survey/submit-user-survey-stage2
```

## 🎨 UI/UX Features

- **Progress Indicator**: Visual progress bar showing current step
- **Step Validation**: Next button disabled until current step is complete
- **Multi-select with Limits**: Stage 2 challenges limited to max 3 selections
- **Conditional Fields**: "Other" options show text input when selected
- **Success Animation**: Shows reward message and auto-reloads after submission
- **Responsive Design**: Works on mobile and desktop
- **Keyboard Navigation**: Fully accessible with keyboard
- **Error Handling**: Toast notifications for errors

## 🔐 Security Considerations

- ✅ Surveys require authentication (JWT token)
- ✅ Backend validates one survey per user (unique constraint)
- ✅ Backend validates Stage 2 requires Stage 1 completion
- ✅ Backend validates max 3 challenges in Stage 2
- ✅ Rate limiting applied (5 per hour via @limiter.limit)
- ✅ SQL injection prevented (parameterized queries)
- ✅ XSS prevented (React auto-escapes)

## 📝 Next Steps

1. **Integrate survey triggers into chat flow** (see Step 1-3 above)
2. **Test end-to-end with free user account**
3. **Monitor survey completion rates**
4. **Analyze survey data for user insights**
5. **Consider adding analytics tracking for survey events**

## 🐛 Troubleshooting

### Survey doesn't appear
- Check user is on free plan: `SELECT plan_type FROM fastapi_users WHERE id = X`
- Check query count: `SELECT monthly_query_count FROM fastapi_users WHERE id = X`
- Check survey status: `SELECT * FROM fastapi_user_survey WHERE user_id = X`

### Survey submission fails
- Check FastAPI logs: `docker logs full_data_dh_bot-fastapi-app-1`
- Verify JWT token is valid
- Check database connection
- Verify required fields are populated

### Query limit not updating
- Check survey was saved: `SELECT * FROM fastapi_user_survey WHERE user_id = X`
- Check bonus_queries_granted value (should be 5)
- Refresh user session / reload page
- Check backend calculation logic in survey endpoints

## 📚 Resources

- Flask implementation: [static/js/modules/ui/surveyModal.js](static/js/modules/ui/surveyModal.js)
- Flask routes: [app/routes/chat.py](app/routes/chat.py:341-492)
- Flask models: [models.py](models.py:206-238)
- FastAPI docs: http://localhost:8000/docs (when running)
