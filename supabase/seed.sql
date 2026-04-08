insert into public.stores (code, name)
values
  ('store_1', 'Taipei Main'),
  ('store_2', 'Banqiao Station'),
  ('store_3', 'Taoyuan Plaza'),
  ('store_4', 'Zhongli Hub')
on conflict (code) do update
set name = excluded.name;

insert into public.users (email, name, role, is_active)
values ('chahababa@gmail.com', 'System Owner', 'owner', true)
on conflict (email) do update
set name = excluded.name,
    role = excluded.role,
    is_active = excluded.is_active;

insert into public.categories (name, sort_order, field_type)
values
  ('People Management', 1, 'none'),
  ('Kitchen Environment', 2, 'kitchen'),
  ('Front Counter Environment', 3, 'floor'),
  ('Restroom', 4, 'floor'),
  ('Food Safety', 5, 'kitchen'),
  ('Service Quality', 6, 'floor')
on conflict (name) do update
set sort_order = excluded.sort_order,
    field_type = excluded.field_type;

with category_map as (
  select id, name from public.categories
)
insert into public.inspection_items (category_id, name, sort_order, is_base, is_active)
values
  ((select id from category_map where name = 'People Management'), 'Shift roster is complete and current', 1, true, true),
  ((select id from category_map where name = 'People Management'), 'Attendance and handoff records are updated', 2, true, true),
  ((select id from category_map where name = 'People Management'), 'Uniform and grooming standards are followed', 3, true, true),
  ((select id from category_map where name = 'People Management'), 'Team members know current focus items', 4, true, true),
  ((select id from category_map where name = 'People Management'), 'Manager on duty is clearly assigned', 5, true, true),

  ((select id from category_map where name = 'Kitchen Environment'), 'Kitchen floor is clean and dry', 1, true, true),
  ((select id from category_map where name = 'Kitchen Environment'), 'Work surfaces are sanitized', 2, true, true),
  ((select id from category_map where name = 'Kitchen Environment'), 'Fridge and freezer exterior is clean', 3, true, true),
  ((select id from category_map where name = 'Kitchen Environment'), 'Cooking tools are organized and clean', 4, true, true),
  ((select id from category_map where name = 'Kitchen Environment'), 'Trash area is tidy and not overflowing', 5, true, true),
  ((select id from category_map where name = 'Kitchen Environment'), 'Handwashing station is stocked and usable', 6, true, true),
  ((select id from category_map where name = 'Kitchen Environment'), 'Ingredient storage follows labeling rules', 7, true, true),
  ((select id from category_map where name = 'Kitchen Environment'), 'Oil and grease buildup is under control', 8, true, true),

  ((select id from category_map where name = 'Front Counter Environment'), 'Dining area floor is clean', 1, true, true),
  ((select id from category_map where name = 'Front Counter Environment'), 'Tables and counters are wiped down', 2, true, true),
  ((select id from category_map where name = 'Front Counter Environment'), 'Glass surfaces are clean', 3, true, true),
  ((select id from category_map where name = 'Front Counter Environment'), 'Condiment station is complete and tidy', 4, true, true),
  ((select id from category_map where name = 'Front Counter Environment'), 'POS and cashier area are organized', 5, true, true),
  ((select id from category_map where name = 'Front Counter Environment'), 'Queue area is clear and safe', 6, true, true),
  ((select id from category_map where name = 'Front Counter Environment'), 'Lighting and music are appropriate', 7, true, true),
  ((select id from category_map where name = 'Front Counter Environment'), 'Front team follows cleaning routines', 8, true, true),

  ((select id from category_map where name = 'Restroom'), 'Restroom floor and sink are clean', 1, true, true),
  ((select id from category_map where name = 'Restroom'), 'Mirror and glass are clean', 2, true, true),
  ((select id from category_map where name = 'Restroom'), 'Toilet fixtures are clean', 3, true, true),
  ((select id from category_map where name = 'Restroom'), 'Supplies are fully stocked', 4, true, true),
  ((select id from category_map where name = 'Restroom'), 'Trash bin is not overflowing', 5, true, true),
  ((select id from category_map where name = 'Restroom'), 'No odor issue is present', 6, true, true),

  ((select id from category_map where name = 'Food Safety'), 'Ingredient expiration is checked', 1, true, true),
  ((select id from category_map where name = 'Food Safety'), 'Cold holding temperatures are compliant', 2, true, true),
  ((select id from category_map where name = 'Food Safety'), 'Hot holding temperatures are compliant', 3, true, true),
  ((select id from category_map where name = 'Food Safety'), 'Raw and cooked items are separated', 4, true, true),
  ((select id from category_map where name = 'Food Safety'), 'Sample retention and labels are correct', 5, true, true),
  ((select id from category_map where name = 'Food Safety'), 'Cleaning chemicals are stored correctly', 6, true, true),
  ((select id from category_map where name = 'Food Safety'), 'Pest prevention controls are in place', 7, true, true),

  ((select id from category_map where name = 'Service Quality'), 'Greeting and closing script is followed', 1, true, true),
  ((select id from category_map where name = 'Service Quality'), 'Staff attitude is professional and friendly', 2, true, true),
  ((select id from category_map where name = 'Service Quality'), 'Order accuracy is maintained', 3, true, true),
  ((select id from category_map where name = 'Service Quality'), 'Meal presentation meets standard', 4, true, true),
  ((select id from category_map where name = 'Service Quality'), 'Customer issue handling is appropriate', 5, true, true),
  ((select id from category_map where name = 'Service Quality'), 'Pickup and dine-in flow is smooth', 6, true, true),
  ((select id from category_map where name = 'Service Quality'), 'Store atmosphere matches brand standard', 7, true, true),
  ((select id from category_map where name = 'Service Quality'), 'Service timing is acceptable', 8, true, true)
