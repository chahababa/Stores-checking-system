# Changelog

Stores Checking System 的部署、修復與營運紀錄。

建議之後每次部署都追加：
- 日期
- commit
- 部署結果
- migration
- 重要 bug 與根因
- 驗證結果

## 2026-04-10

### 正式站資訊

- 網址：`https://stores-checking-system.zeabur.app`
- 平台：Zeabur
- OAuth：Google Cloud OAuth consent screen 已從 Testing 發布到 Production

### 今日已驗證的重要 commits

| Commit | Message | 結果 |
| --- | --- | --- |
| `428bdac` | `fix: stabilize inspection form focus item queries` | 修正 `/inspection/new` 的 focus item 查詢策略 |
| `c1af5d1` | `feat: add store management and restore store names` | 新增店別管理頁並恢復店名為 `1店 ~ 4店` |
| `1d48493` | `fix: move inspection mutations to server actions` | 修正 `/inspection/new` 與巡店編輯頁的 Server Action 邊界問題 |
| `df673d6` | `fix: handle read-only cookie context in server supabase client` | 修正舊 auth cookie 造成的首頁 crash |
| `9f46c9d` | `docs: add CHANGELOG for 2026-04-10 deployment session` | 建立 changelog 初版 |
| `ec87695` | `docs: clean deployment changelog` | 整理 changelog 結構與內容 |

### 今日執行的 migration

- `20260410_000006_fix_store_names.sql`
  - 將既有 `stores` 資料修正為：
    - `store_1 -> 1店`
    - `store_2 -> 2店`
    - `store_3 -> 3店`
    - `store_4 -> 4店`
  - 類型：資料更新
  - 備註：不涉及 schema 變更

### 今日已確認修復的主要問題

#### 1. `/inspection/new` 報錯，Digest `556599903`

- 症狀：
  - 進入「新增巡店」頁時出現 application error
- 根因：
  - 一般 server function 被直接當成 prop 傳進 Client Component
  - Next.js 拋出 `Functions cannot be passed directly to Client Components`
- 修復：
  - 新增 `src/lib/inspection-actions.ts`
  - 以 `"use server"` 明確暴露巡店 mutation actions
- 對應 commit：
  - `1d48493`

#### 2. `/inspection/new` 的 focus item 查詢不穩

- 症狀：
  - 巡店表單 seed 組裝在正式環境不穩
- 根因：
  - 原本使用脆弱的複合 `.or(...)` 條件查詢 `focus_items`
- 修復：
  - 改成獨立查詢 `permanent` 與 `monthly`
  - 再於程式內合併
- 對應 commit：
  - `428bdac`

#### 3. 舊 auth cookie 造成首頁 crash，Digest `3211860576`

- 症狀：
  - 使用者帶著舊 auth cookie 進站時，首頁可能 crash
- 根因：
  - Supabase SSR 在 Server Component render 期間嘗試 refresh token
  - `cookieStore.set()` 在唯讀 cookie context 中拋錯
- 修復：
  - 在 `src/lib/supabase/server.ts` 的 `setAll` 外包 `try/catch`
  - 讓 middleware 在下一次 request 處理 refresh
- 對應 commit：
  - `df673d6`

#### 4. 店別名稱與需求不一致

- 症狀：
  - 原始需求是 `1店 ~ 4店`
  - 實際資料曾使用其他命名
- 修復：
  - 新增店別管理頁
  - seed 改為 `1店 ~ 4店`
  - 補上資料修正 migration
- 對應 commit：
  - `c1af5d1`

### QA 回報後，本日追加修復

以下問題已依 QA 優先順序處理：

#### 5. 巡店紀錄列表缺少店別與巡檢人

- 問題：
  - `/inspection/history` 的店別與巡檢人欄位顯示 `-`
- 根因：
  - relation mapping 把單筆關聯資料當成陣列讀取
- 修復：
  - 修正 history page 的 relation 取值邏輯
  - 巡檢人顯示改為 `名稱 -> email -> -` 的 fallback

#### 6. 組員管理的店別顯示為「未指定店別」

- 問題：
  - `/settings/staff` 新增組員時雖有選店別，列表仍顯示未指定
- 根因：
  - relation mapping 同樣把 store 關聯當成陣列讀取
- 修復：
  - 修正 staff page 的 store relation 取值邏輯

#### 7. 新增巡店缺少批次評分

- 問題：
  - 44 個項目逐一點擊過於耗時
- 修復：
  - 在巡店表單新增：
    - `全部設為 3 分`
    - `重設評分`

#### 8. 職位名稱不一致

- 問題：
  - 有些地方顯示「內場」，有些顯示「廚房」
- 修復：
  - 統一為「內場」

#### 9. 操作紀錄內容難以閱讀

- 問題：
  - `/audit` 顯示原始 JSON 與 UUID
- 修復：
  - 新增人類可讀的 audit details formatter
  - 優先將帳號、店別、組員、巡店、重點項目等常見操作轉為可讀描述

#### 10. 帳號停用缺少確認提示

- 問題：
  - `/settings/users` 點擊停用後直接執行
- 修復：
  - 新增確認對話框

#### 11. 組員管理文案偏開發語言

- 問題：
  - `/settings/staff` 使用 `MVP / active / archived` 類開發術語
- 修復：
  - 調整成使用者導向文案，例如「在職 / 已封存」

#### 12. 缺少成功提示

- 問題：
  - 新增帳號、新增組員等動作完成後缺少清楚回饋
- 修復：
  - 新增頁面級 success toast
  - 目前已補在：
    - `/settings/users`
    - `/settings/staff`

#### 13. 缺少獨立首頁 / 儀表板

- 問題：
  - 登入後沒有營運摘要頁
- 修復：
  - 新增首頁 dashboard
  - 顯示：
    - 本月巡店次數
    - 本月平均分數
    - 待改善項目
    - 管理店數 / 目前店別
    - 常用功能入口

### 今日新增或調整的重要檔案

- `src/lib/inspection-actions.ts`
- `src/lib/supabase/server.ts`
- `src/app/(protected)/inspection/history/page.tsx`
- `src/app/(protected)/settings/staff/page.tsx`
- `src/app/(protected)/settings/users/page.tsx`
- `src/app/(protected)/audit/page.tsx`
- `src/components/inspection/inspection-form.tsx`
- `src/components/confirm-submit-button.tsx`
- `src/components/page-toast.tsx`
- `src/lib/ui-labels.ts`
- `src/app/page.tsx`

### 正式站驗證

今日已確認可正常使用的頁面包含：

- `/login`
- `/`
- `/inspection/history`
- `/inspection/new`
- `/inspection/improvements`
- `/inspection/reports`
- `/audit`
- `/settings/stores`

### 維護提醒

- 之後若再有部署、migration、OAuth、Zeabur 或 Supabase 相關異動，請直接在本檔案追加新日期區塊
- 若有重大故障，建議補上：
  - 症狀
  - 根因
  - 修復 commit
  - 驗證方式
