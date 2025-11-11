# Google Analytics Setup Guide

This guide explains how to set up Google Analytics 4 (GA4) for the Solar Intelligence website to track visitor behavior and analyze traffic.

## Table of Contents
1. [Create Google Analytics Account](#create-google-analytics-account)
2. [Add Tracking ID to Application](#add-tracking-id-to-application)
3. [Events Being Tracked](#events-being-tracked)
4. [How to View Analytics](#how-to-view-analytics)
5. [Key Metrics to Monitor](#key-metrics-to-monitor)

---

## Create Google Analytics Account

### Step 1: Sign up for Google Analytics
1. Go to [Google Analytics](https://analytics.google.com/)
2. Click "Start measuring" or "Sign in"
3. Sign in with your Google account

### Step 2: Create a Property
1. Click **Admin** (gear icon in bottom left)
2. Click **Create Property**
3. Fill in the details:
   - **Property name**: Solar Intelligence
   - **Reporting time zone**: Select your timezone
   - **Currency**: Select your currency
4. Click **Next**

### Step 3: Set Up Data Stream
1. Select **Web** as the platform
2. Enter your website details:
   - **Website URL**: https://solarintelligence.ai
   - **Stream name**: Solar Intelligence Web
3. Click **Create stream**

### Step 4: Get Your Measurement ID
1. After creating the stream, you'll see your **Measurement ID**
   - It looks like: `G-XXXXXXXXXX`
2. **Copy this ID** - you'll need it for the next step

---

## Add Tracking ID to Application

### For Local Development (using .env file)

1. Create or edit the `.env` file in your project root:
   ```bash
   GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
   ```

2. Replace `G-XXXXXXXXXX` with your actual Measurement ID

### For AWS Deployment

1. Add the environment variable to your deployment:

   **For ECS/Fargate:**
   - Go to AWS ECS Console
   - Select your Task Definition
   - Edit the container definition
   - Add environment variable:
     - Name: `GOOGLE_ANALYTICS_ID`
     - Value: `G-XXXXXXXXXX`

   **For EC2:**
   - SSH into your server
   - Edit your environment variables file
   - Add: `export GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX`
   - Restart the application

2. Restart your application after adding the environment variable

---

## Events Being Tracked

The application automatically tracks the following events:

### Waitlist Page Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| `page_view` | User visits the waitlist page | `page_title`, `page_location` |
| `email_input_started` | User clicks into email field | - |
| `email_validation_failed` | Email validation fails | `reason` (empty/invalid_format) |
| `waitlist_step_1_completed` | User completes email and clicks Next | - |
| `agent_selected` | User selects an agent | `agent_type` |
| `agent_deselected` | User deselects an agent | `agent_type` |
| `waitlist_back_to_email` | User clicks Back button | - |
| `waitlist_signup_success` | User successfully joins waitlist | `agents_count`, `agents_selected` |
| `waitlist_signup_failed` | Waitlist signup fails | `error_message` |
| `waitlist_signup_error` | Network error during signup | `error_type` |

### Chat Application Events

| Event Name | Description |
|------------|-------------|
| `page_view` | User visits the chat interface |

---

## How to View Analytics

### Access Google Analytics Dashboard
1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your **Solar Intelligence** property
3. Click on **Reports** in the left sidebar

### Real-Time Visitors
1. Go to **Reports** → **Realtime**
2. See who's on your site **right now**:
   - Active users
   - Pages they're viewing
   - Geographic location
   - Device type

### Traffic Overview
1. Go to **Reports** → **Acquisition** → **Traffic acquisition**
2. See where visitors come from:
   - Direct traffic
   - Google search
   - Social media
   - Referral links

### User Behavior Flow
1. Go to **Reports** → **Engagement** → **Pages and screens**
2. See which pages users view most
3. Track time spent on each page

### Custom Events (Waitlist Funnel)
1. Go to **Reports** → **Engagement** → **Events**
2. Click on any event name to see details
3. Track the waitlist conversion funnel:
   - `email_input_started` → Started form
   - `waitlist_step_1_completed` → Viewed agents
   - `agent_selected` → Selected interests
   - `waitlist_signup_success` → Completed signup

---

## Key Metrics to Monitor

### 1. Waitlist Conversion Rate

**Formula:**
```
Conversion Rate = (waitlist_signup_success / page_view) × 100
```

**How to check:**
1. Go to **Events** report
2. Compare count of `page_view` vs `waitlist_signup_success`
3. Calculate percentage

**Example:**
- 1000 page views
- 150 successful signups
- Conversion rate: 15%

### 2. Agent Interest Analysis

**Question:** Which agents are most popular?

**How to check:**
1. Go to **Events** → Click `agent_selected`
2. View **Event parameters** → `agent_type`
3. See breakdown by agent

**Insights:**
- Which agents to prioritize development
- User interests and needs
- Market demand signals

### 3. Drop-off Points

**Question:** Where do users abandon the form?

**Funnel:**
1. `page_view` (100%)
2. `email_input_started` (X%)
3. `waitlist_step_1_completed` (Y%)
4. `agent_selected` (Z%)
5. `waitlist_signup_success` (W%)

**How to improve:**
- If drop-off at email → simplify form
- If drop-off at agents → reduce options
- If drop-off at submit → check errors

### 4. Traffic Sources

**Question:** Where are visitors coming from?

**Key sources to track:**
- **Direct**: Typed URL or bookmarks
- **Organic Search**: Google/Bing searches
- **Social**: Twitter, LinkedIn, Facebook
- **Referral**: Other websites linking to you
- **Email**: Newsletter campaigns

### 5. Geographic Analysis

**Question:** Which countries/regions show most interest?

**How to check:**
1. Go to **Reports** → **User** → **Demographics** → **Geography**
2. See map of user locations
3. Identify key markets

### 6. Device & Browser Stats

**Question:** What devices do users prefer?

**How to check:**
1. Go to **Reports** → **Tech** → **Overview**
2. See breakdown by:
   - Desktop vs Mobile
   - Browser types
   - Operating systems

**Use this to:**
- Prioritize mobile optimization
- Test on popular browsers
- Ensure compatibility

---

## Advanced Analytics

### Create Custom Reports

1. Go to **Explore** in left sidebar
2. Click **Blank** to create custom report
3. Add dimensions and metrics:
   - Dimension: Event name
   - Metric: Event count
   - Filter: Specific date range

### Set Up Conversion Goals

1. Go to **Admin** → **Events**
2. Mark `waitlist_signup_success` as a conversion
3. Now it appears in conversion reports

### Export Data

1. Any report can be exported
2. Click **Share** icon (top right)
3. Choose format:
   - PDF
   - Google Sheets
   - CSV

---

## Privacy Considerations

Google Analytics 4 is GDPR-compliant when configured correctly:

1. **IP Anonymization**: Enabled by default in GA4
2. **Cookie Consent**: Consider adding a cookie banner if serving EU users
3. **Data Retention**: Configure in Admin → Data Settings
4. **Privacy Policy**: Update to mention Google Analytics usage

---

## Troubleshooting

### Analytics not showing data?

1. **Check Measurement ID**: Ensure `GOOGLE_ANALYTICS_ID` is set correctly
2. **Wait 24 hours**: Initial data may take time to appear
3. **Check Real-time**: Should show immediate data
4. **Ad blockers**: Some users may block GA scripts
5. **Browser console**: Check for JavaScript errors

### Events not tracking?

1. Open browser Developer Tools (F12)
2. Go to **Network** tab
3. Filter for "google-analytics.com"
4. Perform action (e.g., click email input)
5. Check if event request is sent

---

## Next Steps

After setup:
1. ✅ Add Measurement ID to environment variables
2. ✅ Deploy updated application
3. ✅ Test in Real-time report (visit your site)
4. ✅ Wait 24-48 hours for full data
5. ✅ Create weekly review routine
6. ✅ Set up conversion tracking
7. ✅ Export reports for stakeholders

---

## Support

- [Google Analytics Help Center](https://support.google.com/analytics)
- [GA4 Getting Started Guide](https://support.google.com/analytics/answer/9304153)
- [GA4 Events Documentation](https://support.google.com/analytics/answer/9322688)
