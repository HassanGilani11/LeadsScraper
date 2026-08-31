-- Migration: Create Campaign Sequences and Steps
-- This enables multi-step automated email outreach.

-- 1. Campaign Steps Table
CREATE TABLE public.campaign_steps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    step_number integer NOT NULL,
    subject text NOT NULL,
    body_html text NOT NULL,
    delay_days integer DEFAULT 0 NOT NULL, -- Days to wait after previous step
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure steps are unique per campaign
    UNIQUE(campaign_id, step_number)
);

-- 2. Lead Sequences Table (Progress Tracker)
CREATE TABLE public.lead_sequences (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    current_step_number integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active' NOT NULL, -- active, paused, completed, replied
    last_sent_at timestamp with time zone,
    next_send_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure a lead is only in a campaign sequence once
    UNIQUE(lead_id, campaign_id)
);

-- 3. RLS Policies
ALTER TABLE public.campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sequences ENABLE ROW LEVEL SECURITY;

-- Campaign Steps Policies
CREATE POLICY "Users can view own campaign steps" ON public.campaign_steps
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign steps" ON public.campaign_steps
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaign steps" ON public.campaign_steps
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaign steps" ON public.campaign_steps
    FOR DELETE USING (auth.uid() = user_id);

-- Lead Sequences Policies
CREATE POLICY "Users can view own lead sequences" ON public.lead_sequences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lead sequences" ON public.lead_sequences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead sequences" ON public.lead_sequences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lead sequences" ON public.lead_sequences
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Indexes for Performance
CREATE INDEX idx_lead_sequences_active ON public.lead_sequences (status) WHERE status = 'active';
CREATE INDEX idx_lead_sequences_next_send ON public.lead_sequences (next_send_at);
CREATE INDEX idx_campaign_steps_campaign ON public.campaign_steps (campaign_id);