on conflict (category_id, name) do update
set sort_order = excluded.sort_order,
    is_base = excluded.is_base,
    is_active = excluded.is_active;

insert into public.inspection_items (category_id, name, sort_order, is_base, is_active)
values
  ((select id from public.categories where name = 'Front Counter Environment'), 'Taipei Main self-service station is complete', 101, false, true),
  ((select id from public.categories where name = 'Service Quality'), 'Taipei Main commuter rush support is in place', 102, false, true),
  ((select id from public.categories where name = 'Food Safety'), 'Banqiao Station delivery handoff shelf is organized', 101, false, true),
  ((select id from public.categories where name = 'Kitchen Environment'), 'Taoyuan Plaza fryer backup tools are ready', 101, false, true),
  ((select id from public.categories where name = 'Service Quality'), 'Zhongli Hub late-night cleanup handoff is complete', 101, false, true)
on conflict (category_id, name) do update
set sort_order = excluded.sort_order,
    is_base = excluded.is_base,
    is_active = excluded.is_active;

insert into public.store_extra_items (store_id, item_id)
select s.id, ii.id
from public.stores s
join public.inspection_items ii on ii.name = 'Taipei Main self-service station is complete'
where s.code = 'store_1'
on conflict do nothing;

insert into public.store_extra_items (store_id, item_id)
select s.id, ii.id
from public.stores s
join public.inspection_items ii on ii.name = 'Taipei Main commuter rush support is in place'
where s.code = 'store_1'
on conflict do nothing;

insert into public.store_extra_items (store_id, item_id)
select s.id, ii.id
from public.stores s
join public.inspection_items ii on ii.name = 'Banqiao Station delivery handoff shelf is organized'
where s.code = 'store_2'
on conflict do nothing;

insert into public.store_extra_items (store_id, item_id)
select s.id, ii.id
from public.stores s
join public.inspection_items ii on ii.name = 'Taoyuan Plaza fryer backup tools are ready'
where s.code = 'store_3'
on conflict do nothing;

insert into public.store_extra_items (store_id, item_id)
select s.id, ii.id
from public.stores s
join public.inspection_items ii on ii.name = 'Zhongli Hub late-night cleanup handoff is complete'
where s.code = 'store_4'
on conflict do nothing;
