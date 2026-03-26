-- Migration: Create Subscription Events Table
CREATE TABLE public.subscription_events (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    event_type text not null check (event_type in ('new', 'upgrade', 'downgrade', 'cancel')),
    plan_tier text not null,
    amount numeric(10,2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin users can view all subscription events"
    ON public.subscription_events FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
        )
    );

CREATE POLICY "Service role can manage subscription events"
    ON public.subscription_events FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX idx_subscription_events_created_at ON public.subscription_events(created_at);

-- Mock Data Insertion
DO $$
DECLARE
    admin_user_id uuid;
    normal_user_id uuid;
    i integer;
    event_date timestamp;
    months_ago integer;
    random_event_type text;
    random_plan_tier text;
    random_amount numeric;
BEGIN
    -- Get at least one user to attach events to
    SELECT id INTO admin_user_id FROM public.profiles WHERE role = 'Admin' LIMIT 1;
    SELECT id INTO normal_user_id FROM public.profiles WHERE role != 'Admin' LIMIT 1;

    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM public.profiles LIMIT 1;
    END IF;

    -- If no users exist yet, we skip mock data insertion
    IF admin_user_id IS NOT NULL THEN
        -- Insert 20 random events spread over the last 12 months
        FOR i IN 1..40 LOOP
            months_ago := floor(random() * 12);
            event_date := now() - (months_ago || ' months')::interval - (floor(random() * 28) || ' days')::interval;
            
            -- Randomize event type
            random_event_type := CASE floor(random() * 4)
                WHEN 0 THEN 'new'
                WHEN 1 THEN 'upgrade'
                WHEN 2 THEN 'downgrade'
                ELSE 'cancel'
            END;

            -- Randomize plan tier
            random_plan_tier := CASE floor(random() * 3)
                WHEN 0 THEN 'Starter'
                WHEN 1 THEN 'Pro'
                ELSE 'Agency'
            END;

            -- Calculate amount based on event and tier
            IF random_event_type = 'cancel' THEN
                -- Churn is negative MRR
                random_amount := CASE random_plan_tier
                    WHEN 'Starter' THEN -29
                    WHEN 'Pro' THEN -99
                    ELSE -299
                END;
            ELSIF random_event_type = 'downgrade' THEN
                random_amount := -50; -- Arbitrary downgrade amount
            ELSE
                -- New or upgrade is positive MRR
                random_amount := CASE random_plan_tier
                    WHEN 'Starter' THEN 29
                    WHEN 'Pro' THEN 99
                    ELSE 299
                END;
            END IF;

            INSERT INTO public.subscription_events (user_id, event_type, plan_tier, amount, created_at)
            VALUES (
                CASE WHEN random() > 0.5 THEN admin_user_id ELSE coalesce(normal_user_id, admin_user_id) END,
                random_event_type,
                random_plan_tier,
                random_amount,
                event_date
            );
        END LOOP;
    END IF;
END $$;
