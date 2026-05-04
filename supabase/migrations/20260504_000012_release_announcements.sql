do $$
begin
  create type public.release_announcement_audience as enum ('all', 'owner_manager', 'leader');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.release_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  audience public.release_announcement_audience not null default 'all',
  published_on date not null default current_date,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint release_announcements_title_present check (length(trim(title)) > 0),
  constraint release_announcements_summary_present check (length(trim(summary)) > 0)
);

alter table public.release_announcements enable row level security;

create policy "release_announcements_read_owner_manager"
on public.release_announcements for select to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy "release_announcements_read_leader"
on public.release_announcements for select to authenticated
using (public.current_user_role() = 'leader' and audience in ('all', 'leader'));

create policy "release_announcements_owner_manager_insert"
on public.release_announcements for insert to authenticated
with check (public.current_user_role() in ('owner', 'manager'));

create policy "release_announcements_owner_manager_update"
on public.release_announcements for update to authenticated
using (public.current_user_role() in ('owner', 'manager'))
with check (public.current_user_role() in ('owner', 'manager'));

create policy "release_announcements_owner_delete"
on public.release_announcements for delete to authenticated
using (public.current_user_role() = 'owner');

create index if not exists release_announcements_active_published_idx
  on public.release_announcements (is_active, published_on desc);
