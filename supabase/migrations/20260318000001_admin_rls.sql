-- Create a secure function to check if the current user is an Admin
-- SECURITY DEFINER allows it to read the profiles table without triggering RLS recursively
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'Admin'
  );
$$;

-- Allow Admins to SELECT all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() = id OR public.is_admin());

-- Allow Admins to UPDATE all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id OR public.is_admin());

-- Allow Admins to DELETE all profiles
CREATE POLICY "Admins can delete all profiles"
ON public.profiles
FOR DELETE
USING (auth.uid() = id OR public.is_admin());

-- Allow Admins to SELECT all campaigns
CREATE POLICY "Admins can view all campaigns"
ON public.campaigns
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Allow Admins to SELECT all leads
CREATE POLICY "Admins can view all leads"
ON public.leads
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());
