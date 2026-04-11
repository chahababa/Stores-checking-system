# Changelog

## 2026-04-11

### 標籤摘要與管理頁驗證補強
- 改善追蹤卡片現在會顯示 `必查項目`、`本月加強`、`客訴項目` 等標籤 badge
- 首頁待改善清單同步補上標籤語義，讓 owner / manager / leader 都能更快判斷風險來源
- 標籤管理、組員管理、QA 測試資料清理頁都補上穩定的 `data-testid`
- 新增 Playwright `settings-workspaces.spec.ts`
  - owner 可開啟標籤管理頁
  - owner 可開啟組員管理頁
  - owner 可預覽 QA 測試資料清理頁，不會真的執行刪除

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
