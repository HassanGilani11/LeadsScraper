-- Create email_logs table to track bulk email sends
CREATE TABLE IF NOT EXISTS public.email_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id       UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    subject       TEXT NOT NULL,
    body          TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS email_logs_user_id_idx ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS email_logs_lead_id_idx ON public.email_logs(lead_id);
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON public.email_logs(sent_at DESC);

-- Row Level Security
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own email logs"
    ON public.email_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert email logs"
    ON public.email_logs
    FOR INSERT
    WITH CHECK (true);
