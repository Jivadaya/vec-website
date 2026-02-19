-- Create a table for public profiles (linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text default 'pending', -- 'pending', 'admin', 'super_admin'
  assigned_district text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;

-- Policies
-- 1. Public can insert their own profile (during signup)
create policy "Public can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

-- 2. Users can view their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

-- 3. Super Admins can view/edit all profiles
-- (We'll assume the first user manually updates themselves to super_admin in the DB, 
-- or we use a clever specific email check for bootstrapping)
create policy "Super Admins can manage all" on profiles
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- JOIN: Bootstrap First Super Admin
-- Run this command in the SQL Editor after signing up to make yourself a Super Admin:
-- update profiles set role = 'super_admin' where email = 'YOUR_EMAIL@example.com';
