-- audiobookMigration.sql
-- Run these in the Supabase SQL editor to add missing columns to the audiobooks table.

-- Existing columns (safe to re-run with IF NOT EXISTS)
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS chapters_json JSONB;
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS chapter_count INTEGER;

-- New columns for VPS parse pipeline
-- speakers_json: JSON array of character speaker names detected by the parse worker
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS speakers_json JSONB;

-- chapter_markers_json: JSON array of { chapterIndex, title, startSegmentIndex }
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS chapter_markers_json JSONB;

-- voice_map_json: JSON object mapping speaker name → ElevenLabs voice name
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS voice_map_json JSONB;

-- character_count: total number of characters (bytes) in the extracted manuscript
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS character_count INTEGER;

-- parse_started_at: set by the queue GET when a 'parsing' job is claimed, used for
--                   stuck-job detection (recover jobs stuck >5 min)
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS parse_started_at TIMESTAMPTZ;

-- parse_completed_at: set when the parse worker finishes successfully (status='parsed')
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS parse_completed_at TIMESTAMPTZ;
