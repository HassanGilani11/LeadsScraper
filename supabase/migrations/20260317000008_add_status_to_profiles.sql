-- Migration: Add status column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS ban_reason text;

-- Update existing profiles (optional, as DEFAULT 'Active' handles it, but good for clarity)
UPDATE public.profiles SET status = 'Active' WHERE status IS NULL;
