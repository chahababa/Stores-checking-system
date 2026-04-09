insert into public.stores (code, name)
values
  ('store_1', '台北站前店'),
  ('store_2', '板橋車站店'),
  ('store_3', '桃園廣場店'),
  ('store_4', '中壢樞紐店')
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
  ('人員管理', 1, 'none'),
  ('內場作業環境', 2, 'kitchen'),
  ('外場作業環境', 3, 'floor'),
  ('廁所環境', 4, 'floor'),
  ('餐點品質', 5, 'kitchen'),
  ('服務品質', 6, 'floor')
on conflict (name) do update
set sort_order = excluded.sort_order,
    field_type = excluded.field_type;

with category_map as (
  select id, name from public.categories
)
insert into public.inspection_items (category_id, name, sort_order, is_base, is_active)
values
  ((select id from category_map where name = '人員管理'), '班表排定完整且為最新版本', 1, true, true),
  ((select id from category_map where name = '人員管理'), '出勤與交接紀錄已更新', 2, true, true),
  ((select id from category_map where name = '人員管理'), '制服與儀容符合規範', 3, true, true),
  ((select id from category_map where name = '人員管理'), '組員清楚本期重點項目', 4, true, true),
  ((select id from category_map where name = '人員管理'), '值班主管安排明確', 5, true, true),

  ((select id from category_map where name = '內場作業環境'), '內場地板清潔且保持乾燥', 1, true, true),
  ((select id from category_map where name = '內場作業環境'), '作業檯面已完成清潔消毒', 2, true, true),
  ((select id from category_map where name = '內場作業環境'), '冰箱與冷凍櫃外觀潔淨', 3, true, true),
  ((select id from category_map where name = '內場作業環境'), '製餐工具擺放整齊且乾淨', 4, true, true),
  ((select id from category_map where name = '內場作業環境'), '垃圾區整潔且未滿溢', 5, true, true),
  ((select id from category_map where name = '內場作業環境'), '洗手區備品充足且可正常使用', 6, true, true),
  ((select id from category_map where name = '內場作業環境'), '食材存放與標示符合規範', 7, true, true),
  ((select id from category_map where name = '內場作業環境'), '油污累積狀況已妥善控制', 8, true, true),

  ((select id from category_map where name = '外場作業環境'), '用餐區地板清潔', 1, true, true),
  ((select id from category_map where name = '外場作業環境'), '桌面與檯面已擦拭乾淨', 2, true, true),
  ((select id from category_map where name = '外場作業環境'), '玻璃表面清潔', 3, true, true),
  ((select id from category_map where name = '外場作業環境'), '醬料區備品完整且整齊', 4, true, true),
  ((select id from category_map where name = '外場作業環境'), 'POS 與收銀區整齊有序', 5, true, true),
  ((select id from category_map where name = '外場作業環境'), '排隊動線順暢且安全', 6, true, true),
  ((select id from category_map where name = '外場作業環境'), '燈光與音樂狀態適當', 7, true, true),
  ((select id from category_map where name = '外場作業環境'), '外場落實日常清潔流程', 8, true, true),

  ((select id from category_map where name = '廁所環境'), '廁所地面與洗手台清潔', 1, true, true),
  ((select id from category_map where name = '廁所環境'), '鏡面與玻璃清潔', 2, true, true),
  ((select id from category_map where name = '廁所環境'), '廁所設備潔淨', 3, true, true),
  ((select id from category_map where name = '廁所環境'), '廁所備品補充完整', 4, true, true),
  ((select id from category_map where name = '廁所環境'), '廁所垃圾桶未滿溢', 5, true, true),
  ((select id from category_map where name = '廁所環境'), '廁所無明顯異味', 6, true, true),

  ((select id from category_map where name = '餐點品質'), '食材有效期限已確認', 1, true, true),
  ((select id from category_map where name = '餐點品質'), '冷藏溫度符合規範', 2, true, true),
  ((select id from category_map where name = '餐點品質'), '熱存溫度符合規範', 3, true, true),
  ((select id from category_map where name = '餐點品質'), '生熟食有確實分開', 4, true, true),
  ((select id from category_map where name = '餐點品質'), '留樣與標示正確', 5, true, true),
  ((select id from category_map where name = '餐點品質'), '清潔藥劑存放正確', 6, true, true),
  ((select id from category_map where name = '餐點品質'), '病媒防治措施到位', 7, true, true),

  ((select id from category_map where name = '服務品質'), '招呼與結尾話術有落實', 1, true, true),
  ((select id from category_map where name = '服務品質'), '服務態度專業且親切', 2, true, true),
  ((select id from category_map where name = '服務品質'), '點餐內容正確無誤', 3, true, true),
  ((select id from category_map where name = '服務品質'), '餐點外觀符合標準', 4, true, true),
  ((select id from category_map where name = '服務品質'), '客訴應對處理恰當', 5, true, true),
  ((select id from category_map where name = '服務品質'), '取餐與內用動線順暢', 6, true, true),
  ((select id from category_map where name = '服務品質'), '門市整體氛圍符合品牌標準', 7, true, true),
  ((select id from category_map where name = '服務品質'), '服務速度符合期待', 8, true, true)
on conflict (category_id, name) do update
set sort_order = excluded.sort_order,
    is_base = excluded.is_base,
    is_active = excluded.is_active;

insert into public.inspection_items (category_id, name, sort_order, is_base, is_active)
values
  ((select id from public.categories where name = '外場作業環境'), '台北站前店自助區備品完整', 101, false, true),
  ((select id from public.categories where name = '服務品質'), '台北站前店尖峰支援安排到位', 102, false, true),
  ((select id from public.categories where name = '餐點品質'), '板橋車站店外送交接架整齊', 101, false, true),
  ((select id from public.categories where name = '內場作業環境'), '桃園廣場店炸台備援工具齊全', 101, false, true),
  ((select id from public.categories where name = '服務品質'), '中壢樞紐店晚班清潔交接完整', 101, false, true)
on conflict (category_id, name) do update
set sort_order = excluded.sort_order,
    is_base = excluded.is_base,
    is_active = excluded.is_active;

insert into public.store_extra_items (store_id, item_id)
select s.id, ii.id
from public.stores s
join public.inspection_items ii on ii.name = '台北站前店自助區備品完整'
where s.code = 'store_1'
on conflict do nothing;

insert into public.store_extra_items (store_id, item_id)
select s.id, ii.id
from public.stores s
join public.inspection_items ii on ii.name = '台北站前店尖峰支援安排到位'
where s.code = 'store_1'
on conflict do nothing;

insert into public.store_extra_items (store_id, item_id)
select s.id, ii.id
from public.stores s
join public.inspection_items ii on ii.name = '板橋車站店外送交接架整齊'
where s.code = 'store_2'
on conflict do nothing;

insert into public.store_extra_items (store_id, item_id)
select s.id, ii.id
from public.stores s
join public.inspection_items ii on ii.name = '桃園廣場店炸台備援工具齊全'
where s.code = 'store_3'
on conflict do nothing;

insert into public.store_extra_items (store_id, item_id)
select s.id, ii.id
from public.stores s
join public.inspection_items ii on ii.name = '中壢樞紐店晚班清潔交接完整'
where s.code = 'store_4'
on conflict do nothing;
