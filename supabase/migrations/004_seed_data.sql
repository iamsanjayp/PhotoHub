-- ============================================================================
-- PhotoHub Database Schema - Migration 004: Seed Data & Realtime Config
-- ============================================================================
-- Sets up realtime subscriptions, default configuration, and documentation
-- for initial setup after deployment.
-- ============================================================================


-- ==========================================================================
-- REALTIME SUBSCRIPTIONS
-- Enable Supabase Realtime for tables that need live updates
-- ==========================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;


-- ==========================================================================
-- DEFAULT POINT VALUES REFERENCE
-- ==========================================================================
-- These point values are enforced in the trigger functions (003).
-- Documented here for reference and easy adjustment.
--
-- +-------------------------------+--------+
-- | Action                        | Points |
-- +-------------------------------+--------+
-- | Event attendance              |     10 |
-- | Submission approved           |     15 |
-- | Submission winner             |     50 |
-- | Post approved                 |      5 |
-- | Post featured                 |     20 |
-- | APEX coverage completed       |     25 |
-- | Consistency bonus (monthly)   |     10 |
-- +-------------------------------+--------+
--
-- To change point values, update the corresponding trigger functions
-- in 003_functions_triggers.sql and re-run the migration.


-- ==========================================================================
-- ADMIN SETUP INSTRUCTIONS
-- ==========================================================================
-- PhotoHub uses Google OAuth exclusively. There are no password-based accounts.
-- All users must sign in with a @bitsathy.ac.in Google account.
--
-- STEP 1: Configure Supabase Auth
--   - Go to Supabase Dashboard > Authentication > Providers
--   - Enable Google OAuth
--   - Set Authorized redirect URL in Google Cloud Console
--   - Restrict to @bitsathy.ac.in domain in Google Workspace settings
--
-- STEP 2: First Admin Setup
--   The first admin must sign in via Google OAuth first (which creates their
--   profile as a 'participant'), then be manually promoted:
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE email = 'your-admin@bitsathy.ac.in';
--
-- STEP 3: Subsequent admin/role changes can be done through the admin panel
--   or via SQL:
--
--   UPDATE public.profiles
--   SET role = 'leader'
--   WHERE email = 'leader-email@bitsathy.ac.in';
--
-- STEP 4: Schedule leaderboard refresh
--   Set up a cron job (via pg_cron or Supabase Edge Function) to refresh
--   the leaderboard periodically:
--
--   SELECT public.refresh_leaderboard();
--
--   Recommended: Run every 15 minutes or after bulk point operations.


-- ==========================================================================
-- STORAGE BUCKETS SETUP (run in Supabase Dashboard or via API)
-- ==========================================================================
-- These storage buckets should be created in the Supabase Dashboard:
--
-- 1. 'avatars'         - Profile pictures (public read, auth write own)
-- 2. 'event-banners'   - Event banner images (public read, admin write)
-- 3. 'post-media'      - Post images and videos (public read, auth write own)
-- 4. 'submissions'     - Submission files (auth read own, admin read all)
-- 5. 'apex-media'      - APEX coverage media (auth read assigned, admin read all)
-- 6. 'challenge-banners' - Challenge banners (public read, admin write)
-- 7. 'equipment-images'  - Equipment photos (public read, admin write)
--
-- Example storage policy (run in SQL editor):
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES
--   ('avatars', 'avatars', true),
--   ('event-banners', 'event-banners', true),
--   ('post-media', 'post-media', true),
--   ('submissions', 'submissions', false),
--   ('apex-media', 'apex-media', false),
--   ('challenge-banners', 'challenge-banners', true),
--   ('equipment-images', 'equipment-images', true);


-- ==========================================================================
-- OPTIONAL: pg_cron SETUP FOR LEADERBOARD
-- ==========================================================================
-- If pg_cron extension is available, schedule automatic leaderboard refresh:
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule(
--   'refresh-leaderboard',
--   '*/15 * * * *',  -- Every 15 minutes
--   $$SELECT public.refresh_leaderboard()$$
-- );
--
-- To clean up expired notifications (older than 90 days):
--
-- SELECT cron.schedule(
--   'cleanup-old-notifications',
--   '0 3 * * *',  -- Daily at 3 AM
--   $$DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = true$$
-- );
