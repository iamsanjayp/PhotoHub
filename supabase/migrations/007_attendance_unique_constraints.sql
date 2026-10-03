-- Migration 007: Add unique constraints for upserts on meeting_attendance, meeting_invites, and event_invites

-- 1. Meeting Attendance: ensure no duplicates exist before adding constraint
DELETE FROM public.meeting_attendance a USING public.meeting_attendance b
WHERE a.id < b.id AND a.meeting_id = b.meeting_id AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_attendance_meeting_user ON public.meeting_attendance (meeting_id, user_id);

-- 2. Meeting Invites: ensure no duplicates exist before adding constraint
DELETE FROM public.meeting_invites a USING public.meeting_invites b
WHERE a.id < b.id AND a.meeting_id = b.meeting_id AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_invites_meeting_user ON public.meeting_invites (meeting_id, user_id);

-- 3. Event Invites: ensure no duplicates exist before adding constraint
DELETE FROM public.event_invites a USING public.event_invites b
WHERE a.id < b.id AND a.event_id = b.event_id AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_invites_event_user ON public.event_invites (event_id, user_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
