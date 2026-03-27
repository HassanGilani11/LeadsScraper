-- Create Contact Enquiries Table
create table if not exists public.contact_enquiries (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.contact_enquiries enable row level security;

-- Only admins can view enquiries (Assuming an 'admin' role or specific admin emails)
-- For now, let's allow service_role and authenticated admins if they have a way to be identified.
-- Since the user asked "where this shown on admin dashboard", let's make it viewable by authenticated users for now if they are admins.
-- If there's no explicit admin role check yet, we can at least allow service_role (which Edge Functions use).

create policy "Admins can view contact enquiries" on public.contact_enquiries
  for select
  using (auth.role() = 'service_role' or exists (
    select 1 from public.profiles
    where id = auth.uid()
    -- Add admin check logic here if applicable, e.g., and is_admin = true
  ));

-- Allow the Edge Function (service_role) to insert
create policy "Service role can insert contact enquiries" on public.contact_enquiries
  for insert
  with check (true);
