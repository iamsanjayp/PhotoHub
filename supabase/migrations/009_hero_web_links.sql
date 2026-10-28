-- ============================================================================
-- PhotoHub Database Schema - Migration 009: Web Links Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.web_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  badge TEXT,
  accent TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_links_order ON public.web_links(sort_order);

GRANT ALL ON TABLE public.web_links TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
