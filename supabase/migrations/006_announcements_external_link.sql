-- Migration 006: Add external_link column to announcements table
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS external_link TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
