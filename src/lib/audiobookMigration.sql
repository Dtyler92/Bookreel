-- audiobookMigration.sql
-- Run these in the Supabase SQL editor to add missing columns to the audiobooks table.

ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS chapters_json JSONB;
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS chapter_count INTEGER;
