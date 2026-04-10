# Changelog

Stores Checking System 的部署、修復與營運紀錄。

建議之後每次部署都追加一段，至少記下：
- 日期
- commit
- 部署結果
- migration
- 重要 bug 與根因
- 是否完成驗證

## 2026-04-10

### 部署與驗證摘要

本日完成正式站部署修復、Google OAuth 上線、店別修正，以及巡店頁面穩定化。

正式站：
- `https://stores-checking-system.zeabur.app`

部署平台：
- Zeabur

### 已驗證的 GitHub commits

| Commit | Message | 狀態 |
| --- | --- | --- |
| `428bdac` | `fix: stabilize inspection form focus item queries` | 已部署；修正 `/inspection/new` 的 focus item 查詢策略 |
| `c1af5d1` | `feat: add store management and restore store names` | 已部署；新增店別管理頁並恢復店名為 `1店 ~ 4店` |
| `1d48493` | `fix: move inspection mutations to server actions` | 已部署；修正 `/inspection/new` 與編輯頁的 Server Action 邊界問題 |
| `df673d6` | `fix: handle read-only cookie context in server supabase client` | 已提交；修正唯讀 cookie context 導致的首頁 crash |
| `9f46c9d` | `docs: add CHANGELOG for 2026-04-10 deployment session` | 已提交；建立部署紀錄檔 |

### Supabase migrations

本日已確認執行：

- `20260410_000006_fix_store_names.sql`
  - 作用：把既有 `stores` 資料修正為：
    - `store_1 -> 1店`
    - `store_2 -> 2店`
    - `store_3 -> 3店`
    - `store_4 -> 4店`
  - 類型：資料更新
  - 備註：不涉及 schema 變更

### 重要問題與修復

#### 1. `/inspection/new` 報錯，Digest `556599903`

症狀：
- 進入「新增巡店」頁時，頁面直接顯示 Next.js application error

根因：
- `src/app/(protected)/inspection/new/page.tsx` 把 `createInspection` 直接傳給 Client Component
- `createInspection` 來自 `src/lib/inspection.ts`
- 該函式並不是可序列化的 Server Action
- Next.js 因此拋出：
  - `Functions cannot be passed directly to Client Components`

修復：
- 新增 [inspection-actions.ts](/c:/Users/User/Desktop/VibeCoding/Stores-checking-system/src/lib/inspection-actions.ts)
- 用 `"use server"` 暴露 mutation actions
- `new` 與 `edit` 頁都改成走 server action

對應 commit：
- `1d48493`

#### 2. `/inspection/new` 的 focus item 查詢不穩定

症狀：
- 巡店表單 seed 組裝過程在正式環境不穩

根因：
- 原本用單條複合 `.or(...)` 條件查 `focus_items`
- 在正式環境下這類條件字串容易脆弱，排查成本高

修復：
- 改成兩條獨立 query：
  - `permanent`
  - `monthly`
- 再於程式內合併結果

對應 commit：
- `428bdac`

#### 3. 舊 auth cookie 導致首頁 crash，Digest `3211860576`

症狀：
- 使用者帶著舊的 auth cookie 重新進站時，首頁可能直接 crash

根因：
- Supabase SSR client 在 Server Component render 期間嘗試 refresh token
- `cookieStore.set()` 在唯讀 cookie context 中拋錯

修復：
- 在 [server.ts](/c:/Users/User/Desktop/VibeCoding/Stores-checking-system/src/lib/supabase/server.ts) 的 `setAll` 包上 `try/catch`
- 寫 cookie 失敗時不讓整頁 crash
- 改由 middleware 在下一次 request 處理 session refresh

對應 commit：
- `df673d6`

#### 4. 店別名稱與原始規格不一致

症狀：
- 原始需求應為 `1店 ~ 4店`
- 先前資料曾被寫成其他命名

修復：
- 新增店別管理頁
- seed 改為 `1店 ~ 4店`
- 加入資料修正 migration

對應 commit：
- `c1af5d1`

### Google OAuth

Google Cloud OAuth consent screen 已從 Testing 發布到 Production。

結果：
- 不再限制測試使用者
- 所有 Google 帳號都可登入

### 正式站驗證

本日已確認可正常使用的頁面：

- `/login`
- `/inspection/history`
- `/inspection/new`
- `/inspection/improvements`
- `/inspection/reports`
- `/audit`
- `/settings/stores`

### 備註

- 後續若再有部署、migration、OAuth、Zeabur 或 Supabase 相關異動，請直接在本檔案追加新日期區塊
- 若有重大故障，建議在同一天的 changelog 下補上：
  - 症狀
  - 根因
  - 修復 commit
  - 驗證方式
