-- Migration: Trailer credits system
-- Adds credit tracking to profiles + a credit ledger for auditing

-- Current available credits (monthly allotment + purchased add-ons)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trailer_credits integer NOT NULL DEFAULT 1;

-- When the monthly allotment was last refreshed (used to auto-grant new month's credits)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_reset_at timestamptz NOT NULL DEFAULT (now() + interval '1 month');

-- Lifetime counter of purchased add-on credits (analytics)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS purchased_credits_total integer NOT NULL DEFAULT 0;

-- Mark trailers that have actually consumed a credit (so we don't double-charge on retry)
ALTER TABLE public.trailers ADD COLUMN IF NOT EXISTS credit_consumed boolean NOT NULL DEFAULT false;

-- Backfill existing users a sensible starting balance based on tier
UPDATE public.profiles SET trailer_credits = CASE
  WHEN subscription_tier = 'pro' THEN 2
  WHEN subscription_tier = 'basic' THEN 1
  ELSE 1
END
WHERE trailer_credits IS NULL OR trailer_credits = 1;

-- Credit ledger: every grant / consume / purchase event
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta integer NOT NULL,                 -- +1 grant/purchase, -1 consume
  reason text NOT NULL,                   -- 'monthly_grant' | 'trailer_generated' | 'purchase' | 'signup'
  book_id uuid,                           -- optional link to the book/trailer involved
  balance_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ledger" ON public.credit_ledger;
CREATE POLICY "Users can view own ledger" ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON public.credit_ledger(user_id);
