-- Create Lead Audits Table
create table public.lead_audits (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  ssl_enabled boolean default false,
  mobile_friendly boolean default false,
  load_time_ms integer,
  broken_links_count integer default 0,
  lighthouse_performance integer,
  lighthouse_accessibility integer,
  lighthouse_best_practices integer,
  lighthouse_seo integer,
  score integer default 0,
  audit_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.lead_audits enable row level security;

-- Policies
create policy "Users can view own lead audits" on public.lead_audits
  for select using (auth.uid() = user_id);

create policy "Users can insert own lead audits" on public.lead_audits
  for insert with check (auth.uid() = user_id);

create policy "Users can update own lead audits" on public.lead_audits
  for update using (auth.uid() = user_id);

-- Updated At Trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_lead_audits_updated
  before update on public.lead_audits
  for each row execute procedure public.handle_updated_at();
