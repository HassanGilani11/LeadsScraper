-- Profile Table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  user_id uuid references auth.users on delete cascade not null,
  email text not null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Campaigns Table
create table public.campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  status text not null default 'draft', -- draft, running, completed, failed
  target_keywords text[] not null default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.campaigns enable row level security;
create policy "Users can view own campaigns" on public.campaigns for select using (auth.uid() = user_id);
create policy "Users can insert own campaigns" on public.campaigns for insert with check (auth.uid() = user_id);
create policy "Users can update own campaigns" on public.campaigns for update using (auth.uid() = user_id);
create policy "Users can delete own campaigns" on public.campaigns for delete using (auth.uid() = user_id);

-- Leads Table
create table public.leads (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  email text,
  first_name text,
  last_name text,
  company text,
  source_url text,
  status text not null default 'new', -- new, contacted, interested, closed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.leads enable row level security;
create policy "Users can view own leads" on public.leads for select using (auth.uid() = user_id);
create policy "Users can insert own leads" on public.leads for insert with check (auth.uid() = user_id);
create policy "Users can update own leads" on public.leads for update using (auth.uid() = user_id);
create policy "Users can delete own leads" on public.leads for delete using (auth.uid() = user_id);

-- Create a function to handle new user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_id, email, full_name)
  values (new.id, new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
