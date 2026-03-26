-- Migration to add enrichment columns to leads table for dynamic quality tracking
ALTER TABLE public.leads 
ADD COLUMN job_title text,
ADD COLUMN linkedin_url text,
ADD COLUMN phone text,
ADD COLUMN company_website text,
ADD COLUMN company_size text,
ADD COLUMN location text;

-- Indexing for potentially large lead sets
CREATE INDEX IF NOT EXISTS leads_job_title_idx ON public.leads (job_title);
CREATE INDEX IF NOT EXISTS leads_linkedin_url_idx ON public.leads (linkedin_url);
CREATE INDEX IF NOT EXISTS leads_location_idx ON public.leads (location);
