-- Migration to add description to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN description text;

-- (Optional) Update existing campaigns if any
UPDATE public.campaigns SET description = '' WHERE description IS NULL;
