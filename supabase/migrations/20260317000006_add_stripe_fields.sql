-- Migration: Add Stripe customer and subscription tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Index for fast lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
ON public.profiles (stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;
