-- Create site_settings table
CREATE TABLE site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_title TEXT NOT NULL DEFAULT 'SyntexDev',
    meta_description TEXT NOT NULL DEFAULT 'AI Powered B2B Lead Generation',
    favicon_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one row exists (singleton pattern)
CREATE UNIQUE INDEX site_settings_single_row_idx ON site_settings((TRUE));

-- Enable Row Level Security
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow reading site settings for all users (including unauthenticated, for the login page)
CREATE POLICY "Site settings are viewable by everyone"
    ON site_settings FOR SELECT
    USING (true);

-- Allow updates only for admins
CREATE POLICY "Site settings are updatable by admins"
    ON site_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'Admin'
        )
    );

-- Allow insert only for admins (in case it needs to be recreated)
CREATE POLICY "Site settings are insertable by admins"
    ON site_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'Admin'
        )
    );

-- Insert default row
INSERT INTO site_settings (site_title, meta_description)
VALUES ('SyntexDev', 'AI Powered B2B Lead Generation')
ON CONFLICT DO NOTHING;

-- ── STORAGE POLICIES FOR 'Settings' BUCKET ──

-- Allow public read access to the bucket
CREATE POLICY "Public Access for Settings Bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'Settings');

-- Allow Admins to upload new files
CREATE POLICY "Admins can upload to Settings Bucket"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'Settings' AND 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- Allow Admins to update/override files
CREATE POLICY "Admins can update Settings Bucket"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'Settings' AND 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );
