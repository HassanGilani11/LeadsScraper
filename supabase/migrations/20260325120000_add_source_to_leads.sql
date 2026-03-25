-- Add source column to leads table
alter table public.leads add column if not exists source text default 'scraper';

-- Update existing leads to have 'scraper' source if they have a source_url
update public.leads set source = 'scraper' where source_url is not null;

-- Update existing leads to have 'csv' source if they don't have a source_url (assumption for existing data)
update public.leads set source = 'csv' where source_url is null;
