-- ============================================================================
-- PhotoHub Database Schema - Migration 001: Initial Schema
-- ============================================================================
-- Creates all ENUM types, tables, constraints, and indexes.
-- All tables use UUID primary keys, timestamptz columns, and soft deletes
-- where applicable.
-- ============================================================================

-- ==========================================================================
-- ENUM TYPES
-- ==========================================================================

CREATE TYPE user_role AS ENUM (
  'admin', 'leader', 'camera_holder', 'participant', 'guest'
);

CREATE TYPE event_type AS ENUM (
  'workshop', 'competition', 'meetup', 'photowalk', 'exhibition', 'webinar', 'other'
);

CREATE TYPE event_visibility AS ENUM (
  'public', 'members_only', 'invite_only'
);

CREATE TYPE submission_mode AS ENUM (
  'image', 'text', 'link', 'drive_link'
);

CREATE TYPE submission_status AS ENUM (
  'pending', 'approved', 'rejected', 'winner'
);

CREATE TYPE post_status AS ENUM (
  'pending', 'approved', 'rejected', 'featured'
);

CREATE TYPE apex_status AS ENUM (
  'pending', 'approved', 'assigned', 'ongoing', 'completed', 'delivered', 'rejected'
);

CREATE TYPE apex_role AS ENUM (
  'photographer', 'videographer', 'editor'
);

CREATE TYPE assignment_status AS ENUM (
  'pending', 'accepted', 'rejected'
);

CREATE TYPE equipment_status AS ENUM (
  'available', 'assigned', 'maintenance', 'retired'
);

CREATE TYPE equipment_type AS ENUM (
  'camera', 'lens', 'tripod', 'lighting', 'drone', 'other'
);

CREATE TYPE coverage_type AS ENUM (
  'photography', 'videography', 'both'
);

CREATE TYPE ig_queue_status AS ENUM (
  'pending', 'shortlisted', 'scheduled', 'posted', 'archived'
);

CREATE TYPE notification_type AS ENUM (
  'info', 'success', 'warning', 'assignment', 'approval', 'rejection'
);

CREATE TYPE point_source AS ENUM (
  'event_attendance', 'submission_approved', 'challenge_win',
  'apex_completed', 'post_approved', 'post_featured',
  'manual', 'consistency_bonus'
);


-- ==========================================================================
-- TABLE 1: profiles
-- Extends auth.users via 1:1 relationship
-- ==========================================================================

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  role        user_role DEFAULT 'participant',
  batch       TEXT,                  -- e.g., '2024', '2025'
  department  TEXT,
  skills      TEXT[],                -- e.g., ARRAY['portrait','landscape','editing']
  bio         TEXT,
  phone       TEXT,
  is_active   BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users. Created automatically on sign-up.';
COMMENT ON COLUMN public.profiles.batch IS 'Admission year/batch, e.g. 2024';
COMMENT ON COLUMN public.profiles.skills IS 'Array of photography skills';


-- ==========================================================================
-- TABLE 2: events
-- Club events: workshops, competitions, photowalks, etc.
-- ==========================================================================

CREATE TABLE public.events (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title                 TEXT NOT NULL,
  description           TEXT,
  banner_url            TEXT,
  event_type            event_type DEFAULT 'other',
  venue                 TEXT,
  start_date            TIMESTAMPTZ NOT NULL,
  end_date              TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ,
  max_participants      INTEGER,
  points                INTEGER DEFAULT 10,
  visibility            event_visibility DEFAULT 'public',
  submission_required   BOOLEAN DEFAULT false,
  submission_mode       submission_mode,
  created_by            UUID REFERENCES public.profiles(id),
  is_published          BOOLEAN DEFAULT true,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure end_date is after start_date
  CONSTRAINT events_date_check CHECK (end_date > start_date),
  -- Registration deadline must be before event start
  CONSTRAINT events_registration_deadline_check
    CHECK (registration_deadline IS NULL OR registration_deadline <= start_date)
);

COMMENT ON TABLE public.events IS 'Club events including workshops, competitions, photowalks, etc.';


-- ==========================================================================
-- TABLE 3: event_registrations
-- User registrations for events with attendance tracking
-- ==========================================================================

CREATE TABLE public.event_registrations (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id       UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status         TEXT DEFAULT 'registered',
  attended       BOOLEAN DEFAULT false,
  checked_in_at  TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  registered_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT event_registrations_unique UNIQUE (event_id, user_id)
);

COMMENT ON TABLE public.event_registrations IS 'Tracks event registrations and attendance.';


-- ==========================================================================
-- TABLE 4: submissions
-- Polymorphic submissions for events, challenges, and apex requests
-- ==========================================================================

