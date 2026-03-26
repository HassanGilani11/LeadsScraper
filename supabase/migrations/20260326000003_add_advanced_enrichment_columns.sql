-- Migration to add advanced enrichment columns to leads table
ALTER TABLE public.leads 
ADD COLUMN logo_url text,
ADD COLUMN business_description text,
ADD COLUMN founded_year text,
ADD COLUMN technographics text[],
ADD COLUMN meta_title text,
ADD COLUMN meta_description text,
ADD COLUMN primary_keywords text[],
ADD COLUMN website_language text,
ADD COLUMN career_page_url text,
ADD COLUMN open_positions_count integer DEFAULT 0;

-- Indexing for advanced search/filtering
CREATE INDEX IF NOT EXISTS leads_meta_title_idx ON public.leads (meta_title);
CREATE INDEX IF NOT EXISTS leads_founded_year_idx ON public.leads (founded_year);
