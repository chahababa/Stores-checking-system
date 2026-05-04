# Changelog

## 2026-05-04

### 新增「上週未通過」巡店項目標籤

- `feat: flag items that failed the previous inspection`
  - 巡店表單會把同店別上一筆巡店中評為 B / C 的項目標註為「上週未通過」。
  - 若該項目已連續多週低分，標籤會補充連續週數，例如「上週未通過 · 連續低分 3 週」。
  - 把前次低分判斷與標籤文案抽成可測試 helper，避免後續 UI 調整破壞提醒邏輯。

### 部署注意

- 不需要新增 Supabase migration 或 env。
- 這是 UI / helper 邏輯更新，沿用既有 `inspection_scores.has_prev_issue` 與 `consecutive_weeks` 欄位。

### 驗證

- `npm test -- --run src/lib/previous-issue-tags.test.ts`

---

## 2026-04-28 Latest

### 修正導覽列 active 標籤在前端切頁後停留在上一頁

- `fix: keep navigation active state in sync`
  - 導覽列改用 client-side `usePathname()` 判斷目前頁面，避免 Next.js protected layout 在前端切頁時重用舊的 server header pathname。
  - 修正從「巡店紀錄」切到「改善追蹤」後，黑底 active 標籤仍停在「巡店紀錄」的問題。
  - active 判斷改成 exact match 或子路由 segment match，避免 sibling prefix 誤判，例如 `/settings/staffing` 不會誤亮 `/settings/staff`。
  - 新增 `isNavigationLinkActive()` regression tests，涵蓋改善追蹤、巡店紀錄明細、首頁 exact-only 與 trailing slash。

### 部署注意

- 不需要新增 Supabase migration 或 env。
- 合併到 `main` 後 Zeabur 會自動 build + deploy。

### 驗證

