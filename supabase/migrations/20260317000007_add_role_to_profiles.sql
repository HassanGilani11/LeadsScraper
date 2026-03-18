-- Migration: Add role column to profiles and set initial admin
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'Member';

-- Set the platform owner as Admin
UPDATE public.profiles 
SET role = 'Admin' 
WHERE email = 'syedhassangilani0@gmail.com';

-- Ensure new signups are still handled but defaults to Member (already handled by DEFAULT 'Member')
-- The trigger handle_new_user already exists and will work fine with the new column default.
