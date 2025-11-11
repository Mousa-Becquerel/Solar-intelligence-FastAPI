# Waitlist Landing Page Setup Guide

## Overview

The waitlist landing page allows you to collect email addresses from interested users before the official launch of Solar Intelligence. This feature is completely optional and can be enabled/disabled via environment variable without affecting the existing functionality.

## Features

✨ **Beautiful, Modern Design** - Inspired by contemporary SaaS landing pages
📧 **Email Collection** - Secure storage of waitlist emails in the database
📊 **Live Counter** - Shows how many people have joined the waitlist
🔒 **Rate Limiting** - Prevents spam (5 signups per hour per IP)
🎨 **Fully Responsive** - Works on all devices
🚀 **Admin Access** - Special link for admins to bypass waitlist

## How to Enable/Disable

### Enable Waitlist Mode (Before Launch)

1. Set the environment variable:
   ```bash
   WAITLIST_ENABLED=true
   ```

2. Restart your application

3. When users visit the root URL (`/`), they will see the waitlist page

### Disable Waitlist Mode (After Launch)

1. Set the environment variable:
   ```bash
   WAITLIST_ENABLED=false
   ```

2. Restart your application

3. Users will see the normal landing page

## Admin Access During Waitlist Mode

As an admin, you can bypass the waitlist and access the normal application:

**Method 1: Direct URL**
- Visit: `http://your-domain.com/landing`
- This takes you directly to the normal landing page

**Method 2: Admin Link**
- Visit: `http://your-domain.com/waitlist?admin=true`
- Click the "Admin Access" button that appears in the top-right corner

**Method 3: Login URL**
- Visit: `http://your-domain.com/login`
- Log in with your admin credentials

## Database Setup

The waitlist feature adds a new `waitlist` table to your database. Run database migrations:

```bash
# The table will be created automatically when you run the app
# Or manually create the table:
flask db upgrade  # If using Flask-Migrate

# For manual creation:
python -c "from app import db; db.create_all()"
```

## Waitlist Table Schema

```sql
CREATE TABLE waitlist (
    id INTEGER PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(256)
);
```

## Managing Waitlist Emails

### View All Waitlist Emails

```python
from app import db, Waitlist

# Get all emails
waitlist_entries = Waitlist.query.all()
for entry in waitlist_entries:
    print(f"{entry.email} - Joined: {entry.created_at}")
```

### Export to CSV

```python
import csv
from app import db, Waitlist

waitlist = Waitlist.query.all()

with open('waitlist_emails.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Email', 'Created At', 'IP Address'])
    for entry in waitlist:
        writer.writerow([entry.email, entry.created_at, entry.ip_address])

print("Exported to waitlist_emails.csv")
```

### Notify Users (Mark as Notified)

```python
from app import db, Waitlist
from datetime import datetime

# Mark all as notified
entries = Waitlist.query.filter_by(notified=False).all()
for entry in entries:
    entry.notified = True
    entry.notified_at = datetime.utcnow()

db.session.commit()
print(f"Marked {len(entries)} users as notified")
```

## Customization

### Change Waitlist Text

Edit `templates/waitlist.html`:
- Update the title in the `<h1>` tag
- Modify the subtitle description
- Change feature cards in the "What's Coming" section

### Modify Styling

Edit `static/css/waitlist.css`:
- Colors are defined at the top of relevant sections
- Gradient backgrounds: `background: linear-gradient(...)`
- Animations: Keyframes at the bottom of the file

### Rate Limiting

Edit `app.py` - look for the `@limiter.limit()` decorator:

```python
@app.route('/api/waitlist/join', methods=['POST'])
@limiter.limit("5 per hour")  # Change this value
def join_waitlist():
    ...
```

## API Endpoint

### POST `/api/waitlist/join`

Join the waitlist by providing an email address.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Thank you! We'll notify you when we launch.",
  "waitlist_count": 42
}
```

**Response (Already Registered):**
```json
{
  "success": true,
  "message": "You're already on the waitlist! We'll notify you at launch.",
  "waitlist_count": 42
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Please enter a valid email address"
}
```

## Testing

1. Enable waitlist mode:
   ```bash
   export WAITLIST_ENABLED=true  # Linux/Mac
   set WAITLIST_ENABLED=true     # Windows
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Visit `http://localhost:5000` - You should see the waitlist page

4. Test admin access: `http://localhost:5000/waitlist?admin=true`

5. Try submitting an email address

6. Check the database:
   ```python
   from app import db, Waitlist
   print(Waitlist.query.count())
   ```

## Production Deployment

### Environment Variable Setup

**Render:**
1. Go to your service dashboard
2. Navigate to "Environment" section
3. Add: `WAITLIST_ENABLED` = `true`
4. Save and redeploy

**Heroku:**
```bash
heroku config:set WAITLIST_ENABLED=true
```

**AWS/Docker:**
Add to your `.env` file or docker-compose:
```yaml
environment:
  - WAITLIST_ENABLED=true
```

## Security Notes

- ✅ Rate limiting prevents abuse (5 signups/hour per IP)
- ✅ Email validation prevents invalid entries
- ✅ CSRF protection enabled on all forms
- ✅ IP addresses stored for abuse tracking
- ✅ User agents stored for analytics

## Troubleshooting

### Waitlist page not showing
- Check `WAITLIST_ENABLED` environment variable is set to `true`
- Verify you're not logged in (logged in users skip waitlist)
- Clear browser cache and cookies

### Database errors
- Run `db.create_all()` to create the waitlist table
- Check database permissions

### Email not being saved
- Check browser console for JavaScript errors
- Verify API endpoint is accessible: `/api/waitlist/join`
- Check server logs for errors

## Files Added/Modified

**New Files:**
- `templates/waitlist.html` - Waitlist landing page
- `static/css/waitlist.css` - Waitlist styling
- `static/js/waitlist.js` - Waitlist functionality
- `docs/WAITLIST_SETUP.md` - This guide

**Modified Files:**
- `app.py` - Added Waitlist model and routes
- `.env.template` - Added WAITLIST_ENABLED variable

## Support

For issues or questions:
1. Check this documentation
2. Review the application logs
3. Contact the development team