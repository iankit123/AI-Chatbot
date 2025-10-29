# Supabase Setup Guide

## Critical Issues Fixed:
1. ✅ Fixed schema import in Netlify function
2. ✅ Added proper error logging
3. ✅ Added GET and DELETE handlers
4. ✅ Added CORS headers
5. ✅ Fixed WebSocket configuration for Neon serverless
6. ✅ Auto-switch to connection pooler (port 6543) for Supabase

## Required Steps:

### 1. Update DATABASE_URL in Netlify

**Important:** 
- Use the Session pooler connection string from Supabase Dashboard
- Password `Welcome_NewRelic` does NOT need URL encoding (it uses underscore, not @)
- The connection string format includes project ID in username: `postgres.necugmwwnmjuqnhppswt`

**Correct URL (Session Pooler):**
```
postgresql://postgres.necugmwwnmjuqnhppswt:Welcome_NewRelic@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

**Important Notes:**
- Username format: `postgres.necugmwwnmjuqnhppswt` (includes project reference ID)
- Hostname: `aws-1-ap-south-1.pooler.supabase.com` (pooler endpoint)
- Password: `Welcome_NewRelic` (with underscore, no URL encoding needed)
- Port: `5432` (correct for pooler)

**To get the correct connection string from Supabase:**
1. Go to: https://supabase.com/dashboard/project/necugmwwnmjuqnhppswt/settings/database
2. Find "Connection string" section
3. Select "Session mode" (for connection pooler) or "Transaction mode"
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your actual password (URL-encoded)

**Steps:**
1. Go to: https://app.netlify.com/sites/onlinefriend/settings/env
2. Find or add `DATABASE_URL` variable
3. Set value to: `postgresql://postgres.necugmwwnmjuqnhppswt:Welcome_NewRelic@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`
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
- **Fix:** Use the exact password from Supabase: `Welcome_NewRelic` (no URL encoding needed for underscore)

**Issue:** "relation messages does not exist"
- **Fix:** Run the SQL migration in Supabase

**Issue:** "column companion_id does not exist"
- **Fix:** Check column names match exactly (snake_case in database, camelCase in Drizzle)

**Issue:** "ENOTFOUND db.xxx.supabase.co" (DNS lookup failed)
- **Fix:** 
  1. Verify the hostname in DATABASE_URL matches your Supabase project
  2. Get the connection string from Supabase Dashboard → Settings → Database
  3. Ensure you're using the correct project reference ID
  4. Try using port 6543 (connection pooler) instead of 5432
  5. Check that your Supabase project is active and not paused

