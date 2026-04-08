create type public.busyness_level as enum ('low', 'medium', 'high');
create type public.menu_item_type as enum ('dine_in', 'takeout');
create type public.improvement_status as enum ('pending', 'resolved', 'verified', 'superseded');

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  inspector_id uuid not null references public.users(id) on delete restrict,
  date date not null,
  time_slot text not null,
  busyness_level public.busyness_level not null default 'medium',
  total_score numeric(5, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  is_editable boolean not null default true
);

create index if not exists inspections_store_date_idx on public.inspections (store_id, date desc);

create table if not exists public.inspection_staff (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  staff_id uuid not null references public.staff_members(id) on delete restrict,
  role_in_shift public.staff_position not null,
  unique (inspection_id, staff_id)
);

create table if not exists public.inspection_scores (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  item_id uuid not null references public.inspection_items(id) on delete restrict,
  score integer not null check (score in (1, 2, 3)),
  note text,
  is_focus_item boolean not null default false,
  has_prev_issue boolean not null default false,
  consecutive_weeks integer not null default 0,
  unique (inspection_id, item_id)
);

create table if not exists public.inspection_menu_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  type public.menu_item_type not null,
  dish_name text,
  portion_weight numeric(8, 2)
);

create table if not exists public.legacy_notes (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  content text not null,
  score integer,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.improvement_tasks (
  id uuid primary key default gen_random_uuid(),
  score_id uuid not null references public.inspection_scores(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  item_id uuid not null references public.inspection_items(id) on delete restrict,
  status public.improvement_status not null default 'pending',
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists improvement_tasks_store_status_idx on public.improvement_tasks (store_id, status);

alter table public.inspections enable row level security;
alter table public.inspection_staff enable row level security;
alter table public.inspection_scores enable row level security;
alter table public.inspection_menu_items enable row level security;
alter table public.legacy_notes enable row level security;
alter table public.improvement_tasks enable row level security;

create policy "inspections_select_owner_manager_all"
on public.inspections for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "inspections_select_leader_own"
on public.inspections for select to authenticated
using (store_id = public.current_user_store_id());

create policy "inspections_insert_owner_manager"
on public.inspections for insert to authenticated
with check (public.current_user_role() in ('owner', 'manager'));

create policy "inspections_update_owner_manager"
on public.inspections for update to authenticated
using (public.current_user_role() in ('owner', 'manager'))
with check (public.current_user_role() in ('owner', 'manager'));

create policy "inspection_staff_select_owner_manager_all"
on public.inspection_staff for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "inspection_staff_select_leader_own"
on public.inspection_staff for select to authenticated
using (
  exists (
    select 1
    from public.inspections i
    where i.id = inspection_id and i.store_id = public.current_user_store_id()
  )
);

create policy "inspection_staff_insert_owner_manager"
on public.inspection_staff for insert to authenticated
with check (public.current_user_role() in ('owner', 'manager'));

create policy "inspection_scores_select_owner_manager_all"
on public.inspection_scores for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "inspection_scores_select_leader_own"
on public.inspection_scores for select to authenticated
using (
  exists (
    select 1
    from public.inspections i
    where i.id = inspection_id and i.store_id = public.current_user_store_id()
  )
);

create policy "inspection_scores_insert_owner_manager"
on public.inspection_scores for insert to authenticated
with check (public.current_user_role() in ('owner', 'manager'));

create policy "inspection_menu_items_select_owner_manager_all"
on public.inspection_menu_items for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "inspection_menu_items_select_leader_own"
on public.inspection_menu_items for select to authenticated
using (
  exists (
    select 1
    from public.inspections i
    where i.id = inspection_id and i.store_id = public.current_user_store_id()
  )
);

create policy "inspection_menu_items_insert_owner_manager"
on public.inspection_menu_items for insert to authenticated
with check (public.current_user_role() in ('owner', 'manager'));

create policy "legacy_notes_select_owner_manager_all"
on public.legacy_notes for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "legacy_notes_select_leader_own"
on public.legacy_notes for select to authenticated
using (
  exists (
    select 1
    from public.inspections i
    where i.id = inspection_id and i.store_id = public.current_user_store_id()
  )
);

create policy "legacy_notes_insert_owner_manager"
on public.legacy_notes for insert to authenticated
with check (public.current_user_role() in ('owner', 'manager'));

create policy "improvement_tasks_select_owner_manager_all"
on public.improvement_tasks for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "improvement_tasks_select_leader_own"
on public.improvement_tasks for select to authenticated
using (store_id = public.current_user_store_id());

create policy "improvement_tasks_insert_owner_manager"
on public.improvement_tasks for insert to authenticated
with check (public.current_user_role() in ('owner', 'manager'));

create policy "improvement_tasks_update_owner_manager"
on public.improvement_tasks for update to authenticated
using (public.current_user_role() in ('owner', 'manager'))
with check (public.current_user_role() in ('owner', 'manager'));
