-- ─────────────────────────────────────────────────────────────────────────────
-- FLOWBRIDGE — Database Schema
-- Run: supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────────────────────
create table profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text not null,
  name        text not null default '',
  avatar_url  text,
  plan        text not null default 'free' check (plan in ('free','pro','team')),
  created_at  timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── PROJECTS ─────────────────────────────────────────────────────────────────
create table projects (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid references profiles(id) on delete cascade not null,
  name        text not null,
  description text not null default '',
  color       text not null default '#18181A',
  settings    jsonb not null default '{
    "framework": "nextjs",
    "componentLibrary": "shadcn-ui",
    "cssFramework": "tailwind",
    "iconSet": "lucide",
    "aiModel": "claude-sonnet-4-6",
    "outputDir": "src/app"
  }',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table projects enable row level security;
create policy "Users can CRUD own projects"
  on projects for all using (auth.uid() = owner_id);

-- ── MACRO NODES ──────────────────────────────────────────────────────────────
create table macro_nodes (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid references projects(id) on delete cascade not null,
  type            text not null check (type in ('ds','journey')),
  name            text not null,
  description     text not null default '',
  tags            text[] not null default '{}',
  position_x      float not null default 0,
  position_y      float not null default 0,
  status          text check (status in ('draft','in-progress','ready','generated')),
  figma_file_key  text,
  figma_file_url  text,
  created_at      timestamptz not null default now()
);

alter table macro_nodes enable row level security;
create policy "Users can CRUD own nodes"
  on macro_nodes for all using (
    exists (select 1 from projects where projects.id = macro_nodes.project_id and projects.owner_id = auth.uid())
  );

-- ── CONNECTIONS ──────────────────────────────────────────────────────────────
create table connections (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references projects(id) on delete cascade not null,
  from_id     uuid references macro_nodes(id) on delete cascade not null,
  to_id       uuid references macro_nodes(id) on delete cascade not null,
  unique(from_id, to_id)
);

alter table connections enable row level security;
create policy "Users can CRUD own connections"
  on connections for all using (
    exists (select 1 from projects where projects.id = connections.project_id and projects.owner_id = auth.uid())
  );

-- ── FLOWS ────────────────────────────────────────────────────────────────────
create table flows (
  id          uuid primary key default uuid_generate_v4(),
  journey_id  uuid references macro_nodes(id) on delete cascade not null,
  project_id  uuid references projects(id) on delete cascade not null,
  name        text not null,
  "order"     int not null default 0,
  created_at  timestamptz not null default now()
);

alter table flows enable row level security;
create policy "Users can CRUD own flows"
  on flows for all using (
    exists (select 1 from projects where projects.id = flows.project_id and projects.owner_id = auth.uid())
  );

-- ── SCREENS ──────────────────────────────────────────────────────────────────
create table screens (
  id          uuid primary key default uuid_generate_v4(),
  flow_id     uuid references flows(id) on delete cascade not null,
  project_id  uuid references projects(id) on delete cascade not null,
  name        text not null,
  position_x  float not null default 0,
  position_y  float not null default 0,
  "order"     int not null default 0,
  status      text not null default 'empty' check (status in ('empty','partial','ready','generated')),
  context     jsonb not null default '{
    "purpose": "",
    "userIntent": "",
    "route": "",
    "requiresAuth": false,
    "apiEndpoints": [],
    "components": [],
    "notes": "",
    "genRules": ""
  }',
  figma       jsonb,   -- ScreenFigma type
  created_at  timestamptz not null default now()
);

alter table screens enable row level security;
create policy "Users can CRUD own screens"
  on screens for all using (
    exists (select 1 from projects where projects.id = screens.project_id and projects.owner_id = auth.uid())
  );

-- ── GENERATION RUNS ──────────────────────────────────────────────────────────
create table generation_runs (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid references projects(id) on delete cascade not null,
  journey_id    uuid references macro_nodes(id) on delete set null,
  flow_id       uuid references flows(id) on delete set null,
  screen_id     uuid references screens(id) on delete set null,
  status        text not null default 'pending' check (status in ('pending','running','done','error')),
  model         text not null,
  files         jsonb not null default '[]',
  prompt        text,
  tokens_used   int,
  error_message text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

alter table generation_runs enable row level security;
create policy "Users can read own generation runs"
  on generation_runs for all using (
    exists (select 1 from projects where projects.id = generation_runs.project_id and projects.owner_id = auth.uid())
  );

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger set_projects_updated_at
  before update on projects
  for each row execute procedure set_updated_at();

-- ── REALTIME ──────────────────────────────────────────────────────────────────
-- Enable realtime for collaborative features (Phase 5)
alter publication supabase_realtime add table macro_nodes;
alter publication supabase_realtime add table screens;
alter publication supabase_realtime add table connections;