- `npm test -- --run src/lib/navigation.test.ts`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`

---

### 改善追蹤改為依店別分組收合

- `feat: group improvement tasks by store`
  - `/inspection/improvements` 改善追蹤不再把所有任務混在同一串清單。
  - 依店別分成可收合區塊，每個店別標題列顯示總項目數、待處理、已改善、已確認數量。
  - 有待處理任務的店別預設展開，沒有待處理的店別可保持收合，主管/owner 跨店查看時更容易聚焦。
  - 未指定店別的任務會集中到「未指定店別」群組並排在最後。
  - 新增 `groupImprovementTasksByStore()` 與 regression tests，確保分組排序與各狀態統計正確。

### 部署注意

- 不需要新增 Supabase migration 或 env。
- 合併到 `main` 後 Zeabur 會自動 build + deploy。

### 驗證

- `npm test -- --run src/lib/improvement-task-groups.test.ts`
- `npm run typecheck`

---

### 修正巡店照片上傳、照片顯示、刪除權限與登入頁新版 UI

- `940d4ba` `fix: reduce inspection photo upload failures (#3)`
  - 降低巡店照片送出失敗機率：調整 Next.js Server Actions body limit 到 `8mb`。
  - 前端壓縮單張照片目標改為 350KB，並限制每個巡檢項目最多 3 張、單次巡店最多 10 張。
  - 表單選照片時會即時提示超量，避免送出後才失敗。
  - 新增照片上傳限制與 Next config regression tests。
- `afbf99d` `fix: render inspection photos reliably`
  - 修正巡店紀錄明細頁照片無法顯示的問題。
  - 新增 `normalizePhotoDisplayUrl()`，處理 Supabase public URL path encoding，避免中文、空白或特殊字元造成顯示失敗。
  - 巡店明細頁 score photos 改用 Next `<Image unoptimized fill>` 呈現，取代較脆弱的 CSS `background-image`。
  - 新增照片顯示 URL regression tests。
- `fb08862` `fix: keep inspection report deletion owner-only`
  - 調整巡店報告管理權限：`manager` 可管理/查看管理操作，但不可刪除巡店報告。
  - 只有 `owner` 可以刪除巡店報告；`leader` 不能管理也不能刪除。
  - 系統擁有者模擬店長視角時，依模擬角色權限判斷，不顯示刪除權限。
  - 新增 `inspection-permissions` 權限函式與單元測試。
- `50d0dea` `fix: refresh login page neo brutalism UI`
  - 修正最初 `/login` 登入頁仍停留在舊版 warm rounded card UI 的問題。
  - 登入頁改用目前系統一致的 Neo Brutalism 視覺：`nb-card`、`nb-h1`、`nb-stamp`、粗黑框、硬陰影與 `nb-*` 色彩。
  - Google 登入按鈕改用 `nb-btn-primary`，錯誤提示改為新版紅色粗框警示。
  - 新增登入頁 UI source-level regression test，防止未來退回 `shadow-card` / `rounded-[32px]` / `bg-warm` 舊樣式。

### 部署注意

- 不需要新增 Supabase migration。
- 合併到 `main` 後 Zeabur 會自動 build + deploy。
- 登入頁 UI 更新後，建議用無痕視窗打開 `/login` 確認未登入首頁已切換到新版視覺。

### 驗證

- PR #3：照片上傳限制相關 targeted tests、`npm run typecheck`、`npm test`、`npm run lint`、`npm run build`、`git diff --check` 全部通過。
- PR #4：照片顯示 URL tests、`npm run typecheck`、`npm test`、`npm run lint`、`npm run build`、`git diff --check` 全部通過。
- PR #5：權限 tests、`npm run typecheck`、`npm test`、`npm run lint`、`npm run build`、`git diff --check` 全部通過。
- PR #6：登入頁 UI test、`npm run typecheck`、`npm test`、`npm run lint`、`npm run build`、`git diff --check` 全部通過。

---

## 2026-04-27

### 巡店送出完成後，自動寄信通知相關人員

- `feat(email): notify store leader, managers, owners on new inspection`
  - 每筆「新增巡店」送出成功後，系統會自動寄一封 email 給：
    - 該店的店長（`role = leader AND store_id = <該店>`）
    - 全部主管 / 區經理（`role = manager`）
    - 全部系統擁有者（`role = owner`）
    - 條件：`is_active = true`。重複 email 會去重。
  - 編輯巡店（`updateInspection`）**不會**重寄，避免打擾。
  - 信件主旨：`[巡店通知] {店別} {日期} {時段} — 總評 {A/B/C}`。
  - 信件內容：店別 / 日期 / 時段 / 提交者 / 總評 / 平均分 / B/C 題數，加上**所有 B/C 題目清單（含分類、題目名、評分、備註）**，以及一顆「查看完整報告」按鈕直接連到該筆巡店。
  - 全部 BCC 寄出，收件者看不到彼此的 email。
  - 寄信動作 fire-and-forget：失敗（API key 無效、Resend 服務當機、收件者解析失敗等）**絕對不會回滾巡店紀錄**，但會寫進 audit log（`action: "send_inspection_email_failed"`），事後可以追。
  - 若 production 沒設 Resend env vars，整個寄信流程會 silently no-op（不寫 audit log），舊行為照常運作。

### 實作

- 新檔：`src/lib/email.ts`
  - `sendInspectionCompletedEmail(inspectionId)`：自己撈 inspection / store / inspector / scores / recipients、用 `buildOverallInspectionGrade` 算總評、組 HTML + plain text、丟給 Resend。
  - 設計成永遠不 throw —— 回傳 `{ ok: true | false, reason }`，呼叫端只看回傳值決定要不要寫 audit log。
- 修改：`src/lib/inspection.ts` 的 `createInspection`，在 audit log 後呼叫上面那個 function，包在 try / catch 裡確保不影響主流程。
- 修改：`src/lib/supabase/env.ts` 新增 `getResendApiKey()` / `getResendFromEmail()` helper。
- 修改：`.env.example` 新增兩個 env var 的占位（皆可留白 = 停用通知）。
- 新增 dependency：`resend@^6.12.2`。

### 部署注意（重要）

需要在 Resend + DNS + Zeabur 三邊都設定好後通知功能才會上線。**只要其中一個 env var 沒設，整個通知就會 silently 不發**（程式不會壞，但也不會寄信）。

1. **Resend 後台**（[resend.com](https://resend.com/)）：
   - 註冊帳號（如果還沒）。
   - 進入 `Domains` → `Add Domain` → 輸入 `hoochuu.com.tw`（或想用來寄信的 domain）。
   - Resend 會給你 3 條 TXT record（SPF / DKIM × 2）。
   - **DNS 設定**：到你的 domain registrar（看 hoochuu.com.tw 在哪邊管理）把那 3 條 TXT record 加上去。等 Resend 後台顯示 `Verified`（通常 5–30 分鐘）。
   - 進入 `API Keys` → `Create API Key`（權限選 `Sending access`） → 複製 key（只會顯示一次）。

2. **Zeabur 後台**（[stores-checking-system service](https://zeabur.com/projects/69d6eb3686ea5714a4e49e39/services/69d6ecbc86ea5714a4e4a02a)）：
   - `Variable` 分頁新增兩條 env var：
     - `RESEND_API_KEY=re_xxxxxxxxxxxx`
     - `RESEND_FROM_EMAIL=no-reply@hoochuu.com.tw`（任你 verified domain 下的 mailbox 都可以）
   - 儲存後 Zeabur 會自動 redeploy。

3. **驗證**：登入 production 隨手送一筆巡店 → 應該幾秒內所有 owner / manager + 該店店長都收到一封信。看不到信先到 audit log 看有沒有 `send_inspection_email_failed`。

### 驗證

- `npm run typecheck`、`npm run lint`、`npm run test`（26 unit tests 全過）。
- 還沒做 production 實測（需要 Resend + DNS 設定，請依上面三步搞定後再驗）。

---

### 主管（區經理）也可以授權店長帳號了

- `feat(auth): allow managers to create and toggle leader accounts`
  - 之前**只有系統擁有者**能進「帳號管理」新增 / 停用帳號，區經理每次要新增店長都得回頭找 owner。
  - 開放後：主管在自己的後台就能建立 / 啟用 / 停用**店長**帳號（manager / owner 仍是 owner 限定）。
  - 安全邊界（三層都擋）：
    - UI 導覽列：`帳號管理` 連結 `roles` 從 `["owner"]` → `["owner", "manager"]`。
    - 頁面 ([src/app/(protected)/settings/users/page.tsx](src/app/(protected)/settings/users/page.tsx))：`requireRole("owner", "manager")`。主管視角自動隱藏「角色」下拉（hidden `value="leader"`）、「所屬店別」變必選；列表只列出 `role === "leader"` 的帳號（看不到其他 manager / owner 的 email）。
    - Server actions ([src/lib/settings.ts](src/lib/settings.ts))：
      - `createAuthorizedUser`：主管即使送出 `role=manager` / `role=owner` 也會被強制改成 `leader`；如果目標 email 已綁在 manager / owner 帳號上，主管的覆蓋會被拒絕（`這個 Email 已綁定為主管或系統擁有者帳號，主管無法覆蓋。`）。
      - `updateAuthorizedUserStatus`：主管要停用 / 啟用前會先撈目標 user，如果不是 `leader` 直接拒絕（`主管只能停用或啟用店長帳號。`）。
  - 順手做的硬擋：建立 `leader` 帳號時必選 `store_id`，`owner` 視角也擋（之前 UI 允許「不指定店別」會留下空轉的店長帳號）。
  - audit log 兩條 action 都補上 `actor_role` 欄位，事後可以區分是 owner 直接做的還是 manager 代做的。

### 部署注意

- 不需要 migration、不需要新增 env。直接 push 到 `main` 後 Zeabur 自動 build + deploy。
- 既有的店長 / 主管 / 擁有者帳號都不受影響。

### 驗證

- `npm run typecheck`、`npm run lint`、`npm run test`（26 個 unit test 全過）。

---

### 修正巡店送出再次卡在 Server Components render 錯誤（這次是 `photo_url` 缺欄位）

- `77a5969` `fix(inspection): expire negative photo-column cache after 60s`
  - 使用者在 production 送出含照片的巡店時，又看到一次 `An error occurred in the Server Components render. The specific message is omitted in production builds...`，狀況跟 04-23 那次很像但根因不同。
  - 04-23 那次是 `observation_note` 欄位沒套；這次是 **`photo_url` 欄位**（migration `20260412_000009_menu_item_photos.sql`）也從來沒在 production DB 套上。`supportsMenuItemPhotos()` 在 `inspection_menu_items` 找不到 `photo_url` → 直接 throw 中文訊息「餐點抽查照片功能需要先套用最新的資料庫 migration。」→ Next.js 在 production 把它遮成通用文字。
  - 在 production Supabase SQL Editor 直接補上：`alter table public.inspection_menu_items add column if not exists photo_url text;`（idempotent）。
  - 但補完欄位後立刻踩到第二顆雷：`supportsMenuItemPhotos()` 用 module-level `let` 把「欄位不存在」的判斷 cache 在 Node process 裡，process 不重啟永遠不會重查。所以即使 DB 已經修好、第一個 instance 仍會繼續 throw。手動 Restart 過 Zeabur service 才解。
  - 這個 commit 把負向 cache 加上 **60 秒 TTL**：日後再有「migration 在 production 補完但 instance 沒重啟」情境，最多卡 1 分鐘自我修復、不必人工 restart。正向 cache 仍永久（欄位不會自己消失）。

### 修正手機上「巡店紀錄」最右邊「查看」按鈕點不到

- `2271e8d` `ui(history): card layout for inspection history on mobile`
  - `/inspection/history` 列表桌機版用 7 欄 table，手機螢幕擠不下，最右邊的「查看 →」直接被外層 `overflow-hidden` 裁掉、也滑不到 → 手機根本進不去單筆巡店明細頁。
  - 桌機保留原本的 table（`hidden md:block`）；手機新增 stacked card 排版（`md:hidden`），每張卡片底部有一顆**全寬「查看巡店紀錄 →」**按鈕，整片可點。
  - `data-testid` 在兩種排版上都保留，e2e 測試不受影響。
- `1d3b4c0` `fix(ui): allow horizontal scroll on tables that overflow`
  - 順手把 `.nb-table-wrap` 的 `overflow-hidden` 改成 `overflow-x-auto`。同樣的裁切問題在 `/settings/users`、`/audit` 兩張表也存在；手機現在可以橫滑找到溢出的內容。桌機表格沒有溢出時 `auto` 不會跳 scrollbar，無感。

### 部署注意

- **這次需要先在 production Supabase 執行**：`alter table public.inspection_menu_items add column if not exists photo_url text;`（已於 04-27 執行完畢，再次部署無副作用，因為 `if not exists`）。
- 不需要新 migration 檔案 —— 既有的 `20260412_000009_menu_item_photos.sql` 內容跟我們補的這行 SQL 完全相同，只是 production DB 之前沒跑過。
- 程式 push 到 `main` 後 Zeabur 自動 build + deploy（約 100 秒）。

### 驗證

- `npm run typecheck`、`npm run lint`：兩台都過。
- production 實測：在 5F Chrome 上以 owner 身分送出兩筆 `[claude測試]` 巡店（一筆無照片、一筆含照片，含照片那筆兩張圖都成功上傳到 Supabase Storage 並在 history 頁顯示）。兩筆 inspection id 留在「測試資料清理」頁待清。

---

## 2026-04-24

### 系統擁有者可在 App 內切換「主管／店長」視角
- `a3f34cc` `feat(auth): owner can impersonate manager / leader views`
  - 新功能：系統擁有者在右上角「登出」按鈕旁會看到 **模擬視角 ▾** 下拉。
  - 可切換到：主管視角 / 店長 @ 1 店 / 店長 @ 2 店 / 店長 @ 3 店 / 店長 @ 4 店。
  - 切換後整個介面依該角色權限顯示：導覽列瘦身、資料範圍縮到該店、只顯示該角色能看到的頁面。
  - 切換中時最頂端會壓一條紅色 sticky banner：「🔄 正在模擬【XXX】視角」+「結束模擬」按鈕，避免忘記自己在模擬中。
  - **只有真正的系統擁有者**能看到這個下拉（非擁有者看不到，也擋掉任何啟動模擬的 API 呼叫）。
  - 使用 `nb_impersonation` httpOnly cookie 儲存模擬狀態，1 小時自動過期。
  - 登出時 cookie 一併清掉。
  - 模擬狀態下的寫入操作會使用模擬角色的權限，但 audit log 仍記錄本人 email（以便追查）。

### 實作檔案
- 新增：`src/lib/impersonation.ts`（cookie 讀寫）、`src/app/actions/impersonation.ts`（server actions）、`src/components/impersonation-menu.tsx`、`src/components/impersonation-banner.tsx`。
- 修改：`src/lib/auth.ts`（在 `getCurrentUserProfile()` 裡依 cookie 回傳模擬 profile）、`src/app/(protected)/layout.tsx`、`src/components/app-shell.tsx`、`src/app/page.tsx`（都補上 stores / impersonationStoreName props）。

### 驗證
- `npm run typecheck`
- `npm run lint`
- `npm run build`（23 個路由全過）
- 正式站實測：`owner → 模擬視角 → 店長 @ 1 店 → banner 出現 → 結束模擬 → 回 owner`。

### 部署注意
- 無 migration 需要。直接 push 到 `main` 後 Zeabur 自動 build + deploy（約 100 秒）。
- 若模擬中使用者進行了寫入操作，資料會真的進 DB。測試完請務必手動清除（或用 `/settings/qa-cleanup`）。

---

## 2026-04-23 Latest

### 修正新經理巡店送出卡在 Server Components render 錯誤
- `5df0ced` `fix: add observation note column for menu item inspections`
  - 主管 / 經理在餐點抽查區的「重量」欄位輸入中文觀察描述（例如外觀、製餐過程備註）時，會觸發 Postgres 無法把中文轉成 `numeric(8, 2)`，整筆巡店送出失敗。
  - Production 下 Next.js 會把 server action 錯誤替換成通用訊息：`An error occurred in the Server Components render. The specific message is omitted in production builds...`，使用者完全看不到真正原因。
  - 新增 migration `20260423_000010_add_menu_observation_note.sql`，在 `inspection_menu_items` 加上 `observation_note text`。
  - 巡店表單新增「餐點觀察 / 製餐過程備註」textarea（內用、外帶各一個）。
  - 重量欄位改為 `type="number" inputMode="decimal"`，瀏覽器層直接擋掉非數字輸入，避免同樣的狀況再發生。
  - 巡店明細頁、單筆巡店 CSV 匯出都同步帶出新的觀察備註欄位。
  - 重量欄位標籤統一為「重量（克）」，placeholder 提示「只填數字」。

### 驗證
- `npm run typecheck`
- `npm run lint`
- `npm run test`

### 部署注意
- 需要先在 Supabase SQL Editor 執行 `20260423_000010_add_menu_observation_note.sql`，**再**讓新版前端部署上線。順序反過來會讓巡店明細頁讀取 `observation_note` 欄位失敗。
- 既有資料不受影響：`observation_note` 預設為 `null`，且 `portion_weight` 欄位型別維持不變。

## 2026-04-13

- `ux(new-inspection):` removed the extra pre-store-selection notice card
  - the page no longer shows a large standalone prompt card above the form
  - store selection still behaves the same, but the fill area is cleaner
  - restored clean Chinese copy for the new inspection page header

- `ux(workstations):` simplified workstation setup
  - workstation code is no longer a primary input on the settings page
  - users now fill only workstation name and area
  - the page explains that system code is auto-generated
  - existing workstations keep code as read-only internal metadata
  - workstation page copy was rewritten into clean Chinese
  - backend workstation input now accepts empty code and generates one automatically

- `ux(mobile-nav):` reduced the sticky category navigation footprint on the new inspection page
  - smaller title size on mobile
  - compact action buttons on small screens
  - category chips use smaller padding and text
  - helper copy hidden on mobile to preserve fill area
  - sticky block padding tightened for better phone usability

- `fix(detail-report-copy):` cleaned remaining mojibake on the inspection detail page
  - fixed summary labels
  - fixed "back to history" action text
  - fixed "export CSV" action text
  - fixed "edit report" action text

## 維護規則

- 每次有實際功能修改、行為調整、修 bug、資料流程更新或部署相關變更，都要同步追加到這份 `CHANGELOG.md`。
- 記錄至少包含：
  - 日期
  - commit
  - 變更重點
  - 是否需要 migration / 部署注意事項

## 2026-04-13

### 巡店表單手機體驗與文案修正
- `b92ba8d` `feat: improve inspection form mobile workflow`
  - 新增巡店表單改為更手機友善的操作節奏。
  - 題目評分選 `A` 時，預設收合備註與照片欄位；選 `B / C` 時才展開補充欄位。
  - 若題目已經有備註或照片，切回 `A` 時不會自動清除既有內容。
  - 分類區塊改成更適合手機的導覽與收合節奏，預設只打開最需要先填的分類。
  - 分類導航改成可橫向滑動的樣式，降低小螢幕的擁擠感。
  - 評分按鈕、照片上傳區與題目卡片 spacing 重新調整，讓手機瀏覽更緊湊。
  - 修正載入草稿確認視窗的中文亂碼，訊息統一為：
    - `發現這個店別與日期已有草稿，是否要接著載入並繼續填寫？`
  - 新增區經理登入說明文件：
    - `MANAGER_LOGIN_GUIDE.md`

### 驗證
- `npm run build`
- `npm run test`

### 部署注意
- 已推送到 `origin/main`
- Zeabur 會依 GitHub 最新版本自動部署
## 2026-04-12

### 題目與標籤管理強化
- 題目管理新增「題目類別管理」區塊，現在可以建立與編輯題目類別，並調整排序與區域類型。
- 題目管理頁保留新增／編輯題目流程，並把類別管理整合進同一個工作台，方便一起維護。
- 標籤管理頁改成依題目類別分組顯示，並加入成功提示、統計摘要、月份與店別篩選保留。

### 通知中心 v1
- 新增 `NOTIFICATION_SPEC.md`，定義站內通知第一版規則與後續擴充方向。
- 新增 `/notifications` 通知中心頁，提供高 / 中 / 低優先級提醒摘要。
- 首頁 dashboard 加入通知摘要卡，讓 owner / manager / leader 都能先看到本月重點提醒。
- 通知規則第一版涵蓋：
  - 必查項目出現 C
  - 客訴項目出現 C
  - 整體巡店總評為 C
  - 本月加強項目低分
  - 連續低分
  - 待改善任務累積
  - 本月尚未巡店提醒

### 驗證
- `npm run test`
- `npm run build`

### 通知中心與管理面回歸補強
- 通知中心頁改成高 / 中 / 低優先級分組顯示，並加入「先處理這一則」摘要區塊。
- 題目管理補上類別管理與題目編輯區塊的穩定測試定位點。
- Playwright 已登入測試新增 owner / leader 通知中心驗證，並補強題目管理與標籤管理頁的 smoke coverage。

## 2026-04-11

### 導覽與工作站設定體驗調整
- 導覽列重新分成：
  - `巡檢業務`
  - `組員與題目`
  - `其他設定`
- `工作站設定` 改放到 `組員與題目` 群組，和 `組員管理` 靠在一起，不再獨立掛在系統管理裡顯得突兀。
- `標籤管理` 也改放到 `組員與題目` 群組，和 `題目管理` 更靠近，降低使用者找設定時的跳躍感。
- 工作站代碼改為可留白，系統會自動產生內部識別碼，避免新增工作站時還要先想代碼。
- 工作站設定頁補上更白話的區域說明與範例，幫助使用者判斷炸台、飲料台、點餐台這類站位應屬於哪個區域。

### 題目管理工作台升級
- 題目管理頁新增「新增題目」流程，建立時必須先選類別，再決定是「基礎題目」或「店別加題」。
- 新增題目支援直接指定適用店別，讓「二店才有」或「特定幾店才有」的題目可以在建立當下就設定完成。
- 題目管理頁改成依類別分組顯示：
  - 基礎題目獨立成一區
  - 店別加題獨立成一區
  - 店別加題再搭配店別切換，避免所有題目混成一長串
- 新增「編輯既有題目」區塊，可直接修改：
  - 題目名稱
  - 類別
  - 啟用狀態
  - 基礎題目 / 店別加題
  - 店別加題適用範圍
- 題目範圍設定維持和標籤系統分開：
  - 標籤系統負責「重要性 / 注意力」
  - 店別加題負責「哪些店會看到這一題」
- 新增題目、更新題目、題目停用、店別加題範圍更新都會寫入 audit log。

### 驗證
- `npm run test`
- `npm run build`

## 2026-04-11

### 標籤摘要與管理頁驗證補強
- 改善追蹤卡片現在會顯示 `必查項目`、`本月加強`、`客訴項目` 等標籤 badge
- 首頁待改善清單同步補上標籤語義，讓 owner / manager / leader 都能更快判斷風險來源
- 標籤管理、組員管理、QA 測試資料清理頁都補上穩定的 `data-testid`
- 帳號管理、店別管理、題目管理頁也補上 read-only 驗證用 `data-testid`
- 新增 Playwright `settings-workspaces.spec.ts`
  - owner 可開啟標籤管理頁
  - owner 可開啟組員管理頁
  - owner 可預覽 QA 測試資料清理頁，不會真的執行刪除
  - owner 可開啟帳號管理、店別管理、題目管理頁
- 調整新增巡店頁的預設店別策略：owner / manager 首次進入不再預設帶入一店，而是先選擇店別，避免一進頁就頻繁跳出舊草稿提示

### 驗證
- `npm run test`
- `npm run build`
- `npx playwright test --list`

## 2026-04-11

### 核心流程 E2E 補強
- 新增 Playwright `inspection-flow.spec.ts`
- 補上 owner 的巡店建立、明細查看、編輯與改善任務流轉測試腳本
- 在巡店表單、巡店歷史、巡店明細、改善追蹤頁補上穩定的 `data-testid`
- `npx playwright test --list` 現在可列出 9 個測試
- `e2e/README.md` 已補上新的覆蓋範圍說明

### QA 測試資料清理機制
- 新增 owner 專用頁面 `/settings/qa-cleanup`
- 可預覽目前會被清理的 QA 店別、帳號、組員、巡店紀錄與店別標籤
- 新增安全確認後的一鍵清理流程，會同步移除 QA 巡店照片與對應資料
- 清理完成後保留 audit log，方便之後追蹤誰在什麼時間做過清理

### 維護性整理
- 重寫全站 `AppShell` 導覽文字與分組，補上 `QA 清理` 入口
- 重寫 `ui-labels.ts`，清理角色、職位、標籤、audit 文案與細節格式

### 驗證
- `npm run test` 通過
- `npm run build` 通過


Stores Checking System 的開發、部署、驗證與修復紀錄。

## 2026-04-11

### A / B / C 評級規則與顯示
- 新增 `SCORING_GRADING_SPEC.md`，整理 `3 分 = A / 2 分 = B / 1 分 = C` 的規則與後續實作階段。
- 新增 `src/lib/grading.ts`
  - 單題分數轉換為 `A / B / C`
  - 分類平均評級
  - 全店總評與標籤降級規則
- 新增 `src/lib/grading.test.ts`，覆蓋評級 helper 的主要邏輯。
- 巡店紀錄頁改成顯示：
  - 本月整體評級
  - A / B / C 巡店數
  - 每筆巡店的總評等級
- 巡店明細頁改成顯示：
  - 總評等級
  - 分類評級
  - 單題評級
  - 總評調整原因
  - 巡店人優先顯示姓名，無姓名時才 fallback email

### 驗證
- `npm run test` 通過
- `npm run build` 通過

### Dashboard / 報表 A / B / C 升級
- 首頁 dashboard 改成以 `A / B / C` 為主語言，不再只強調抽象平均分數。
- owner / manager 首頁現在會顯示：
  - 本月總評
  - 各分類健康度
  - 弱勢店別
  - 最近巡店
- leader 首頁現在會顯示：
  - 本店總評
  - 最弱分類
  - 待改善任務
  - 最近巡店
- 巡店月報改成顯示：
  - 本月整體評級
  - A / B / C 巡店數
  - 各大項分類表現
  - 店別總評拆解
  - 低分題目排行
- 月報 CSV 匯出同步升級，新增：
  - 整體評級
  - 分類拆解
  - 店別總評

### 標籤統計與 E2E 擴充
- 首頁與月報加入標籤異常摘要：
  - 必查異常
  - 本月加強異常
  - 客訴項目異常
- 月報資料模型與 CSV 匯出同步帶出標籤異常數。
- Playwright 已登入測試擴充為：
  - owner dashboard 驗證
  - owner reports 驗證
  - leader dashboard 驗證
  - leader reports 驗證
  - leader 受限頁面阻擋驗證

Stores Checking System 的部署、修復與產品體驗調整紀錄。

## 2026-04-11

### 題目標籤系統升級
- 將原本的「永久重點 / 每月重點」升級成可擴充的題目標籤系統：
  - 必查項目
  - 本月加強
  - 客訴項目
- 題目標籤管理頁支援店別範圍：
  - 必查項目固定為全店通用
  - 本月加強與客訴項目可套用到全部店別或指定單店
- 資料模型預留客訴自動標記來源：
  - 新增 `focus_source`
  - `complaint_sync` 可供未來客訴資料庫同步使用
- 巡店表單與巡店明細頁現在會顯示不同標籤 badge
- 只要題目被任何標籤標記，巡店表單預設分數就不會直接帶 3 分，而是維持空白等待人工確認

### UI / UX 優化
- 重整全站導覽列：
  - 以「巡檢業務」與「系統管理」兩組分開顯示
  - 品牌名稱可直接返回首頁
  - 首頁不再孤立地排在導覽列最後方
- 升級新增巡店表單：
  - 新增 sticky 分類快速導航
  - 新增填寫進度條與分類完成度
  - 各分類支援收合 / 展開
  - 新增瀏覽器草稿儲存狀態提示
  - 長頁面卡片改為更穩定的實心背景，降低長頁面閱讀負擔
- 升級巡店明細頁：
  - 評分項目改為依分類分組呈現
  - 各分類支援收合 / 展開
  - 新增「只看需關注 / 有備註 / 有照片」檢視切換
  - 巡店人改為優先顯示姓名，姓名為空時才 fallback email

### 驗證
- `npm run build` 通過
- `npm run test` 通過

## 2026-04-11

### 工作站與排班邏輯
- 新增 migration：`20260411_000008_workstations_and_shift_assignment.sql`
  - 建立 `workstations` 資料表
  - 預設建立三個通用工作站：`內場 / 外場 / 櫃台`
  - `staff_members` 新增 `default_workstation_id`
  - `inspection_staff` 新增 `workstation_id`
- 新增 [工作站管理](/src/app/(protected)/settings/workstations/page.tsx)
  - 可在後台新增、編輯、啟用或停用工作站
  - 支援全部店通用與指定店別兩種範圍
- 調整組員管理
  - 組員不再被固定綁定單一站位
  - 可選填「常用工作站」作為預設建議值
- 調整巡店表單
  - 勾選組員後，需為當次巡店指定工作站
  - 同一位組員每次巡店都可被派到不同工作站
- 調整巡店明細與 CSV
  - 以「當班工作站」與「區域分類」取代原本固定職位顯示
- 修正巡店草稿相容性
  - 舊版草稿在載入時會自動轉成新版工作站格式
  - 避免按下「載入草稿」後因舊資料結構不一致造成白屏

## 2026-04-10

### 正式上線與部署
- 正式站上線：`https://stores-checking-system.zeabur.app`
- 部署平台：Zeabur
- Google OAuth 已由 Testing 發布到 Production

### 關鍵修復
- `428bdac` `fix: stabilize inspection form focus item queries`
  - 修正 `/inspection/new` 在抓取 focus items 時容易因條件查詢不穩而失敗的問題
- `c1af5d1` `feat: add store management and restore store names`
  - 新增店別管理頁
  - 正式恢復店名為 `1店 / 2店 / 3店 / 4店`
- `1d48493` `fix: move inspection mutations to server actions`
  - 修正把 server function 直接傳進 client component 所造成的錯誤
- `df673d6` `fix: handle read-only cookie context in server supabase client`
  - 修正舊 auth cookie 在 server render 時造成 crash 的問題
- `20b2eac` `fix: address qa findings across history and settings`
  - 修正多項 QA 回報，包括巡店列表欄位顯示、批次評分、帳號停用確認、toast 提示、首頁最小 dashboard
- `7d44d81` `fix: allow restoring archived staff members`
  - 組員封存後可恢復在職
- `741cfeb` `fix: prevent inspection form crash on store switch`
  - 修正切換店別後因 score state 缺漏而造成的 client crash
- `f6c918f` `fix: refine leader access messaging and navigation`
  - forbidden 區分未授權與權限不足
  - 首頁與其他頁面共用同一套 shell
  - 補上登出按鈕
  - leader 在改善追蹤頁只可查看，不可調整任務狀態
- `80c8d27` `fix: rebalance leader dashboard layout`
  - 讓 leader 首頁從不平衡雙欄改為更穩定的單欄工作流
- `c90e837` `feat: add role-based operations dashboard`
  - owner / manager 與 leader 首頁差異化
- `6badb89` `test: add playwright smoke coverage`
  - 補上第一版 Playwright smoke tests
- `6e8cb16` `feat: expand leader workspace and auth test setup`
  - 補強 leader 工作台
  - 加入 Playwright storage state 產生流程

### 資料更新
- 執行 `20260410_000006_fix_store_names.sql`
  - 將 `stores` 內容修正為：
    - `store_1 -> 1店`
    - `store_2 -> 2店`
    - `store_3 -> 3店`
    - `store_4 -> 4店`

### QA 與回歸
- 三輪 QA 回歸累計修復 14 個問題
- leader 視角的權限、導覽與首頁體驗完成第一輪調整

## 2026-04-12

### 巡店報告摘要與通知強化
- `待提交` 巡店完成後，表單送出會直接導向該筆巡店明細頁，讓巡店人第一時間看到報告。
- `待提交` 通知中心新增「巡店報告已更新」通知，店長進入首頁或通知中心時，可直接打開自己店別最新的巡店報告。
- `待提交` 巡店明細頁上方新增「本次報告重點」，直接顯示各分類等級、A/B/C 題數，以及 B / C 項目總整理。
- `待提交` 若某個分類全部都是 A，明細頁會顯示鼓勵訊息，幫使用者快速判斷哪一塊目前穩定。

## 2026-04-09

### 認證與部署關鍵修復
- `7149549` `fix: inline public supabase env access`
  - 修正 `NEXT_PUBLIC_*` 使用動態 `process.env[name]` 導致 client bundle 取不到值
- `e80818e` `fix: use site url for oauth callback redirects`
  - 修正 OAuth callback 不再錯誤導向 `0.0.0.0:8080`
- `fbbedc9` `fix: harden google oauth redirect flow`
  - 補強登入按鈕流程與錯誤回饋
- `e91c002` `fix: use custom docker deployment for zeabur`
  - 以 repo 內 Dockerfile 取代 Zeabur buildpack，避開 `npm update -g npm` 問題
- `83a1336` `chore: add public directory for docker deploy`
  - 讓 Docker deploy 與 Next standalone 更穩定

### 文件與交付
- 補齊：
  - `DEPLOYMENT.md`
  - `GO_LIVE_CHECKLIST.md`
  - `PRODUCTION_HANDOFF_TEMPLATE.md`
  - `RELEASE_NOTES.md`

## 2026-04-08

### 初版系統落地
- 完成 Next.js + Supabase + Tailwind 專案基礎
- 完成 Google OAuth、角色授權與受保護路由
- 完成：
  - 帳號管理
  - 組員管理
  - 題目管理
  - 重點項目管理
  - 新增巡店 / 巡店歷史 / 明細 / 編輯
  - 改善追蹤
  - 報表分析
  - audit log
- 完成 seed、migration、RLS、照片上傳、CSV 匯出
- 建立回顧與經驗文件：
  - `IMPLEMENTATION_RETROSPECTIVE.md`
  - `VIBE_CODING_PLAYBOOK.md`
