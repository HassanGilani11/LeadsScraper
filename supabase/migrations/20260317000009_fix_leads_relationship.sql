-- Migration: Fix profiles-leads relationship for PostgREST
-- Ensure the foreign key is explicitly named and correctly mapped

ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_user_id_fkey;

ALTER TABLE public.leads 
ADD CONSTRAINT leads_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
