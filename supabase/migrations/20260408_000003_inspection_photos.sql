create table if not exists public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  score_id uuid not null references public.inspection_scores(id) on delete cascade,
  photo_url text not null,
  is_standard boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists inspection_photos_score_idx on public.inspection_photos (score_id);

alter table public.inspection_photos enable row level security;

create policy "inspection_photos_select_owner_manager_all"
on public.inspection_photos for select to authenticated
using (true);

create policy "inspection_photos_insert_owner_manager"
on public.inspection_photos for insert to authenticated
with check (public.current_user_role() in ('owner', 'manager'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-photos',
  'inspection-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "inspection_photos_public_read"
on storage.objects for select
to public
using (bucket_id = 'inspection-photos');

create policy "inspection_photos_authenticated_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'inspection-photos');
