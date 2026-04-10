# Changelog

Stores Checking System 的部署、修復與 QA 驗證紀錄。

## 2026-04-10

### 部署摘要
- 正式網址：`https://stores-checking-system.zeabur.app`
- 部署平台：Zeabur
- Google OAuth 已從 Testing 發布到 Production

### 已驗證的重要修復

| Commit | Message | 說明 |
| --- | --- | --- |
| `428bdac` | `fix: stabilize inspection form focus item queries` | 修正 `/inspection/new` 讀取 focus items 時的查詢不穩定問題 |
| `c1af5d1` | `feat: add store management and restore store names` | 新增店別管理並將店名修正為 `1店` 到 `4店` |
| `1d48493` | `fix: move inspection mutations to server actions` | 修正 `/inspection/new` 與編輯頁傳遞 server function 給 client component 的錯誤 |
| `df673d6` | `fix: handle read-only cookie context in server supabase client` | 修正舊 auth cookie 導致 server render crash 的問題 |
| `20b2eac` | `fix: address qa findings across history and settings` | 修正第一輪 QA 回歸的 10 項問題 |
| `7d44d81` | `fix: allow restoring archived staff members` | 讓封存組員可恢復在職 |
| `ec87695` | `docs: clean deployment changelog` | 清理與重整 deployment changelog |

### 執行過的 migration
- `20260410_000006_fix_store_names.sql`
  - 將 `stores` 表中的正式店名更新為：
    - `store_1 -> 1店`
    - `store_2 -> 2店`
    - `store_3 -> 3店`
    - `store_4 -> 4店`

### 重要問題與修法

#### `/inspection/new` server-side 例外，Digest `556599903`
- 根因：
  - 將未標記為 server action 的函式直接傳給 client component
- 修法：
  - 新增 `src/lib/inspection-actions.ts`
  - 將 mutation 改由 `"use server"` 的 action 檔案提供
- 對應 commit：
  - `1d48493`

#### `/inspection/new` focus items 查詢不穩定
- 根因：
  - 以脆弱的 `.or(...)` 條件讀取 `focus_items`
- 修法：
  - 分開查詢 `permanent` 與 `monthly`，再在程式內合併
- 對應 commit：
  - `428bdac`

#### 舊 auth cookie 造成整頁 crash，Digest `3211860576`
- 根因：
  - Server Component render 期間，Supabase SSR 嘗試 refresh token 並寫入唯讀 cookie context
- 修法：
  - 在 `src/lib/supabase/server.ts` 的 `setAll` 中加入 `try/catch`
  - 讓下一次 request 由 middleware 完成真正的 refresh
- 對應 commit：
  - `df673d6`

#### 店名內容偏離規格
- 根因：
  - 早期 seed / 修正過程中，正式店名未維持在 `1店` 到 `4店`
- 修法：
  - 新增店別管理頁
  - 修正 seed 與正式資料內容
  - 執行專用 migration 同步正式資料
- 對應 commit：
  - `c1af5d1`

### 第一輪 QA 回歸修復
以下問題已由 `20b2eac` 修正：
1. 巡店紀錄列表店別顯示為 `-`
2. 巡店紀錄列表巡檢人顯示為 `-`
3. 組員管理新增後店別顯示錯誤
4. 新增巡店缺少批次評分
5. 職位名稱不一致
6. audit details 過度技術化
7. 停用帳號缺少確認
8. 缺少成功 toast
9. 缺少首頁儀表板

### 第二輪 QA 回歸修復
以下問題已由 `7d44d81` 修正：
1. 封存組員後無法恢復在職

### 第三輪 QA 回歸修復
以下問題已修正：
1. `/inspection/new` 切換到其他店別時，因舊表單 state 與新 seed 暫時不一致而觸發 client-side crash
   - 修法：
     - 讓 `InspectionForm` 在店別或日期變更時以 `key` 重新掛載
     - 渲染評分項目時，對缺漏的 score state 提供 fallback，避免讀取 `undefined.isFocusItem`
2. `/audit` 對象欄位的 `inspection` 統一顯示為 `巡店紀錄`

### 角色首頁調整
1. 首頁改為真正的角色化 dashboard
   - owner / manager 看到跨店營運總覽、近期巡店與店別概況
   - leader 看到單店工作台、本店待辦與單店快捷入口
2. leader 若未綁定店別，首頁會導向 `/pending`
   - 避免在角色資料不完整時誤看到跨店資訊

### 自動化 UI / E2E 測試基礎
1. 導入 Playwright
2. 新增公開 smoke tests
   - 登入頁是否可開啟
   - 未登入使用者進入受保護頁面時是否會被導回登入頁
3. 新增可選的 authenticated dashboard 測試
   - owner dashboard 可見項目
   - leader dashboard 與受限導航
4. 補上 `e2e/README.md`，說明如何在本地或正式站執行測試

### 正式站驗證
目前已驗證可正常使用的主要頁面：
- `/login`
- `/`
- `/inspection/history`
- `/inspection/new`
- `/inspection/improvements`
- `/inspection/reports`
- `/audit`
- `/settings/stores`
- `/settings/staff`
- `/settings/users`

### 後續紀錄方式
之後若再有新的部署、migration、OAuth 設定或 QA 修復，請追加：
- 問題現象
- 根因
- 修法
- commit
- 驗證結果
