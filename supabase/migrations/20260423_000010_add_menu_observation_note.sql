alter table public.inspection_menu_items
  add column if not exists observation_note text;
