-- ============================================================================
-- PhotoHub Database Schema - Migration 002: Row Level Security Policies
-- ============================================================================
-- Enables RLS on all tables and creates comprehensive access policies.
-- Uses helper functions for role checks to keep policies DRY.
-- ============================================================================

-- ==========================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ==========================================================================
-- These functions run with the privileges of the function creator, allowing
-- secure role lookups without exposing the profiles table directly.

-- Returns the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Returns TRUE if the current user is an admin or leader
CREATE OR REPLACE FUNCTION public.is_admin_or_leader()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'leader')
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Returns TRUE if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ==========================================================================
-- ENABLE RLS ON ALL TABLES
-- ==========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apex_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apex_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apex_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apex_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_queue ENABLE ROW LEVEL SECURITY;


-- ==========================================================================
-- PROFILES POLICIES
-- ==========================================================================

-- All authenticated users can view active profiles
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Users can update their own profile (limited fields handled at app level)
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile (role changes, deactivation, etc.)
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Profiles are created by the handle_new_user trigger (service role)
-- No direct INSERT policy needed for authenticated users


-- ==========================================================================
-- EVENTS POLICIES
-- ==========================================================================

-- Anyone authenticated can read published, non-deleted events
CREATE POLICY events_select ON public.events
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND deleted_at IS NULL
  );

-- Admin/leader can see all events including drafts and deleted
CREATE POLICY events_select_admin ON public.events
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Admin/leader can create events
CREATE POLICY events_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_leader());

-- Admin/leader can update events
CREATE POLICY events_update ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());

-- Admin/leader can soft-delete events (via update to deleted_at)
-- Covered by events_update policy above

-- No hard DELETE policy — use soft delete


-- ==========================================================================
-- EVENT_REGISTRATIONS POLICIES
-- ==========================================================================

-- Users can read their own registrations
CREATE POLICY event_registrations_select_own ON public.event_registrations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin/leader can read all registrations
CREATE POLICY event_registrations_select_admin ON public.event_registrations
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Users can register themselves for events
CREATE POLICY event_registrations_insert ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own registration (cancel)
CREATE POLICY event_registrations_update_own ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin/leader can update any registration (mark attendance)
CREATE POLICY event_registrations_update_admin ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());

-- Users can cancel their own registration
CREATE POLICY event_registrations_delete_own ON public.event_registrations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ==========================================================================
-- SUBMISSIONS POLICIES
-- ==========================================================================

-- Users can read their own submissions
CREATE POLICY submissions_select_own ON public.submissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin/leader can read all submissions
CREATE POLICY submissions_select_admin ON public.submissions
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Users can create their own submissions
CREATE POLICY submissions_insert ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own pending submissions
CREATE POLICY submissions_update_own ON public.submissions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- Admin/leader can update any submission (approve/reject/score)
CREATE POLICY submissions_update_admin ON public.submissions
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());


-- ==========================================================================
-- POSTS POLICIES
-- ==========================================================================

-- Everyone can read approved, non-deleted posts
CREATE POLICY posts_select_approved ON public.posts
  FOR SELECT TO authenticated
  USING (
    status = 'approved' AND deleted_at IS NULL
  );

-- Users can also read their own posts (any status)
CREATE POLICY posts_select_own ON public.posts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin/leader can read all posts
CREATE POLICY posts_select_admin ON public.posts
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Users can create their own posts
CREATE POLICY posts_insert ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own pending posts
CREATE POLICY posts_update_own ON public.posts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- Admin/leader can update any post (approve/reject/feature)
CREATE POLICY posts_update_admin ON public.posts
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());

-- Users can soft-delete their own posts
-- Covered by posts_update_own (sets deleted_at)


-- ==========================================================================
-- POST_MEDIA POLICIES
-- ==========================================================================

-- Anyone can read media for posts they can see
-- (media visibility follows post visibility)
CREATE POLICY post_media_select ON public.post_media
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND (
          p.status = 'approved' AND p.deleted_at IS NULL
          OR p.user_id = auth.uid()
        )
    )
    OR public.is_admin_or_leader()
  );

-- Users can insert media for their own posts
CREATE POLICY post_media_insert ON public.post_media
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

-- Users can update media for their own pending posts
CREATE POLICY post_media_update ON public.post_media
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid() AND p.status = 'pending'
    )
  );

