# Supabase Setup Guide

This project uses Supabase as the database backend. Follow these steps to set it up:

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or sign in
3. Click "New Project"
4. Fill in your project details:
   - Name: `mintmove` (or your preferred name)
   - Database Password: Choose a strong password (save it!)
   - Region: Choose closest to your users
5. Wait for the project to be created (~2 minutes)

## 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role key** (this is your `SUPABASE_SERVICE_ROLE_KEY`) - Keep this secret!

## 3. Run the Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase/migrations/001_create_users_table.sql`
4. Click **Run** (or press Ctrl+Enter)
5. Verify the table was created by going to **Table Editor** → you should see a `users` table

## 4. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Secret (change this to a random string in production)
JWT_SECRET=your-secret-key-change-in-production

# App URL (for email verification links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Configuration (for email verification)
# Use secure: true for port 465 (SSL), false for port 587 (TLS)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false  # Set to 'true' for port 465
SMTP_USER=your-email@domain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=your-email@domain.com
SMTP_FROM_NAME=MintMove  # Display name for sender (optional)

# NOWPayments API Configuration
NOWPAYMENTS_API_KEY=your_api_key_here
NOWPAYMENTS_API_URL=https://api.nowpayments.io/v1
```

## 5. Test the Setup

1. Start your development server: `npm run dev`
2. Try signing up a new user
3. Check your Supabase dashboard → **Table Editor** → `users` table to see the new user

## Database Schema

The `users` table has the following structure:

- `id` (UUID) - Primary key, auto-generated
- `email` (TEXT) - Unique, user's email address
- `password` (TEXT) - Hashed password (bcrypt)
- `email_verified` (BOOLEAN) - Email verification status
- `verification_token` (TEXT) - Token for email verification
- `created_at` (TIMESTAMP) - Account creation time
- `updated_at` (TIMESTAMP) - Last update time

## Security Notes

- The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS) - **never expose this in client-side code**
- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to use in client-side code
- RLS policies are configured to allow service role full access and users to view their own data

## Migration from JSON File Database

If you had users in the old JSON file database (`data/users.json`), you can migrate them:

1. Export the JSON data
2. Use Supabase dashboard → **Table Editor** → **Insert** to add users manually
3. Or create a migration script to import the data

