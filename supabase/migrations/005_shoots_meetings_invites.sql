-- ============================================================================
-- PhotoHub Database Schema - Migration 005: Shoots, Meetings & Invites
-- ============================================================================
-- Adds tables for creative PH shoots, shoot ideas, crew assignments,
-- meetings, meeting attendance, and event/meeting invites.
-- ============================================================================

SET search_path TO public, auth, extensions;

-- ============================================================================
-- 1. EVENT INVITES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_invites (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_invites_event_id ON public.event_invites USING btree (event_id);
CREATE INDEX IF NOT EXISTS idx_event_invites_user_id ON public.event_invites USING btree (user_id);

-- ============================================================================
-- 2. MEETINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  title text NOT NULL,
  description text,
  scheduled_at timestamp with time zone NOT NULL,
  venue text,
  is_invite_only boolean DEFAULT false,
  minutes_of_meeting text,
  summary text,
  status text DEFAULT 'scheduled'::text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON public.meetings USING btree (scheduled_at);

DROP TRIGGER IF EXISTS set_updated_at ON public.meetings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. MEETING ATTENDANCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attended boolean DEFAULT false,
  notes text,
  marked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting_id ON public.meeting_attendance USING btree (meeting_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.meeting_attendance;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.meeting_attendance FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. MEETING INVITES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.meeting_invites (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_invites_meeting_id ON public.meeting_invites USING btree (meeting_id);

-- ============================================================================
-- 5. SHOOT IDEAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shoot_ideas (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'creative'::text,
  reference_links text,
  status text DEFAULT 'pending'::text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_notes text,
  points_awarded boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shoot_ideas_created_by ON public.shoot_ideas USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_shoot_ideas_status ON public.shoot_ideas USING btree (status);

DROP TRIGGER IF EXISTS set_updated_at ON public.shoot_ideas;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shoot_ideas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. PH SHOOTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_shoots (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  idea_id uuid REFERENCES public.shoot_ideas(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  location text,
  shoot_date timestamp with time zone,
  post_date timestamp with time zone,
  status text DEFAULT 'planning'::text,
  points_awarded boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_shoots_shoot_date ON public.ph_shoots USING btree (shoot_date);

DROP TRIGGER IF EXISTS set_updated_at ON public.ph_shoots;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ph_shoots FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. SHOOT ASSIGNMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shoot_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  shoot_id uuid NOT NULL REFERENCES public.ph_shoots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  status public.assignment_status DEFAULT 'pending'::public.assignment_status,
  notes text,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shoot_assignments_shoot_id_user_id_role_key UNIQUE (shoot_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_shoot_assignments_shoot_id ON public.shoot_assignments USING btree (shoot_id);
CREATE INDEX IF NOT EXISTS idx_shoot_assignments_user_id ON public.shoot_assignments USING btree (user_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.shoot_assignments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shoot_assignments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT ALL ON TABLE public.event_invites TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.meetings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.meeting_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.meeting_invites TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.shoot_ideas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ph_shoots TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.shoot_assignments TO anon, authenticated, service_role;
