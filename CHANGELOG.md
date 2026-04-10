# Changelog

Stores Checking System 的部署、修復與驗證紀錄。

## 2026-04-10

### 正式站

- 網址：`https://stores-checking-system.zeabur.app`
- 平台：Zeabur
- OAuth：Google Cloud OAuth consent screen 已從 Testing 發布到 Production

### 已部署與驗證的重點 commits

| Commit | Message | 結果 |
| --- | --- | --- |
| `428bdac` | `fix: stabilize inspection form focus item queries` | 修正 `/inspection/new` 的 focus item 查詢策略 |
| `c1af5d1` | `feat: add store management and restore store names` | 新增店別管理頁，並將店名恢復為 `1店 ~ 4店` |
| `1d48493` | `fix: move inspection mutations to server actions` | 修正 `/inspection/new` 與巡店編輯頁的 Server Action 邊界問題 |
| `df673d6` | `fix: handle read-only cookie context in server supabase client` | 修正舊 auth cookie 造成的首頁 crash |
| `9f46c9d` | `docs: add CHANGELOG for 2026-04-10 deployment session` | 建立 changelog 初版 |
| `ec87695` | `docs: clean deployment changelog` | 整理 changelog 結構與內容 |
| `20b2eac` | `fix: address qa findings across history and settings` | 修正 QA 第一輪回報的 10 個問題 |

### 已執行 migration

- `20260410_000006_fix_store_names.sql`
  - 將既有 `stores` 資料修正為：
    - `store_1 -> 1店`
    - `store_2 -> 2店`
    - `store_3 -> 3店`
    - `store_4 -> 4店`
  - 類型：資料更新
  - 備註：不涉及 schema 變更

### 已修復的重要問題

#### `/inspection/new` 報錯，Digest `556599903`

- 根因：
  - 一般 server function 被直接傳進 Client Component
- 修復：
  - 新增 `src/lib/inspection-actions.ts`
  - 改以 `"use server"` 明確暴露 mutation actions
- 對應 commit：
  - `1d48493`

#### `/inspection/new` 的 focus item 查詢不穩

- 根因：
  - 原本使用脆弱的複合 `.or(...)` 條件查詢 `focus_items`
- 修復：
  - 改成獨立查詢 `permanent` 與 `monthly`
  - 再於程式內合併
- 對應 commit：
  - `428bdac`

#### 舊 auth cookie 造成首頁 crash，Digest `3211860576`

- 根因：
  - Supabase SSR 在 Server Component render 期間 refresh token
  - `cookieStore.set()` 在唯讀 cookie context 中拋錯
- 修復：
  - 在 `src/lib/supabase/server.ts` 的 `setAll` 外包 `try/catch`
  - 讓 middleware 在下一次 request 處理 refresh
- 對應 commit：
  - `df673d6`

#### 店別名稱與需求不一致

- 修復：
  - 新增店別管理頁
  - seed 改為 `1店 ~ 4店`
  - 補上資料修正 migration
- 對應 commit：
  - `c1af5d1`

### QA 第一輪回報後的修復

以下問題已在 `20b2eac` 修復：

1. 巡店紀錄列表缺少店別顯示
2. 巡店紀錄列表缺少巡檢人顯示
3. 組員管理顯示「未指定店別」
4. 新增巡店缺少批次評分
5. 職位名稱不一致
6. 操作紀錄內容過於技術化
7. 帳號停用缺少確認提示
8. 組員管理文案偏開發術語
9. 缺少成功提示
10. 缺少首頁 / 儀表板

#### 該輪修復重點

- `/inspection/history`
  - 補回店別與巡檢人 relation mapping
- `/settings/staff`
  - 補回正確店別顯示
  - 文案改為使用者導向
  - 成功操作加入 toast
- `/inspection/new`
  - 新增 `全部設為 3 分`
  - 新增 `重設評分`
- `/settings/users`
  - 停用帳號前加入確認提示
  - 成功操作加入 toast
- `/audit`
  - 將 details 轉為人類可讀格式
- `/`
  - 新增最小可用 dashboard

### QA 第二輪回歸追加修復

以下問題在本輪修復：

11. 封存組員後無法解封

#### 修復內容

- `src/lib/settings.ts`
  - 新增 `restoreStaffMember()`
- `/settings/staff`
  - 封存組員旁新增 `恢復在職` 按鈕
  - 成功後顯示成功提示
- `src/lib/ui-labels.ts`
  - 新增 `restore_staff_member` audit label

#### 影響範圍

- 僅程式碼修正
- 不涉及 schema 或 migration 變更

### 驗證狀態

本日已確認可正常使用的頁面包含：

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
