-- Add company and avatar_url to profiles table
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists avatar_url text;

-- Create storage bucket for profiles if it doesn't exist
-- Note: Bucket creation via SQL requires extensions, but usually handled via CLI or UI.
-- However, we can ensure the policies are set if the bucket exists.

-- Storage policies for 'Profile' bucket
-- Allow public read access to avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'Profile' );

-- Allow users to upload their own avatar
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'Profile' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update/delete their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'Profile' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'Profile' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
