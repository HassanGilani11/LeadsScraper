-- Create a SECURITY DEFINER function so we can count leads per campaign
-- without being blocked by RLS. Only the campaign owner or admin can call this.
CREATE OR REPLACE FUNCTION public.get_campaign_lead_counts(p_user_id uuid)
RETURNS TABLE(campaign_id uuid, lead_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.campaign_id, COUNT(l.id) as lead_count
  FROM leads l
  INNER JOIN campaigns c ON c.id = l.campaign_id
  WHERE c.user_id = p_user_id
    AND l.campaign_id IS NOT NULL
  GROUP BY l.campaign_id;
$$;
