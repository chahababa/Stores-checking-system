update public.stores
set name = case code
  when 'store_1' then '1店'
  when 'store_2' then '2店'
  when 'store_3' then '3店'
  when 'store_4' then '4店'
  else name
end
where code in ('store_1', 'store_2', 'store_3', 'store_4');
