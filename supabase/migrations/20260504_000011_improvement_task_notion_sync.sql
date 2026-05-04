alter table public.improvement_tasks
  add column if not exists notion_page_id text,
  add column if not exists notion_synced_at timestamptz;

create index if not exists improvement_tasks_notion_page_id_idx
  on public.improvement_tasks(notion_page_id)
  where notion_page_id is not null;
