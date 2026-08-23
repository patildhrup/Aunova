-- ============================================================
-- Aunova: Supabase Profiles Table Setup
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- 1. Create profiles table to store unique usernames
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policies: users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow any authenticated or anonymous user to check username availability
CREATE POLICY "Anyone can check usernames"
  ON public.profiles FOR SELECT
  USING (true);

-- 4. Auto-create profile on user signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Enable Google OAuth (do this in Supabase Dashboard > Authentication > Providers > Google)
-- You need to add your Google Client ID and Secret from Google Cloud Console
-- Redirect URL to whitelist: https://ixjbhxfzjggrusuxpojx.supabase.co/auth/v1/callback

-- 6. Configure OTP email template (Dashboard > Authentication > Email Templates)
-- The default OTP email template sends a 6-digit code. Make sure:
--   • "Confirm email" is ENABLED in Auth > Settings
--   • OTP expiry is set (default 3600 seconds = 1 hour)
