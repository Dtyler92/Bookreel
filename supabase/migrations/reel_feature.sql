-- ── Reel feature migration ─────────────────────────────────────────────────────
-- Run in Supabase SQL editor

-- 1. Add in_reel flag to trailers (set to true when author first downloads)
ALTER TABLE trailers ADD COLUMN IF NOT EXISTS in_reel BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE trailers ADD COLUMN IF NOT EXISTS reel_added_at TIMESTAMPTZ;

-- 2. saved_books — readers can save books for later
CREATE TABLE IF NOT EXISTS saved_books (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id     UUID NOT NULL REFERENCES books(id)      ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id)
);

-- RLS on saved_books
ALTER TABLE saved_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own saved books"
  ON saved_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save books"
  ON saved_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave books"
  ON saved_books FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS saved_books_user_idx ON saved_books(user_id);
CREATE INDEX IF NOT EXISTS saved_books_book_idx ON saved_books(book_id);
CREATE INDEX IF NOT EXISTS trailers_reel_idx    ON trailers(in_reel, reel_added_at DESC);
