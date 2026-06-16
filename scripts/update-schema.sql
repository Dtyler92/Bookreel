-- ============================================================
-- BookReel Schema Update: Image Approval Step
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add items table for key objects/places in the book
CREATE TABLE IF NOT EXISTS public.items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  image_prompt text,
  author_approved boolean NOT NULL DEFAULT false,
  author_feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add image fields to characters table
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS image_prompt text;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS author_feedback text;

-- Add image approval step to trailers
ALTER TABLE public.trailers ADD COLUMN IF NOT EXISTS images_approved boolean NOT NULL DEFAULT false;

-- Add error_message column to trailers for pipeline failure diagnostics
ALTER TABLE public.trailers ADD COLUMN IF NOT EXISTS error_message text;

-- RLS for items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can CRUD own items" ON public.items FOR ALL USING (
  auth.uid() = (SELECT author_id FROM public.books WHERE id = book_id)
);

