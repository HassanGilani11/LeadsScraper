-- Migration to add icp_score and industry to leads table
ALTER TABLE public.leads 
ADD COLUMN icp_score numeric DEFAULT 0,
ADD COLUMN industry text;

-- Update existing leads with some defaults if necessary (optional)
UPDATE public.leads SET icp_score = 5, industry = 'Unknown' WHERE icp_score IS NULL OR industry IS NULL;
