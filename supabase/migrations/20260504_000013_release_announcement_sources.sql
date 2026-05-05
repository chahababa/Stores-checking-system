alter table public.release_announcements
  add column if not exists source_type text,
  add column if not exists source_ref text;

create unique index if not exists release_announcements_source_idx
  on public.release_announcements (source_type, source_ref);
