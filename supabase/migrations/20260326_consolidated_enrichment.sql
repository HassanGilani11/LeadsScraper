-- CONSOLIDATED MIGRATION: ADVANCED LEAD ENRICHMENT
-- Run this in your Supabase SQL Editor to add all social, SEO, and technographic columns

ALTER TABLE public.leads 
-- Basic Enrichment
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS company_website text,
ADD COLUMN IF NOT EXISTS company_size text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS icp_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'scraper',

-- Social & Internal Pages
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS twitter_url text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS pinterest_url text,
ADD COLUMN IF NOT EXISTS snapchat text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS tiktok text,
ADD COLUMN IF NOT EXISTS telegram text,
ADD COLUMN IF NOT EXISTS skype text,
ADD COLUMN IF NOT EXISTS contact_page_url text,
ADD COLUMN IF NOT EXISTS about_page_url text,

-- Advanced Business Insights & SEO
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS business_description text,
ADD COLUMN IF NOT EXISTS founded_year text,
ADD COLUMN IF NOT EXISTS technographics text[],
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS primary_keywords text[],
ADD COLUMN IF NOT EXISTS website_language text,
ADD COLUMN IF NOT EXISTS career_page_url text,
ADD COLUMN IF NOT EXISTS open_positions_count integer DEFAULT 0;

-- Indices for fast searching
CREATE INDEX IF NOT EXISTS leads_job_title_idx ON public.leads (job_title);
CREATE INDEX IF NOT EXISTS leads_linkedin_url_idx ON public.leads (linkedin_url);
CREATE INDEX IF NOT EXISTS leads_location_idx ON public.leads (location);
CREATE INDEX IF NOT EXISTS leads_facebook_url_idx ON public.leads (facebook_url);
CREATE INDEX IF NOT EXISTS leads_meta_title_idx ON public.leads (meta_title);
