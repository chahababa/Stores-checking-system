create extension if not exists pgcrypto;

create type public.user_role as enum ('owner', 'manager', 'leader');
create type public.staff_status as enum ('active', 'archived');
create type public.staff_position as enum ('kitchen', 'floor', 'counter');
create type public.field_type as enum ('kitchen', 'floor', 'none');
create type public.focus_type as enum ('permanent', 'monthly');

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role public.user_role not null,
  store_id uuid references public.stores(id) on delete set null,
  line_user_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  position public.staff_position not null,
  status public.staff_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null,
  field_type public.field_type not null default 'none'
);

create table if not exists public.inspection_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  sort_order integer not null,
  is_base boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (category_id, name)
);

create table if not exists public.store_extra_items (
  store_id uuid not null references public.stores(id) on delete cascade,
  item_id uuid not null references public.inspection_items(id) on delete cascade,
  primary key (store_id, item_id)
);

create table if not exists public.focus_items (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inspection_items(id) on delete cascade,
  type public.focus_type not null,
  month text,
  set_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint focus_month_required check (
    (type = 'permanent' and month is null) or
    (type = 'monthly' and month ~ '^\d{4}-\d{2}$')
  )
);

create unique index if not exists focus_items_permanent_unique
  on public.focus_items (item_id, type)
  where type = 'permanent';

create unique index if not exists focus_items_monthly_unique
  on public.focus_items (item_id, type, month)
  where type = 'monthly';

create or replace function public.current_user_profile()
returns table (
  id uuid,
  email text,
  role public.user_role,
  store_id uuid,
  is_active boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select u.id, u.email, u.role, u.store_id, u.is_active
  from public.users u
  join auth.users au on lower(au.email) = lower(u.email)
  where au.id = auth.uid()
  limit 1
$$;

grant execute on function public.current_user_profile() to authenticated;

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.current_user_profile()
$$;

grant execute on function public.current_user_role() to authenticated;

create or replace function public.current_user_store_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select store_id from public.current_user_profile()
$$;

grant execute on function public.current_user_store_id() to authenticated;

alter table public.stores enable row level security;
alter table public.users enable row level security;
alter table public.staff_members enable row level security;
alter table public.categories enable row level security;
alter table public.inspection_items enable row level security;
alter table public.store_extra_items enable row level security;
alter table public.focus_items enable row level security;

create policy "stores_select_owner_manager_all"
on public.stores for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "stores_select_leader_own"
on public.stores for select to authenticated
using (id = public.current_user_store_id());

create policy "stores_owner_write"
on public.stores for all to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

create policy "users_select_owner_all"
on public.users for select to authenticated
using (public.current_user_role() = 'owner');

create policy "users_select_self"
on public.users for select to authenticated
using (lower(email) = lower((select email from auth.users where id = auth.uid())));

create policy "users_owner_write"
on public.users for all to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

create policy "staff_select_owner_manager_all"
on public.staff_members for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "staff_select_leader_own"
on public.staff_members for select to authenticated
using (store_id = public.current_user_store_id());

create policy "staff_owner_manager_insert"
on public.staff_members for insert to authenticated
with check (public.current_user_role() in ('owner', 'manager'));

create policy "staff_owner_manager_update"
on public.staff_members for update to authenticated
using (public.current_user_role() in ('owner', 'manager'))
with check (public.current_user_role() in ('owner', 'manager'));

create policy "categories_read_all"
on public.categories for select to authenticated
using (true);

create policy "categories_owner_write"
on public.categories for all to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

create policy "inspection_items_read_all"
on public.inspection_items for select to authenticated
using (true);

create policy "inspection_items_owner_write"
on public.inspection_items for all to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

create policy "store_extra_items_read_owner_manager"
on public.store_extra_items for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "store_extra_items_read_leader_own"
on public.store_extra_items for select to authenticated
using (store_id = public.current_user_store_id());

create policy "store_extra_items_owner_write"
on public.store_extra_items for all to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

create policy "focus_items_read_owner_manager"
on public.focus_items for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "focus_items_read_leader"
on public.focus_items for select to authenticated
using (public.current_user_role() = 'leader');

create policy "focus_items_owner_manager_insert"
on public.focus_items for insert to authenticated
with check (
  public.current_user_role() = 'owner'
  or (public.current_user_role() = 'manager' and type = 'monthly')
);

create policy "focus_items_owner_manager_update"
on public.focus_items for update to authenticated
using (
  public.current_user_role() = 'owner'
  or (public.current_user_role() = 'manager' and type = 'monthly')
)
with check (
  public.current_user_role() = 'owner'
  or (public.current_user_role() = 'manager' and type = 'monthly')
);

create policy "focus_items_owner_manager_delete"
on public.focus_items for delete to authenticated
using (
  public.current_user_role() = 'owner'
  or (public.current_user_role() = 'manager' and type = 'monthly')
);
