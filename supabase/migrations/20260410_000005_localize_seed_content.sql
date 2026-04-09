update public.stores
set name = case code
  when 'store_1' then '台北站前店'
  when 'store_2' then '板橋車站店'
  when 'store_3' then '桃園廣場店'
  when 'store_4' then '中壢樞紐店'
  else name
end
where code in ('store_1', 'store_2', 'store_3', 'store_4');

update public.categories
set name = case name
  when 'People Management' then '人員管理'
  when 'Kitchen Environment' then '內場作業環境'
  when 'Front Counter Environment' then '外場作業環境'
  when 'Restroom' then '廁所環境'
  when 'Food Safety' then '餐點品質'
  when 'Service Quality' then '服務品質'
  else name
end
where name in (
  'People Management',
  'Kitchen Environment',
  'Front Counter Environment',
  'Restroom',
  'Food Safety',
  'Service Quality'
);

update public.inspection_items
set name = case name
  when 'Shift roster is complete and current' then '班表排定完整且為最新版本'
  when 'Attendance and handoff records are updated' then '出勤與交接紀錄已更新'
  when 'Uniform and grooming standards are followed' then '制服與儀容符合規範'
  when 'Team members know current focus items' then '組員清楚本期重點項目'
  when 'Manager on duty is clearly assigned' then '值班主管安排明確'
  when 'Kitchen floor is clean and dry' then '內場地板清潔且保持乾燥'
  when 'Work surfaces are sanitized' then '作業檯面已完成清潔消毒'
  when 'Fridge and freezer exterior is clean' then '冰箱與冷凍櫃外觀潔淨'
  when 'Cooking tools are organized and clean' then '製餐工具擺放整齊且乾淨'
  when 'Trash area is tidy and not overflowing' then '垃圾區整潔且未滿溢'
  when 'Handwashing station is stocked and usable' then '洗手區備品充足且可正常使用'
  when 'Ingredient storage follows labeling rules' then '食材存放與標示符合規範'
  when 'Oil and grease buildup is under control' then '油污累積狀況已妥善控制'
  when 'Dining area floor is clean' then '用餐區地板清潔'
  when 'Tables and counters are wiped down' then '桌面與檯面已擦拭乾淨'
  when 'Glass surfaces are clean' then '玻璃表面清潔'
  when 'Condiment station is complete and tidy' then '醬料區備品完整且整齊'
  when 'POS and cashier area are organized' then 'POS 與收銀區整齊有序'
  when 'Queue area is clear and safe' then '排隊動線順暢且安全'
  when 'Lighting and music are appropriate' then '燈光與音樂狀態適當'
  when 'Front team follows cleaning routines' then '外場落實日常清潔流程'
  when 'Restroom floor and sink are clean' then '廁所地面與洗手台清潔'
  when 'Mirror and glass are clean' then '鏡面與玻璃清潔'
  when 'Toilet fixtures are clean' then '廁所設備潔淨'
  when 'Supplies are fully stocked' then '廁所備品補充完整'
  when 'Trash bin is not overflowing' then '廁所垃圾桶未滿溢'
  when 'No odor issue is present' then '廁所無明顯異味'
  when 'Ingredient expiration is checked' then '食材有效期限已確認'
  when 'Cold holding temperatures are compliant' then '冷藏溫度符合規範'
  when 'Hot holding temperatures are compliant' then '熱存溫度符合規範'
  when 'Raw and cooked items are separated' then '生熟食有確實分開'
  when 'Sample retention and labels are correct' then '留樣與標示正確'
  when 'Cleaning chemicals are stored correctly' then '清潔藥劑存放正確'
  when 'Pest prevention controls are in place' then '病媒防治措施到位'
  when 'Greeting and closing script is followed' then '招呼與結尾話術有落實'
  when 'Staff attitude is professional and friendly' then '服務態度專業且親切'
  when 'Order accuracy is maintained' then '點餐內容正確無誤'
  when 'Meal presentation meets standard' then '餐點外觀符合標準'
  when 'Customer issue handling is appropriate' then '客訴應對處理恰當'
  when 'Pickup and dine-in flow is smooth' then '取餐與內用動線順暢'
  when 'Store atmosphere matches brand standard' then '門市整體氛圍符合品牌標準'
  when 'Service timing is acceptable' then '服務速度符合期待'
  when 'Taipei Main self-service station is complete' then '台北站前店自助區備品完整'
  when 'Taipei Main commuter rush support is in place' then '台北站前店尖峰支援安排到位'
  when 'Banqiao Station delivery handoff shelf is organized' then '板橋車站店外送交接架整齊'
  when 'Taoyuan Plaza fryer backup tools are ready' then '桃園廣場店炸台備援工具齊全'
  when 'Zhongli Hub late-night cleanup handoff is complete' then '中壢樞紐店晚班清潔交接完整'
  else name
end
where name in (
  'Shift roster is complete and current',
  'Attendance and handoff records are updated',
  'Uniform and grooming standards are followed',
  'Team members know current focus items',
  'Manager on duty is clearly assigned',
  'Kitchen floor is clean and dry',
  'Work surfaces are sanitized',
  'Fridge and freezer exterior is clean',
  'Cooking tools are organized and clean',
  'Trash area is tidy and not overflowing',
  'Handwashing station is stocked and usable',
  'Ingredient storage follows labeling rules',
  'Oil and grease buildup is under control',
  'Dining area floor is clean',
  'Tables and counters are wiped down',
  'Glass surfaces are clean',
  'Condiment station is complete and tidy',
  'POS and cashier area are organized',
  'Queue area is clear and safe',
  'Lighting and music are appropriate',
  'Front team follows cleaning routines',
  'Restroom floor and sink are clean',
  'Mirror and glass are clean',
  'Toilet fixtures are clean',
  'Supplies are fully stocked',
  'Trash bin is not overflowing',
  'No odor issue is present',
  'Ingredient expiration is checked',
  'Cold holding temperatures are compliant',
  'Hot holding temperatures are compliant',
  'Raw and cooked items are separated',
  'Sample retention and labels are correct',
  'Cleaning chemicals are stored correctly',
  'Pest prevention controls are in place',
  'Greeting and closing script is followed',
  'Staff attitude is professional and friendly',
  'Order accuracy is maintained',
  'Meal presentation meets standard',
  'Customer issue handling is appropriate',
  'Pickup and dine-in flow is smooth',
  'Store atmosphere matches brand standard',
  'Service timing is acceptable',
  'Taipei Main self-service station is complete',
  'Taipei Main commuter rush support is in place',
  'Banqiao Station delivery handoff shelf is organized',
  'Taoyuan Plaza fryer backup tools are ready',
  'Zhongli Hub late-night cleanup handoff is complete'
);