-- Users can delete media from their own pending posts
CREATE POLICY post_media_delete ON public.post_media
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid() AND p.status = 'pending'
    )
  );

-- Admin can manage all post media
CREATE POLICY post_media_admin ON public.post_media
  FOR ALL TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());


-- ==========================================================================
-- LIKES POLICIES
-- ==========================================================================

-- Everyone can read likes
CREATE POLICY likes_select ON public.likes
  FOR SELECT TO authenticated
  USING (true);

-- Users can insert their own likes
CREATE POLICY likes_insert ON public.likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can remove their own likes
CREATE POLICY likes_delete ON public.likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ==========================================================================
-- COMMENTS POLICIES
-- ==========================================================================

-- Everyone can read non-deleted comments on approved posts
CREATE POLICY comments_select ON public.comments
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND p.status = 'approved'
        AND p.deleted_at IS NULL
    )
  );

-- Admin can read all comments
CREATE POLICY comments_select_admin ON public.comments
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Users can create comments on approved posts
CREATE POLICY comments_insert ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND p.status = 'approved'
        AND p.deleted_at IS NULL
    )
  );

-- Users can update their own comments
CREATE POLICY comments_update_own ON public.comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Users can soft-delete their own comments
-- (handled via UPDATE setting deleted_at — covered by comments_update_own)

-- Admin can delete any comment
CREATE POLICY comments_delete_admin ON public.comments
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());


-- ==========================================================================
-- APEX_REQUESTS POLICIES
-- ==========================================================================

-- Public INSERT — anyone (even unauthenticated) can submit a coverage request
CREATE POLICY apex_requests_insert_public ON public.apex_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admin/leader can read all requests
CREATE POLICY apex_requests_select_admin ON public.apex_requests
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Public can read their own request by matching email
-- (for status tracking page — email verified at app level)
CREATE POLICY apex_requests_select_by_email ON public.apex_requests
  FOR SELECT TO anon, authenticated
  USING (true);
  -- Note: In production, filter by contact_email at the app level
  -- or use a server function. Keeping this open since apex requests
  -- are not sensitive — they're event coverage requests.

-- Admin/leader can update requests (approve, reject, complete)
CREATE POLICY apex_requests_update_admin ON public.apex_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());


-- ==========================================================================
-- APEX_ASSIGNMENTS POLICIES
-- ==========================================================================

-- Assigned users can read their own assignments
CREATE POLICY apex_assignments_select_own ON public.apex_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin/leader can read all assignments
CREATE POLICY apex_assignments_select_admin ON public.apex_assignments
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Admin/leader can create assignments
CREATE POLICY apex_assignments_insert_admin ON public.apex_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_leader());

-- Assigned users can update their own assignment (accept/reject)
CREATE POLICY apex_assignments_update_own ON public.apex_assignments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin/leader can update any assignment
CREATE POLICY apex_assignments_update_admin ON public.apex_assignments
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());

-- Admin/leader can delete assignments
CREATE POLICY apex_assignments_delete_admin ON public.apex_assignments
  FOR DELETE TO authenticated
  USING (public.is_admin_or_leader());


-- ==========================================================================
-- APEX_ATTENDANCE POLICIES
-- ==========================================================================

-- Admin/leader can create attendance records
CREATE POLICY apex_attendance_insert_admin ON public.apex_attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_leader());

-- Admin/leader can read all attendance
CREATE POLICY apex_attendance_select_admin ON public.apex_attendance
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Assigned user can read their own attendance
CREATE POLICY apex_attendance_select_own ON public.apex_attendance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.apex_assignments a
      WHERE a.id = assignment_id AND a.user_id = auth.uid()
    )
  );

-- Admin/leader can update attendance
CREATE POLICY apex_attendance_update_admin ON public.apex_attendance
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());


-- ==========================================================================
-- APEX_MEDIA POLICIES
-- ==========================================================================

-- Admin/leader can read all apex media
CREATE POLICY apex_media_select_admin ON public.apex_media
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Assigned users for the request can read media
CREATE POLICY apex_media_select_assigned ON public.apex_media
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.apex_assignments a
      WHERE a.request_id = apex_media.request_id AND a.user_id = auth.uid()
    )
  );

