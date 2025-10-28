# Supabase Setup Guide

## Critical Issues Fixed:
1. ✅ Fixed schema import in Netlify function
2. ✅ Added proper error logging
3. ✅ Added GET and DELETE handlers
4. ✅ Added CORS headers

## Required Steps:

### 1. Update DATABASE_URL in Netlify

**Important:** The password `Welcome@NewRelic` MUST be URL-encoded as `Welcome%40NewRelic`

**Correct URL:**
```
postgresql://postgres:Welcome%40NewRelic@db.necugmwwnmjuqnhppswt.supabase.co:5432/postgres?sslmode=require
```

**Steps:**
1. Go to: https://app.netlify.com/sites/onlinefriend/settings/env
2. Find or add `DATABASE_URL` variable
3. Set value to: `postgresql://postgres:Welcome%40NewRelic@db.necugmwwnmjuqnhppswt.supabase.co:5432/postgres?sslmode=require`
4. Click "Save"
5. Go to "Deploys" tab and click "Trigger deploy" → "Clear cache and deploy site"

### 2. Verify Supabase Tables

Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard/project/necugmwwnmjuqnhppswt/sql/new):

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('messages', 'conversations');

-- Check messages table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'messages';
```

**Expected columns:**
- id (integer)
- content (text)
- role (text)
- timestamp (timestamp)
- companion_id (text)
- photo_url (text)
- is_premium (boolean)
- context_info (text)

### 3. Verify Messages Are Being Saved

After deploying, send a test message from the deployed app (https://onlinefriend.netlify.app), then run:

```sql
SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10;
```

### 4. Check Netlify Function Logs

If messages still aren't being saved, check the function logs:
1. Go to: https://app.netlify.com/sites/onlinefriend/functions/messages
2. Check "Invoke log" for errors
3. Look for: `[Netlify Function] Database initialized`
4. Look for: `[Netlify Function] Saved user message to database`

### 5. Common Issues:

**Issue:** "DATABASE_URL not found in environment"
- **Fix:** Add DATABASE_URL to Netlify environment variables

**Issue:** "password authentication failed"
- **Fix:** Use URL-encoded password: `Welcome%40NewRelic` (not `Welcome@NewRelic`)

**Issue:** "relation messages does not exist"
- **Fix:** Run the SQL migration in Supabase

**Issue:** "column companion_id does not exist"
- **Fix:** Check column names match exactly (snake_case in database, camelCase in Drizzle)

