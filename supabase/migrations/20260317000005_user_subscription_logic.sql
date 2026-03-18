-- Migration to add subscription and credit tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'Starter',
ADD COLUMN IF NOT EXISTS credits integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS max_credits integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS last_reset_date timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Update existing profiles to have the default 20 credits if they are on Starter plan
UPDATE public.profiles 
SET credits = 20, max_credits = 20 
WHERE plan = 'Starter' AND (credits IS NULL OR max_credits IS NULL);