CREATE TABLE public.submissions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submittable_type TEXT NOT NULL CHECK (submittable_type IN ('event', 'challenge', 'apex')),
  submittable_id   UUID NOT NULL,
  content_type     submission_mode NOT NULL,
  content_url      TEXT,
  caption          TEXT,
  external_link    TEXT,
  status           submission_status DEFAULT 'pending',
  score            NUMERIC(5,2),
  feedback         TEXT,
  reviewed_by      UUID REFERENCES public.profiles(id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.submissions IS 'Polymorphic submissions for events, challenges, and apex coverage.';
COMMENT ON COLUMN public.submissions.submittable_type IS 'One of: event, challenge, apex';
COMMENT ON COLUMN public.submissions.submittable_id IS 'References events.id, challenges.id, or apex_requests.id';


-- ==========================================================================
-- TABLE 5: posts
-- User-submitted photography posts for the gallery
-- ==========================================================================

CREATE TABLE public.posts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption          TEXT,
  status           post_status DEFAULT 'pending',
  is_featured      BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  reviewed_by      UUID REFERENCES public.profiles(id),
  reviewed_at      TIMESTAMPTZ,
  like_count       INTEGER DEFAULT 0,
  comment_count    INTEGER DEFAULT 0,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  -- Counts must be non-negative
  CONSTRAINT posts_like_count_check CHECK (like_count >= 0),
  CONSTRAINT posts_comment_count_check CHECK (comment_count >= 0)
);

COMMENT ON TABLE public.posts IS 'User photography posts for the gallery/feed.';


-- ==========================================================================
-- TABLE 6: post_media
-- Media files attached to posts (supports multiple images/videos per post)
-- ==========================================================================

CREATE TABLE public.post_media (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id               UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_type            TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  url                   TEXT NOT NULL,
  thumbnail_url         TEXT,
  cloudinary_public_id  TEXT,
  width                 INTEGER,
  height                INTEGER,
  sort_order            INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.post_media IS 'Media attachments for posts. Supports multiple images/videos per post.';


-- ==========================================================================
-- TABLE 7: likes
-- Post likes (one per user per post)
-- ==========================================================================

CREATE TABLE public.likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT likes_unique UNIQUE (post_id, user_id)
);

COMMENT ON TABLE public.likes IS 'Post likes. Each user can like a post only once.';


-- ==========================================================================
-- TABLE 8: comments
-- Post comments with support for threaded replies via parent_id
-- ==========================================================================

CREATE TABLE public.comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  parent_id  UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.comments IS 'Post comments with threaded reply support.';


-- ==========================================================================
-- TABLE 9: apex_requests
-- External event coverage requests (APEX = photography/videography service)
-- Public-facing: anyone can submit a request without authentication
-- ==========================================================================

