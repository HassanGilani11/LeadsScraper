-- Migration: Expand audit_logs RLS to allow all authenticated users to insert
-- Only admins can view logs, but all users can record their actions.

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;

CREATE POLICY "All authenticated users can insert audit logs" ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Keep the select policy restricted to Admins
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
        )
    );
