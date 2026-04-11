do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'focus_type' and e.enumlabel = 'permanent'
  ) then
    alter type public.focus_type rename value 'permanent' to 'critical';
  end if;

  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'focus_type' and e.enumlabel = 'monthly'
  ) then
    alter type public.focus_type rename value 'monthly' to 'monthly_attention';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'focus_type' and e.enumlabel = 'complaint_watch'
  ) then
    alter type public.focus_type add value 'complaint_watch';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    where t.typname = 'focus_source'
  ) then
    create type public.focus_source as enum ('manual', 'complaint_sync');
  end if;
end $$;

alter table public.focus_items
  add column if not exists store_id uuid references public.stores(id) on delete cascade,
  add column if not exists source public.focus_source not null default 'manual';

alter table public.inspection_scores
  add column if not exists applied_tag_types public.focus_type[] not null default '{}'::public.focus_type[];

update public.inspection_scores
set applied_tag_types = array['critical'::public.focus_type]
where is_focus_item = true
  and applied_tag_types = '{}'::public.focus_type[];

drop index if exists public.focus_items_permanent_unique;
drop index if exists public.focus_items_monthly_unique;

alter table public.focus_items
  drop constraint if exists focus_month_required;

alter table public.focus_items
  add constraint focus_items_scope_check
  check (
    (type = 'critical' and month is null and store_id is null)
    or
    (type in ('monthly_attention', 'complaint_watch') and month ~ '^\d{4}-\d{2}$')
  );

create unique index if not exists focus_items_critical_unique
  on public.focus_items (item_id, type)
  where type = 'critical';

create unique index if not exists focus_items_scoped_unique
  on public.focus_items (
    item_id,
    type,
    month,
    coalesce(store_id, '00000000-0000-0000-0000-000000000000'::uuid),
    source
  )
  where type in ('monthly_attention', 'complaint_watch');

drop policy if exists "focus_items_owner_manager_insert" on public.focus_items;
drop policy if exists "focus_items_owner_manager_update" on public.focus_items;
drop policy if exists "focus_items_owner_manager_delete" on public.focus_items;

create policy "focus_items_owner_manager_insert"
on public.focus_items for insert to authenticated
with check (
  public.current_user_role() = 'owner'
  or (public.current_user_role() = 'manager' and type in ('monthly_attention', 'complaint_watch'))
);

create policy "focus_items_owner_manager_update"
on public.focus_items for update to authenticated
using (
  public.current_user_role() = 'owner'
  or (public.current_user_role() = 'manager' and type in ('monthly_attention', 'complaint_watch'))
)
with check (
  public.current_user_role() = 'owner'
  or (public.current_user_role() = 'manager' and type in ('monthly_attention', 'complaint_watch'))
);

create policy "focus_items_owner_manager_delete"
on public.focus_items for delete to authenticated
using (
  public.current_user_role() = 'owner'
  or (public.current_user_role() = 'manager' and type in ('monthly_attention', 'complaint_watch'))
);
