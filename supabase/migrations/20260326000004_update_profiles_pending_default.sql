-- Migration: Update status column default for Admin Approval flow
ALTER TABLE public.profiles 
ALTER COLUMN status SET DEFAULT 'Pending Approval';

-- Also ensure any existing users without a status are set appropriately (optional)
-- UPDATE public.profiles SET status = 'Pending Approval' WHERE status IS NULL;
