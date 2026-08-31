-- Migration: Add technographic columns to leads
-- This allows storing detected technologies (Shopify, WP, GA, etc.)

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS technologies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tech_summary TEXT;

-- Create an index for searching by technology summary
CREATE INDEX IF NOT EXISTS idx_leads_tech_summary ON public.leads USING gin (technologies);
