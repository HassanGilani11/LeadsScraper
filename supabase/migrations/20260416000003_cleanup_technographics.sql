-- Migration: Cleanup redundant technographic columns
-- We'll use the existing 'technographics' column instead.

ALTER TABLE public.leads 
DROP COLUMN IF EXISTS technologies,
DROP COLUMN IF EXISTS tech_summary;
