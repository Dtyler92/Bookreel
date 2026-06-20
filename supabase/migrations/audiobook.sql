-- ── Audiobook feature migration ───────────────────────────────────────────────
-- Run this in the Supabase SQL editor.

-- 1. Add voice_key to characters so each character has an assigned ElevenLabs voice
ALTER TABLE characters ADD COLUMN IF NOT EXISTS voice_key text DEFAULT 'default';

-- 2. Audiobooks table — one per book, tracks the full-cast render job
CREATE TABLE IF NOT EXISTS audiobooks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id               uuid REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  author_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status                text NOT NULL DEFAULT 'pending',
    -- pending | processing | complete | failed
  narrator_voice        text NOT NULL DEFAULT 'Daniel',
  segments_json         jsonb,
    -- parsed dialogue segments: [{index, speaker, text, voice_key}]
  audio_url             text,
    -- final stitched MP3 in Supabase storage
  duration_seconds      integer,
  character_count       integer,
  word_count            integer,
  error_message         text,
  credit_consumed       boolean NOT NULL DEFAULT false,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS — authors can only see their own audiobooks
ALTER TABLE audiobooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own audiobooks"
  ON audiobooks FOR SELECT
  USING (author_id = auth.uid());

CREATE POLICY "Authors can insert own audiobooks"
  ON audiobooks FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Service role full access to audiobooks"
  ON audiobooks FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Index for fast lookups
CREATE INDEX IF NOT EXISTS audiobooks_book_id_idx ON audiobooks(book_id);
CREATE INDEX IF NOT EXISTS audiobooks_author_id_idx ON audiobooks(author_id);
CREATE INDEX IF NOT EXISTS audiobooks_status_idx ON audiobooks(status);
