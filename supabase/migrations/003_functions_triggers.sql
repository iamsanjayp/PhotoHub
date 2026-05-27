-- ============================================================================
-- PhotoHub Database Schema - Migration 003: Functions & Triggers
-- ============================================================================
-- Creates all trigger functions, utility functions, and attaches triggers.
-- All trigger functions use SECURITY DEFINER where they need to bypass RLS
-- (e.g., inserting points_log entries or notifications).
-- ============================================================================


-- ==========================================================================
-- 1. handle_new_user()
-- Trigger: AFTER INSERT ON auth.users
-- Creates a profile row when a new user signs in via Google OAuth.
-- Validates that the email ends with @bitsathy.ac.in.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _email TEXT;
  _full_name TEXT;
  _avatar_url TEXT;
BEGIN
  _email := NEW.email;

  -- Validate email domain — only @bitsathy.ac.in allowed
  IF _email IS NULL OR NOT _email LIKE '%@bitsathy.ac.in' THEN
    RAISE EXCEPTION 'Only @bitsathy.ac.in email addresses are allowed. Got: %', COALESCE(_email, 'NULL');
  END IF;

  -- Extract metadata from Google OAuth
  _full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(_email, '@', 1)
  );
  _avatar_url := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture'
  );

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, created_at, updated_at)
  VALUES (
    NEW.id,
    _email,
    _full_name,
    _avatar_url,
    'participant',
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ==========================================================================
-- 2. handle_updated_at()
-- Generic trigger function to auto-update the updated_at column.
-- Applied to all tables that have an updated_at column.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.apex_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.instagram_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ==========================================================================
-- 3. handle_like_count()
-- Trigger: AFTER INSERT OR DELETE ON likes
-- Keeps posts.like_count in sync.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.handle_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET like_count = like_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_like_count();


-- ==========================================================================
-- 4. handle_comment_count()
-- Trigger: AFTER INSERT OR DELETE ON comments
-- Keeps posts.comment_count in sync (only non-deleted comments).
-- On soft-delete (UPDATE setting deleted_at), we also need to handle it.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.handle_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only count non-deleted comments
    IF NEW.deleted_at IS NULL THEN
      UPDATE public.posts
      SET comment_count = comment_count + 1
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only decrement if the comment wasn't already soft-deleted
    IF OLD.deleted_at IS NULL THEN
      UPDATE public.posts
      SET comment_count = GREATEST(comment_count - 1, 0)
      WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_count();

-- Handle soft-delete (when deleted_at changes from NULL to a value)
CREATE OR REPLACE FUNCTION public.handle_comment_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Comment was soft-deleted
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE public.posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = NEW.post_id;
  -- Comment was restored (un-deleted)
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    UPDATE public.posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_comment_soft_delete
  AFTER UPDATE OF deleted_at ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_soft_delete();


-- ==========================================================================
-- 5. award_points_for_attendance()
-- Trigger: AFTER UPDATE ON event_registrations
-- Awards points when a user is marked as having attended an event.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.award_points_for_attendance()
RETURNS TRIGGER AS $$
DECLARE
  _event_points INTEGER;
BEGIN
  -- Only fire when attended changes from false to true
  IF OLD.attended = false AND NEW.attended = true THEN
    -- Get the event's point value
    SELECT COALESCE(points, 10) INTO _event_points
    FROM public.events
    WHERE id = NEW.event_id;

    -- Avoid duplicate points: check if already awarded for this event
    IF NOT EXISTS (
      SELECT 1 FROM public.points_log
      WHERE user_id = NEW.user_id
        AND source_type = 'event_attendance'
        AND source_id = NEW.event_id
    ) THEN
      INSERT INTO public.points_log (id, user_id, points, reason, source_type, source_id, created_at)
      VALUES (
        gen_random_uuid(),
        NEW.user_id,
        _event_points,
        'Event attendance: ' || (SELECT title FROM public.events WHERE id = NEW.event_id),
        'event_attendance',
        NEW.event_id,
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_attendance_marked
  AFTER UPDATE OF attended ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_for_attendance();


-- ==========================================================================
-- 6. award_points_for_submission()
-- Trigger: AFTER UPDATE ON submissions
-- Awards points when a submission is approved or wins.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.award_points_for_submission()
RETURNS TRIGGER AS $$
DECLARE
  _points INTEGER := 15; -- Default fallback
  _title TEXT := '';
BEGIN
  -- Get the actual points and title based on submittable type
  IF NEW.submittable_type = 'event' THEN
    SELECT COALESCE(points, 15), title INTO _points, _title
    FROM public.events
    WHERE id = NEW.submittable_id;
  ELSIF NEW.submittable_type = 'challenge' THEN
    SELECT COALESCE(points, 20), title INTO _points, _title
    FROM public.challenges
    WHERE id = NEW.submittable_id;
  END IF;

  -- Award points when submission is approved
  IF (OLD.status IS DISTINCT FROM 'approved') AND NEW.status = 'approved' THEN
    -- Avoid duplicate points
    IF NOT EXISTS (
      SELECT 1 FROM public.points_log
      WHERE user_id = NEW.user_id
        AND source_type = 'submission_approved'
        AND source_id = NEW.id
    ) THEN
      INSERT INTO public.points_log (id, user_id, points, reason, source_type, source_id, created_at)
      VALUES (
        gen_random_uuid(),
        NEW.user_id,
        _points,
        'Submission approved: ' || COALESCE(_title, NEW.submittable_type),
        'submission_approved',
        NEW.id,
        NOW()
      );
    END IF;
  END IF;

  -- Award bonus points when submission wins
  IF (OLD.status IS DISTINCT FROM 'winner') AND NEW.status = 'winner' THEN
    -- Also award approval points if not already awarded
    IF NOT EXISTS (
      SELECT 1 FROM public.points_log
      WHERE user_id = NEW.user_id
        AND source_type = 'submission_approved'
        AND source_id = NEW.id
    ) THEN
      INSERT INTO public.points_log (id, user_id, points, reason, source_type, source_id, created_at)
      VALUES (
        gen_random_uuid(),
        NEW.user_id,
        _points,
        'Submission approved: ' || COALESCE(_title, NEW.submittable_type),
        'submission_approved',
        NEW.id,
        NOW()
      );
    END IF;

    -- Award winner bonus
    IF NOT EXISTS (
      SELECT 1 FROM public.points_log
      WHERE user_id = NEW.user_id
        AND source_type = 'challenge_win'
        AND source_id = NEW.id
    ) THEN
      INSERT INTO public.points_log (id, user_id, points, reason, source_type, source_id, created_at)
      VALUES (
        gen_random_uuid(),
        NEW.user_id,
        50,
        'Submission winner: ' || COALESCE(_title, NEW.submittable_type),
        'challenge_win',
        NEW.id,
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_submission_status_change
  AFTER UPDATE OF status ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_for_submission();


-- ==========================================================================
-- 7. award_points_for_post()
-- Trigger: AFTER UPDATE ON posts
-- Awards points when a post is approved or featured.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.award_points_for_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points when post is approved
  IF (OLD.status IS DISTINCT FROM 'approved') AND NEW.status = 'approved' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.points_log
      WHERE user_id = NEW.user_id
        AND source_type = 'post_approved'
        AND source_id = NEW.id
    ) THEN
      INSERT INTO public.points_log (id, user_id, points, reason, source_type, source_id, created_at)
      VALUES (
        gen_random_uuid(),
        NEW.user_id,
        5,
        'Post approved',
        'post_approved',
        NEW.id,
        NOW()
      );
    END IF;
  END IF;

  -- Award bonus when post is featured (is_featured changed from false/null to true)
  IF (OLD.is_featured IS DISTINCT FROM true) AND NEW.is_featured = true THEN
    -- Also ensure approval points are awarded
    IF NOT EXISTS (
      SELECT 1 FROM public.points_log
      WHERE user_id = NEW.user_id
        AND source_type = 'post_approved'
        AND source_id = NEW.id
    ) THEN
      INSERT INTO public.points_log (id, user_id, points, reason, source_type, source_id, created_at)
      VALUES (
        gen_random_uuid(),
        NEW.user_id,
        5,
        'Post approved',
        'post_approved',
        NEW.id,
        NOW()
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.points_log
      WHERE user_id = NEW.user_id
        AND source_type = 'post_featured'
        AND source_id = NEW.id
    ) THEN
      INSERT INTO public.points_log (id, user_id, points, reason, source_type, source_id, created_at)
      VALUES (
        gen_random_uuid(),
        NEW.user_id,
        20,
        'Post featured',
        'post_featured',
        NEW.id,
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_post_status_change ON public.posts;
DROP TRIGGER IF EXISTS on_post_update ON public.posts;

CREATE TRIGGER on_post_update
  AFTER UPDATE OF status, is_featured ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_for_post();


-- ==========================================================================
-- 8. refresh_leaderboard()
-- Callable function to recalculate the entire leaderboard_cache table.
-- Should be called periodically via cron or after batch point updates.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.refresh_leaderboard()
RETURNS VOID AS $$
DECLARE
  _semester_start DATE;
  _current_month_start DATE;
BEGIN
  -- Calculate semester boundaries
  -- Jan-Jun = Spring semester, Jul-Dec = Fall semester
  IF EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN
    _semester_start := DATE_TRUNC('year', CURRENT_DATE)::DATE;
  ELSE
    _semester_start := (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '6 months')::DATE;
  END IF;

  _current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Upsert leaderboard data for all active users
  INSERT INTO public.leaderboard_cache (
    user_id, total_points, monthly_points, semester_points,
    event_count, submission_count, rank, updated_at
  )
  SELECT
    p.id AS user_id,
    COALESCE(total.pts, 0) AS total_points,
    COALESCE(monthly.pts, 0) AS monthly_points,
    COALESCE(semester.pts, 0) AS semester_points,
    COALESCE(ev.cnt, 0) AS event_count,
    COALESCE(sub.cnt, 0) AS submission_count,
    DENSE_RANK() OVER (ORDER BY COALESCE(total.pts, 0) DESC) AS rank,
    NOW() AS updated_at
  FROM public.profiles p
  -- Total points
  LEFT JOIN (
    SELECT user_id, SUM(points) AS pts
    FROM public.points_log
    GROUP BY user_id
  ) total ON total.user_id = p.id
  -- Monthly points
  LEFT JOIN (
    SELECT user_id, SUM(points) AS pts
    FROM public.points_log
    WHERE created_at >= _current_month_start
    GROUP BY user_id
  ) monthly ON monthly.user_id = p.id
  -- Semester points
  LEFT JOIN (
    SELECT user_id, SUM(points) AS pts
    FROM public.points_log
    WHERE created_at >= _semester_start
    GROUP BY user_id
  ) semester ON semester.user_id = p.id
  -- Event count (attended)
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt
    FROM public.event_registrations
    WHERE attended = true
    GROUP BY user_id
  ) ev ON ev.user_id = p.id
  -- Submission count (approved or winner)
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt
    FROM public.submissions
    WHERE status IN ('approved', 'winner')
    GROUP BY user_id
  ) sub ON sub.user_id = p.id
  WHERE p.is_active = true
  ON CONFLICT (user_id) DO UPDATE SET
    total_points     = EXCLUDED.total_points,
    monthly_points   = EXCLUDED.monthly_points,
    semester_points  = EXCLUDED.semester_points,
    event_count      = EXCLUDED.event_count,
    submission_count = EXCLUDED.submission_count,
    rank             = EXCLUDED.rank,
    updated_at       = EXCLUDED.updated_at;

  -- Remove inactive users from leaderboard
  DELETE FROM public.leaderboard_cache
  WHERE user_id NOT IN (
    SELECT id FROM public.profiles WHERE is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ==========================================================================
-- 9. create_notification()
-- Helper function to insert notifications.
-- Used by triggers and can be called from app code.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id    UUID,
  p_title      TEXT,
  p_message    TEXT DEFAULT NULL,
  p_type       public.notification_type DEFAULT 'info',
  p_source_type TEXT DEFAULT NULL,
  p_source_id  UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  _notification_id UUID;
BEGIN
  INSERT INTO public.notifications (id, user_id, title, message, type, source_type, source_id, created_at)
  VALUES (
    gen_random_uuid(),
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_source_type,
    p_source_id,
    NOW()
  )
  RETURNING id INTO _notification_id;

  RETURN _notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ==========================================================================
-- 10. notify_apex_assignment()
-- Trigger: AFTER INSERT ON apex_assignments
-- Notifies the assigned user about their new assignment.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.notify_apex_assignment()
RETURNS TRIGGER AS $$
DECLARE
  _event_name TEXT;
  _request_date DATE;
BEGIN
  -- Get the apex request details
  SELECT event_name, event_date
  INTO _event_name, _request_date
  FROM public.apex_requests
  WHERE id = NEW.request_id;

  -- Create notification for the assigned user
  PERFORM public.create_notification(
    p_user_id    := NEW.user_id,
    p_title      := 'New APEX Assignment',
    p_message    := format(
      'You have been assigned as %s for "%s" on %s. Please accept or reject.',
      NEW.role::TEXT,
      _event_name,
      _request_date::TEXT
    ),
    p_type       := 'assignment',
    p_source_type := 'apex_assignment',
    p_source_id  := NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_apex_assignment_created
  AFTER INSERT ON public.apex_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_apex_assignment();


-- ==========================================================================
-- 11. notify_post_status()
-- Trigger: AFTER UPDATE ON posts
-- Notifies the post author when their post status changes.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.notify_post_status()
RETURNS TRIGGER AS $$
DECLARE
  _title TEXT;
  _message TEXT;
  _type public.notification_type;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'approved' THEN
      _title := 'Post Approved! 🎉';
      _message := 'Your post has been approved and is now visible in the gallery.';
      _type := 'approval';
    WHEN 'rejected' THEN
      _title := 'Post Not Approved';
      _message := format(
        'Your post was not approved.%s',
        CASE WHEN NEW.rejection_reason IS NOT NULL
          THEN ' Reason: ' || NEW.rejection_reason
          ELSE ''
        END
      );
      _type := 'rejection';
    WHEN 'featured' THEN
      _title := 'Post Featured! ⭐';
      _message := 'Congratulations! Your post has been featured on the gallery.';
      _type := 'success';
    ELSE
      -- No notification for other status changes
      RETURN NEW;
  END CASE;

  PERFORM public.create_notification(
    p_user_id    := NEW.user_id,
    p_title      := _title,
    p_message    := _message,
    p_type       := _type,
    p_source_type := 'post',
    p_source_id  := NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_post_status_change_notify
  AFTER UPDATE OF status ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_status();
