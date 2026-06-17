-- Migration: Author screenplay editing + moderation feedback
-- Adds columns to scenes for editing and Runway moderation rejections

ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS moderation_status text;
-- moderation_status: null = not attempted, 'ok' = passed, 'rejected' = blocked by Runway

ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS moderation_reason text;
-- Human-readable reason Runway rejected the scene (e.g. "Content did not pass content moderation")

ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS suggested_edit text;
-- AI-suggested policy-safe rewrite of the scene description

ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS author_edited boolean DEFAULT false;
-- True once the author has manually edited this scene

ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS last_moderation_at timestamptz;
-- When the last moderation rejection happened
