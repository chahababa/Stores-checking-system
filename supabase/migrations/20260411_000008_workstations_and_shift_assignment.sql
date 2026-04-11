create table if not exists public.workstations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  area public.staff_position not null,
  store_id uuid references public.stores(id) on delete cascade,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists workstations_global_code_unique
  on public.workstations (code)
  where store_id is null;

create unique index if not exists workstations_store_code_unique
  on public.workstations (store_id, code)
  where store_id is not null;

insert into public.workstations (code, name, area, sort_order)
values
  ('kitchen', '內場', 'kitchen', 10),
  ('floor', '外場', 'floor', 20),
  ('counter', '櫃台', 'counter', 30)
on conflict do nothing;

alter table public.staff_members
  alter column position drop not null;

alter table public.staff_members
  add column if not exists default_workstation_id uuid references public.workstations(id) on delete set null;

update public.staff_members staff
set default_workstation_id = workstation.id
from public.workstations workstation
where workstation.store_id is null
  and workstation.code = staff.position::text
  and staff.default_workstation_id is null
  and staff.position is not null;

alter table public.inspection_staff
  add column if not exists workstation_id uuid references public.workstations(id) on delete restrict;

update public.inspection_staff assignment
set workstation_id = workstation.id
from public.workstations workstation
where workstation.store_id is null
  and workstation.code = assignment.role_in_shift::text
  and assignment.workstation_id is null;

alter table public.inspection_staff
  alter column workstation_id set not null;

alter table public.workstations enable row level security;

create policy "workstations_select_owner_manager_all"
on public.workstations for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "workstations_select_leader_scope"
on public.workstations for select to authenticated
using (
  public.current_user_role() = 'leader'
  and (store_id is null or store_id = public.current_user_store_id())
);

create policy "workstations_owner_manager_write"
on public.workstations for all to authenticated
using (public.current_user_role() in ('owner', 'manager'))
with check (public.current_user_role() in ('owner', 'manager'));
