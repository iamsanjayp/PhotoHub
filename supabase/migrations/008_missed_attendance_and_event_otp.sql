-- ============================================================================
-- PhotoHub Database Schema - Migration 008: Missed Attendance & Event OTP
-- ============================================================================
-- 1. Adds attendance_otp and attendance_otp_active to events
-- 2. Adds missed_attendance table for tracking per-hour missed attendance across
--    shoots and events (with exportable hours 1 to 7)
-- 3. Adds event_feedback table for attendee ratings and feedback
-- ============================================================================

SET search_path TO public, auth, extensions;

-- 1. Add OTP columns to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS attendance_otp TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS attendance_otp_active BOOLEAN DEFAULT false;

-- 2. Missed Attendance Table
CREATE TABLE IF NOT EXISTS public.missed_attendance (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  source_type TEXT NOT NULL, -- 'shoot' or 'event'
  source_id UUID NOT NULL,   -- references apex_requests(id) or events(id)
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  hours INTEGER[] NOT NULL, -- e.g. ARRAY[1, 2, 3] (hours 1 to 7)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missed_attendance_source ON public.missed_attendance(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_missed_attendance_user ON public.missed_attendance(user_id);

-- 3. Event Feedback Table
CREATE TABLE IF NOT EXISTS public.event_feedback (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER DEFAULT 5,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT event_feedback_event_user_key UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_feedback_event ON public.event_feedback(event_id);

-- Grants
GRANT ALL ON TABLE public.missed_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_feedback TO anon, authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
