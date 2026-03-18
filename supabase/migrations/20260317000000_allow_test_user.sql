-- Drop the foreign key constraints on the leads table to allow mock testing
ALTER TABLE public.leads 
  DROP CONSTRAINT IF EXISTS leads_campaign_id_fkey,
  DROP CONSTRAINT IF EXISTS leads_user_id_fkey;

-- We still want them to match the structure, but we don't strictly enforce they exist in the parent tables.
-- Also, update the RLS policies to allow anyone to insert and view leads if they have the test user ID
-- This allows our frontend mock user to function as intended without full auth.
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;

CREATE POLICY "Users can view own leads" ON public.leads 
  FOR SELECT USING (
    auth.uid() = user_id OR 
    user_id = 'd168fb98-1e43-4c90-bcd0-a92c4d6da201'
  );

CREATE POLICY "Users can insert own leads" ON public.leads 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    user_id = 'd168fb98-1e43-4c90-bcd0-a92c4d6da201'
  );
