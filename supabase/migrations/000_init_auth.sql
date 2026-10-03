-- ============================================================================
-- PhotoHub Database Schema - Migration 000: Initialize Auth Schema
-- ============================================================================
-- Ensures auth schema and auth.users table exist prior to initial schema tables
-- that establish foreign key constraints to auth.users.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'authenticator_password';
  END IF;
END $$;

GRANT anon, authenticated, service_role TO authenticator;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role;

CREATE TABLE IF NOT EXISTS auth.users (
  instance_id uuid null,
  id uuid not null primary key,
  aud varchar(255) null,
  role varchar(255) null,
  email varchar(255) null,
  encrypted_password varchar(255) null,
  email_confirmed_at timestamp with time zone null,
  invited_at timestamp with time zone null,
  confirmation_token varchar(255) null,
  confirmation_sent_at timestamp with time zone null,
  recovery_token varchar(255) null,
  recovery_sent_at timestamp with time zone null,
  email_change_token_new varchar(255) null,
  email_change varchar(255) null,
  email_change_sent_at timestamp with time zone null,
  last_sign_in_at timestamp with time zone null,
  raw_app_meta_data jsonb null,
  raw_user_meta_data jsonb null,
  is_super_admin boolean null,
  created_at timestamp with time zone null,
  updated_at timestamp with time zone null,
  phone text null default null::character varying,
  phone_confirmed_at timestamp with time zone null,
  phone_change text null default ''::character varying,
  phone_change_token varchar(255) null default ''::character varying,
  phone_change_sent_at timestamp with time zone null,
  email_change_token_current varchar(255) null default ''::character varying,
  email_change_confirm_status smallint null default 0,
  banned_until timestamp with time zone null,
  reauthentication_token varchar(255) null default ''::character varying,
  reauthentication_sent_at timestamp with time zone null,
  is_sso_user boolean not null default false,
  deleted_at timestamp with time zone null
);

-- Basic auth functions referenced by default supabase roles/policies
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text;
$$;

-- Ensure default database and superuser connection search_path always includes public schema first
ALTER DATABASE postgres SET search_path TO public, auth, extensions;
ALTER ROLE postgres SET search_path TO public, auth, extensions;

-- Create equality operators between uuid and text for Postgres 15 compatibility during GoTrue migrations
CREATE OR REPLACE FUNCTION public.uuid_eq_text(uuid, text)
RETURNS boolean AS $$
  SELECT $1::text = $2;
$$ LANGUAGE sql IMMUTABLE;

CREATE OPERATOR public.= (
  LEFTARG = uuid,
  RIGHTARG = text,
  PROCEDURE = public.uuid_eq_text,
  COMMUTATOR = =
);

CREATE OR REPLACE FUNCTION public.text_eq_uuid(text, uuid)
RETURNS boolean AS $$
  SELECT $1 = $2::text;
$$ LANGUAGE sql IMMUTABLE;

CREATE OPERATOR public.= (
  LEFTARG = text,
  RIGHTARG = uuid,
  PROCEDURE = public.text_eq_uuid,
  COMMUTATOR = =
);
