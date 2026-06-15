-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'author' check (role in ('author', 'reader', 'admin')),
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'basic', 'pro')),
  subscription_status text check (subscription_status in ('active', 'canceled', 'past_due')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Books table
create table public.books (
  id uuid default uuid_generate_v4() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  genre text,
  amazon_link text,
  store_link text,
  pdf_url text,
  cover_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Characters table
create table public.characters (
  id uuid default uuid_generate_v4() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  name text not null,
  role text,
  description text,
  appearance_notes text,
  image_url text,
  author_approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Scenes table
create table public.scenes (
  id uuid default uuid_generate_v4() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  scene_number integer not null,
  title text,
  description text not null,
  screenplay_text text,
  video_clip_url text,
  duration_seconds integer,
  author_approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Trailers table
create table public.trailers (
  id uuid default uuid_generate_v4() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'review', 'generating', 'complete', 'failed')),
  quality_tier text not null default 'basic' check (quality_tier in ('basic', 'pro')),
  final_video_url text,
  thumbnail_url text,
  duration_seconds integer,
  view_count integer not null default 0,
  click_count integer not null default 0,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.characters enable row level security;
alter table public.scenes enable row level security;
alter table public.trailers enable row level security;

-- Profiles policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Books policies
create policy "Authors can CRUD own books" on public.books for all using (auth.uid() = author_id);
create policy "Anyone can view published books" on public.books for select using (is_published = true);

-- Characters policies
create policy "Authors can CRUD own characters" on public.characters for all using (
  auth.uid() = (select author_id from public.books where id = book_id)
);

-- Scenes policies
create policy "Authors can CRUD own scenes" on public.scenes for all using (
  auth.uid() = (select author_id from public.books where id = book_id)
);

-- Trailers policies
create policy "Authors can view own trailers" on public.trailers for select using (
  auth.uid() = (select author_id from public.books where id = book_id)
);
create policy "Anyone can view complete trailers" on public.trailers for select using (status = 'complete');

-- Updated at triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.books for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.trailers for each row execute procedure public.handle_updated_at();