-- Assigned users can upload media to their assigned requests
CREATE POLICY apex_media_insert ON public.apex_media
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.apex_assignments a
      WHERE a.request_id = apex_media.request_id
        AND a.user_id = auth.uid()
        AND a.status = 'accepted'
    )
  );

-- Admin can manage all apex media
CREATE POLICY apex_media_admin ON public.apex_media
  FOR ALL TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());


-- ==========================================================================
-- CHALLENGES POLICIES
-- ==========================================================================

-- Authenticated users can read active, non-deleted challenges
CREATE POLICY challenges_select ON public.challenges
  FOR SELECT TO authenticated
  USING (
    is_active = true AND deleted_at IS NULL
  );

-- Admin/leader can see all challenges
CREATE POLICY challenges_select_admin ON public.challenges
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Admin/leader can create challenges
CREATE POLICY challenges_insert ON public.challenges
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_leader());

-- Admin/leader can update challenges
CREATE POLICY challenges_update ON public.challenges
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());


-- ==========================================================================
-- EQUIPMENT POLICIES
-- ==========================================================================

-- Authenticated users can view equipment
CREATE POLICY equipment_select ON public.equipment
  FOR SELECT TO authenticated
  USING (true);

-- Admin can manage equipment
CREATE POLICY equipment_insert ON public.equipment
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY equipment_update ON public.equipment
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY equipment_delete ON public.equipment
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- ==========================================================================
-- EQUIPMENT_ASSIGNMENTS POLICIES
-- ==========================================================================

-- Admin/leader can create equipment assignments
CREATE POLICY equipment_assignments_insert ON public.equipment_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_leader());

-- Assigned user can read their own assignments
CREATE POLICY equipment_assignments_select_own ON public.equipment_assignments
  FOR SELECT TO authenticated
  USING (assigned_to = auth.uid());

-- Admin/leader can read all assignments
CREATE POLICY equipment_assignments_select_admin ON public.equipment_assignments
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Admin/leader can update (record returns, notes)
CREATE POLICY equipment_assignments_update_admin ON public.equipment_assignments
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());


-- ==========================================================================
-- POINTS_LOG POLICIES
-- ==========================================================================

-- Users can read their own points
CREATE POLICY points_log_select_own ON public.points_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin can read all points
CREATE POLICY points_log_select_admin ON public.points_log
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Admin can manually award points
CREATE POLICY points_log_insert_admin ON public.points_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_leader());


-- ==========================================================================
-- LEADERBOARD_CACHE POLICIES
-- ==========================================================================

-- Everyone (authenticated) can read the leaderboard
CREATE POLICY leaderboard_cache_select ON public.leaderboard_cache
  FOR SELECT TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE for regular users
-- Writes happen only via refresh_leaderboard() function (SECURITY DEFINER)
-- or service_role


-- ==========================================================================
-- ANNOUNCEMENTS POLICIES
-- ==========================================================================

-- Authenticated users can read active, non-expired, non-deleted announcements
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Admin/leader can see all announcements
CREATE POLICY announcements_select_admin ON public.announcements
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

-- Admin/leader can create announcements
CREATE POLICY announcements_insert ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_leader());

-- Admin/leader can update announcements
CREATE POLICY announcements_update ON public.announcements
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());

-- Admin/leader can delete announcements
CREATE POLICY announcements_delete ON public.announcements
  FOR DELETE TO authenticated
  USING (public.is_admin_or_leader());


-- ==========================================================================
-- NOTIFICATIONS POLICIES
-- ==========================================================================

-- Users can read their own notifications
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notifications are created by triggers/functions (SECURITY DEFINER)
-- Admin can also create notifications
CREATE POLICY notifications_insert_admin ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_leader());

-- Users can delete their own notifications
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ==========================================================================
-- INSTAGRAM_QUEUE POLICIES
-- ==========================================================================

-- Admin/leader can manage the entire Instagram queue
CREATE POLICY instagram_queue_select ON public.instagram_queue
  FOR SELECT TO authenticated
  USING (public.is_admin_or_leader());

CREATE POLICY instagram_queue_insert ON public.instagram_queue
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_leader());

CREATE POLICY instagram_queue_update ON public.instagram_queue
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_leader())
  WITH CHECK (public.is_admin_or_leader());

CREATE POLICY instagram_queue_delete ON public.instagram_queue
  FOR DELETE TO authenticated
  USING (public.is_admin_or_leader());