CREATE TABLE public.apex_requests (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name       TEXT NOT NULL,
  organizer_name   TEXT NOT NULL,
  department       TEXT,
  contact_email    TEXT NOT NULL,
  contact_phone    TEXT,
  venue            TEXT,
  event_date       DATE NOT NULL,
  event_time       TIME,
  end_time         TIME,
  coverage_type    coverage_type DEFAULT 'both',
  notes            TEXT,
  status           apex_status DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by      UUID REFERENCES public.profiles(id),
  reviewed_at      TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.apex_requests IS 'External event coverage requests. Public-facing form — no auth required to create.';


-- ==========================================================================
-- TABLE 14: equipment (created before apex_assignments due to FK dependency)
-- Club equipment inventory
-- ==========================================================================

CREATE TABLE public.equipment (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  type          equipment_type DEFAULT 'camera',
  model         TEXT,
  serial_number TEXT UNIQUE,
  status        equipment_status DEFAULT 'available',
  condition     TEXT DEFAULT 'good',
  notes         TEXT,
  image_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.equipment IS 'Club photography equipment inventory.';


-- ==========================================================================
-- TABLE 10: apex_assignments
-- Assigns club members to approved apex requests
-- ==========================================================================

CREATE TABLE public.apex_assignments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id   UUID NOT NULL REFERENCES public.apex_requests(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         apex_role NOT NULL,
  status       assignment_status DEFAULT 'pending',
  equipment_id UUID REFERENCES public.equipment(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT apex_assignments_unique UNIQUE (request_id, user_id)
);

COMMENT ON TABLE public.apex_assignments IS 'Member assignments for apex coverage requests.';


-- ==========================================================================
-- TABLE 11: apex_attendance
-- Attendance tracking for apex assignments
-- ==========================================================================

CREATE TABLE public.apex_attendance (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id  UUID NOT NULL REFERENCES public.apex_assignments(id) ON DELETE CASCADE,
  checked_in_at  TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  hours_logged   NUMERIC(5,2),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.apex_attendance IS 'Attendance records for apex coverage assignments.';


-- ==========================================================================
-- TABLE 12: apex_media
-- Media uploaded for completed apex requests
-- ==========================================================================

CREATE TABLE public.apex_media (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id           UUID NOT NULL REFERENCES public.apex_requests(id) ON DELETE CASCADE,
  uploaded_by          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url                  TEXT NOT NULL,
  thumbnail_url        TEXT,
  media_type           TEXT CHECK (media_type IN ('image', 'video')),
  cloudinary_public_id TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.apex_media IS 'Media files from completed apex coverage.';


-- ==========================================================================
-- TABLE 13: challenges
-- Photography challenges and contests
-- ==========================================================================

CREATE TABLE public.challenges (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title                    TEXT NOT NULL,
  description              TEXT,
  theme                    TEXT,
  banner_url               TEXT,
  start_date               TIMESTAMPTZ NOT NULL,
  end_date                 TIMESTAMPTZ NOT NULL,
  points                   INTEGER DEFAULT 20,
  submission_mode          submission_mode DEFAULT 'image',
  max_submissions_per_user INTEGER DEFAULT 1,
  created_by               UUID REFERENCES public.profiles(id),
  is_active                BOOLEAN DEFAULT true,
  deleted_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT challenges_date_check CHECK (end_date > start_date)
);

COMMENT ON TABLE public.challenges IS 'Photography challenges and weekly/monthly contests.';


-- ==========================================================================
-- TABLE 15: equipment_assignments
-- Equipment checkout/return tracking
-- ==========================================================================

CREATE TABLE public.equipment_assignments (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id        UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  assigned_to         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by         UUID REFERENCES public.profiles(id),
  event_id            UUID REFERENCES public.events(id),
  apex_request_id     UUID REFERENCES public.apex_requests(id),
  checked_out_at      TIMESTAMPTZ DEFAULT NOW(),
  expected_return     TIMESTAMPTZ,
  returned_at         TIMESTAMPTZ,
  condition_on_return TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.equipment_assignments IS 'Equipment checkout and return tracking.';


-- ==========================================================================
-- TABLE 16: points_log
-- Immutable log of all points awarded/deducted
-- ==========================================================================

CREATE TABLE public.points_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  source_type point_source NOT NULL,
  source_id   UUID,
  awarded_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.points_log IS 'Immutable audit log of all points awarded to users.';


-- ==========================================================================
-- TABLE 17: leaderboard_cache
-- Materialized/cached leaderboard data, refreshed periodically
-- ==========================================================================

CREATE TABLE public.leaderboard_cache (
  user_id          UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_points     INTEGER DEFAULT 0,
  monthly_points   INTEGER DEFAULT 0,
  semester_points  INTEGER DEFAULT 0,
  event_count      INTEGER DEFAULT 0,
  submission_count INTEGER DEFAULT 0,
  rank             INTEGER,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.leaderboard_cache IS 'Cached leaderboard data. Refreshed by refresh_leaderboard() function.';


-- ==========================================================================
-- TABLE 18: announcements
-- Club-wide announcements and notices
-- ==========================================================================

CREATE TABLE public.announcements (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  is_pinned  BOOLEAN DEFAULT false,
  priority   INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.announcements IS 'Club-wide announcements and notices.';


-- ==========================================================================
-- TABLE 19: notifications
-- Per-user notifications
-- ==========================================================================

CREATE TABLE public.notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT,
  type        notification_type DEFAULT 'info',
  source_type TEXT,
  source_id   UUID,
  is_read     BOOLEAN DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'Per-user notification inbox.';


-- ==========================================================================
-- TABLE 20: instagram_queue
-- Queue for posts to be published on Instagram
-- ==========================================================================

CREATE TABLE public.instagram_queue (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id       UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  caption       TEXT,
  status        ig_queue_status DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  posted_at     TIMESTAMPTZ,
  managed_by    UUID REFERENCES public.profiles(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.instagram_queue IS 'Queue for scheduling and tracking Instagram posts.';


-- ==========================================================================
-- INDEXES
-- ==========================================================================
-- Naming convention: idx_{table}_{column(s)}

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_batch ON public.profiles (batch);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);

-- events
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events (created_by);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events (visibility);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events (start_date);
CREATE INDEX IF NOT EXISTS idx_events_is_published ON public.events (is_published);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON public.events (deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events (created_at);
-- Composite: common query pattern for listing upcoming published events
CREATE INDEX IF NOT EXISTS idx_events_published_upcoming
  ON public.events (start_date)
  WHERE is_published = true AND deleted_at IS NULL;

-- event_registrations
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations (user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON public.event_registrations (status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_attended ON public.event_registrations (attended);

-- submissions
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submittable ON public.submissions (submittable_type, submittable_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_reviewed_by ON public.submissions (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions (created_at);

-- posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts (status);
CREATE INDEX IF NOT EXISTS idx_posts_is_featured ON public.posts (is_featured);
CREATE INDEX IF NOT EXISTS idx_posts_reviewed_by ON public.posts (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON public.posts (deleted_at);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at);
-- Composite: approved non-deleted posts for feed
CREATE INDEX IF NOT EXISTS idx_posts_approved_feed
  ON public.posts (created_at DESC)
  WHERE status = 'approved' AND deleted_at IS NULL;

-- post_media
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media (post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_sort_order ON public.post_media (post_id, sort_order);

-- likes
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes (post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes (user_id);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments (deleted_at);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments (created_at);

-- apex_requests
CREATE INDEX IF NOT EXISTS idx_apex_requests_status ON public.apex_requests (status);
CREATE INDEX IF NOT EXISTS idx_apex_requests_contact_email ON public.apex_requests (contact_email);
CREATE INDEX IF NOT EXISTS idx_apex_requests_event_date ON public.apex_requests (event_date);
CREATE INDEX IF NOT EXISTS idx_apex_requests_reviewed_by ON public.apex_requests (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_apex_requests_created_at ON public.apex_requests (created_at);

-- apex_assignments
CREATE INDEX IF NOT EXISTS idx_apex_assignments_request_id ON public.apex_assignments (request_id);
CREATE INDEX IF NOT EXISTS idx_apex_assignments_user_id ON public.apex_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_apex_assignments_status ON public.apex_assignments (status);
CREATE INDEX IF NOT EXISTS idx_apex_assignments_equipment_id ON public.apex_assignments (equipment_id);

-- apex_attendance
CREATE INDEX IF NOT EXISTS idx_apex_attendance_assignment_id ON public.apex_attendance (assignment_id);

-- apex_media
CREATE INDEX IF NOT EXISTS idx_apex_media_request_id ON public.apex_media (request_id);
CREATE INDEX IF NOT EXISTS idx_apex_media_uploaded_by ON public.apex_media (uploaded_by);

-- challenges
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON public.challenges (created_by);
CREATE INDEX IF NOT EXISTS idx_challenges_is_active ON public.challenges (is_active);
CREATE INDEX IF NOT EXISTS idx_challenges_start_date ON public.challenges (start_date);
CREATE INDEX IF NOT EXISTS idx_challenges_end_date ON public.challenges (end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_deleted_at ON public.challenges (deleted_at);
CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON public.challenges (created_at);

-- equipment
CREATE INDEX IF NOT EXISTS idx_equipment_type ON public.equipment (type);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment (status);
CREATE INDEX IF NOT EXISTS idx_equipment_serial_number ON public.equipment (serial_number);

-- equipment_assignments
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_equipment_id ON public.equipment_assignments (equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_assigned_to ON public.equipment_assignments (assigned_to);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_assigned_by ON public.equipment_assignments (assigned_by);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_event_id ON public.equipment_assignments (event_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_apex_request_id ON public.equipment_assignments (apex_request_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_returned_at ON public.equipment_assignments (returned_at);
-- Composite: find currently checked-out equipment
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_active
  ON public.equipment_assignments (equipment_id)
  WHERE returned_at IS NULL;

-- points_log
CREATE INDEX IF NOT EXISTS idx_points_log_user_id ON public.points_log (user_id);
CREATE INDEX IF NOT EXISTS idx_points_log_source_type ON public.points_log (source_type);
CREATE INDEX IF NOT EXISTS idx_points_log_source_id ON public.points_log (source_id);
CREATE INDEX IF NOT EXISTS idx_points_log_awarded_by ON public.points_log (awarded_by);
CREATE INDEX IF NOT EXISTS idx_points_log_created_at ON public.points_log (created_at);
-- Composite: user points for leaderboard calculation
CREATE INDEX IF NOT EXISTS idx_points_log_user_created
  ON public.points_log (user_id, created_at);

-- leaderboard_cache
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_total_points ON public.leaderboard_cache (total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_rank ON public.leaderboard_cache (rank);

-- announcements
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements (created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_is_pinned ON public.announcements (is_pinned);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements (priority DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON public.announcements (expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_deleted_at ON public.announcements (deleted_at);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements (created_at);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at);
-- Composite: unread notifications per user (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- instagram_queue
CREATE INDEX IF NOT EXISTS idx_instagram_queue_post_id ON public.instagram_queue (post_id);
CREATE INDEX IF NOT EXISTS idx_instagram_queue_status ON public.instagram_queue (status);
CREATE INDEX IF NOT EXISTS idx_instagram_queue_managed_by ON public.instagram_queue (managed_by);
CREATE INDEX IF NOT EXISTS idx_instagram_queue_scheduled_for ON public.instagram_queue (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_instagram_queue_created_at ON public.instagram_queue (created_at);
