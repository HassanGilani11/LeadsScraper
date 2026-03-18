-- Migration to make campaign_id nullable in the leads table
ALTER TABLE public.leads ALTER COLUMN campaign_id DROP NOT NULL;
