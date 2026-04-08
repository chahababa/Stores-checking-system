create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_owner_manager"
on public.audit_logs for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "audit_logs_insert_owner_manager"
on public.audit_logs for insert to authenticated
with check (public.current_user_role() in ('owner', 'manager'));
