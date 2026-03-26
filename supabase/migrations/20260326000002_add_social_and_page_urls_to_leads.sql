-- Migration to add social media and specific page URLs to leads table
ALTER TABLE public.leads 
ADD COLUMN facebook_url text,
ADD COLUMN twitter_url text,
ADD COLUMN instagram_url text,
ADD COLUMN youtube_url text,
ADD COLUMN pinterest_url text,
ADD COLUMN snapchat text,
ADD COLUMN whatsapp text,
ADD COLUMN tiktok text,
ADD COLUMN telegram text,
ADD COLUMN skype text,
ADD COLUMN contact_page_url text,
ADD COLUMN about_page_url text;

-- Indexing social URLs for potential lookups
CREATE INDEX IF NOT EXISTS leads_facebook_url_idx ON public.leads (facebook_url);
CREATE INDEX IF NOT EXISTS leads_twitter_url_idx ON public.leads (twitter_url);
CREATE INDEX IF NOT EXISTS leads_instagram_url_idx ON public.leads (instagram_url);
