# Neo Brutalism UI 改版 — 進度交接文件

**最後更新**：2026-04-23（下午；補了 edit page、表單 NB、OAuth 根因）
**分支**：`ui/neo-brutalism`
**PR**：[#1](https://github.com/chahababa/Stores-checking-system/pull/1)（開放中，尚未合併）

---

## 這份文件的用途

讓 Matt（或任何接手的 Claude Code session）在**換電腦、或開新對話**後，可以快速掌握目前 Neo Brutalism 視覺改版的進度、已決定的事、下一步該做什麼，不用從頭讀歷史對話。

這份文件合併 PR 之前可以留著當 project history，也可以刪掉——兩者都 OK。

---

## 一、當前狀態

### 已完成（在 `ui/neo-brutalism` branch、已 push）

按時序列出 6 個 commit：

| Commit | 內容 |
|---|---|
| `3434a3d` | patch1：首頁 + 全域 Neo Brutalism 設計系統（tailwind config、globals.css v1、root layout、page.tsx） |
| `662e536` | 修 Zeabur build 失敗：同步 `package-lock.json`（用 Docker + node:20-bookworm-slim 重生） |
| `efbb619` | 加 `/preview` 假資料預覽路由（給 Matt 免登入看首頁新樣式用） |
| `6dda385` | 刪 `/preview`（Matt 已確認首頁喜歡） |
| `83c2064` | patch2：全站其他頁面套 Neo Brutalism（21 個檔：5 個 components + 1 個 protected layout + 14 個 protected pages + globals.css v2） |
| `c37401f` | 修 OAuth callback：用 `request.url.origin` 取代 `getSiteUrl()`（讓 preview / 正式 / localhost 全動態對應 redirect domain） |
| `67306d2` | 補 patch2 漏掉的 `inspection/history/[id]/edit` 頁 header 套 Neo Brutalism |
| `0546fdb` | `components/inspection/inspection-form.tsx` 全套 NB（input / select / textarea / 分數按鈕改等寬方塊 / 狀態 chip 等；logic、testid、payload 不變） |
| `aaec384` | 修 OAuth `0.0.0.0:8080` flash：callback route 改讀 `x-forwarded-host`，因為 Zeabur Docker 裡 `request.url.origin` 會解成內部 bind 位址 `http://0.0.0.0:8080` |

### 已驗證（都過）

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test`（vitest）✅ 20/20
- `npm run build`（Next.js 15.5.14）✅ 23/23 routes
- Zeabur preview build ✅（build log 乾淨無錯誤）

### 決定不做的事

- **跳過 patch2 的 `login` / `pending` / `forbidden` 3 個頁面**
  原因：patch2 README 自己寫的「若原檔有客製化請以原檔為準」建議
- **沒改 `lib/` / `app/api/`（除了 auth callback）/ middleware / Supabase schema / 測試 / seed**
- **沒動 `NEXT_PUBLIC_SITE_URL` env var 的值**
  原因：OAuth 修好後，程式碼不再讀這個 env var，值維持原樣也不影響

---

## 二、下一步：Matt 要做的事

### 1. 測試 preview OAuth 登入流程（最重要）

**為什麼**：patch2 + OAuth fix 推出後，需要在 preview 實測登入 + 每頁互動，避免有 click handler 壞掉的情況。

**怎麼做**：
1. 打開**無痕視窗** → `https://stores-checking-system-preview.zeabur.app`
2. 點 Google 登入，應該要**留在 preview domain**（不再跳回正式站）
3. 登入成功後會到 `/`，看全站 Neo Brutalism 新 UI
4. 按下列清單每頁都點開，確認沒有 console error、hydration warning、互動壞掉：
   - `/inspection/new`（評分按鈕、缺分提示）
   - `/inspection/history` + 點進某一筆
   - `/inspection/history/[id]/edit`
   - `/inspection/reports`
   - `/inspection/improvements`
   - `/notifications`
   - `/audit`
   - `/settings/users` / `staff` / `workstations` / `stores` / `focus-items` / `qa-cleanup`
   - `/settings/items`（**兩個分頁「題目 / 類別」都要看**）

### 2. 決定 merge 時機

看完沒問題後：
- **OK**：合併 PR #1 進 main → Zeabur 正式站自動 redeploy → 員工下次 reload 會看到新 UI
- **部分頁面要調**：不要直接 merge，回頭讓 Claude Design 改相應檔案、產 patch3、同樣流程套進 `ui/neo-brutalism`
- **要先公告員工**：合併前先通知他們「下次 reload 會看到新樣子」

### 3. 如果想移除 `docs/NEO_BRUTALISM_HANDOFF.md` 再 merge

這份文件可以留在 main 當專案紀錄，也可以在 merge PR 之前刪掉。看你偏好。

---

## 三、系統結構地圖

### GitHub

- Repo：https://github.com/chahababa/Stores-checking-system
- 分支：
  - `main` — 正式站用
  - `ui/neo-brutalism` — 這次改版用（含 6 個 commit，等 merge）
  - `design/neo-brutalism-dashboard` — 舊分支（只有首頁改版那批），保留當歷史

### Zeabur

- Project：Stores-checking-system
- Services：
  - `stores-checking-system`（正式站）
    - Branch：`main`
    - Domain：`https://stores-checking-system.zeabur.app`
    - **不要動**
  - `stores-checking-system-castge`（preview service，docker icon）
    - Branch：`ui/neo-brutalism`
    - Domain：`https://stores-checking-system-preview.zeabur.app`
    - 用來驗證新 UI
- 兩邊 service 都用 repo 的 `Dockerfile` build（node:20-bookworm-slim + `npm ci`）

### Supabase

- Auth → URL Configuration → Redirect URLs 白名單目前有 3 條：
  1. `https://stores-checking-system.zeabur.app/api/auth/callback`（正式站）
  2. `http://localhost:3000/api/auth/callback`（本機開發）
  3. `https://stores-checking-system-preview.zeabur.app/**`（preview，本次加的）
- Site URL：`https://stores-checking-system.zeabur.app`（不要動）

---

## 四、關鍵技術決策與踩過的坑

### A. 為什麼 Zeabur preview build 一度失敗（`@emnapi/core` 缺 lock entry）

**症狀**：`npm ci` 報 `Missing: @emnapi/core@1.9.1 from lock file`

**根因**：`node:20-bookworm-slim` 是 rolling tag。正式 service 的 docker layer 是幾個月前建立的（cached 舊 npm 版本），preview service 是第一次拉、拿到最新 npm 10.8.2，對 optional deps 更嚴格。同一個 lock file，舊 npm 不在意缺 `@emnapi/*`，新 npm 會 reject。

**解法**：本機跑 `docker run --rm -v ... node:20-bookworm-slim npm install --package-lock-only --ignore-scripts` 重生 lock file（commit `662e536`）。以後類似症狀也用這招。

**不是**：branch 的 `package.json` 改了沒同步 lock file（瀏覽器 AI 一開始這樣猜是錯的，已驗證兩個 branch 的 package.json 和 lock 在 main 上 byte-identical）。

### B. 為什麼 OAuth 登入會從 preview 跳回正式站

**症狀**：使用者在 preview 登入，Google 授權完 URL 變成 `stores-checking-system.zeabur.app/?code=...`。

**根因分兩層**：
1. **主因**（阻擋 callback 進入）：Supabase Dashboard 的 Redirect URLs 白名單沒包 preview domain，Supabase 直接 reject `redirectTo`，fallback 到 Site URL（正式站根路徑）+ `?code=` query
2. **潛藏次因**（即使修好主因還會爆）：`src/app/api/auth/callback/route.ts` 裡用 `getSiteUrl()` 讀 `NEXT_PUBLIC_SITE_URL`，preview service 的這個 env var 是從正式 service 複製過來的值（正式站 URL），所以 callback 跑完會把使用者 redirect 去正式站

**解法**：
1. 在 Supabase 加 `https://stores-checking-system-preview.zeabur.app/**` 到白名單 ✅（已做）
2. 改 `callback/route.ts` 全部 redirect 改用 `new URL(request.url).origin` 動態決定（commit `c37401f`）✅

**副作用**：`NEXT_PUBLIC_SITE_URL` 這個 env var 現在在程式碼裡沒任何地方讀（但 `env.ts` 的 validator 還會檢查它存在；保持現狀就好）。未來想徹底清掉可以另開 PR。

### B'. 後續：`c37401f` 的 `url.origin` 在 Zeabur Docker 上壞掉（commit `aaec384` 修）

**症狀**：在 preview 點 Google 登入 → Google 授權完成 → 瀏覽器瞬間變成 `https://0.0.0.0:8080/forbidden?reason=oauth`（連線被拒的 Chrome 錯誤頁）。看起來像 OAuth 爆了，但其實 Google 這端是成功的。

**根因**：Zeabur 用 Docker 跑 Next.js，容器內部把 server bind 在 `0.0.0.0:8080`。當 proxy 把外部請求轉進容器，Next.js 的 `request.url` 是容器內部看到的 URL（`http://0.0.0.0:8080/api/auth/callback?code=...`）。`new URL(request.url).origin` 直接變成 `http://0.0.0.0:8080` — 也就是 `c37401f` 那個「動態 origin」抓到的根本不是對外 domain，而是內部 bind 位址。

所以成功時 redirect 到 `http://0.0.0.0:8080/`、失敗時 redirect 到 `http://0.0.0.0:8080/forbidden?reason=oauth`、沒 code 時 redirect 到 `http://0.0.0.0:8080/login` — 全都會 404 / connection refused。

**踩坑過程**（花了一兩小時才定位）：
- 先懷疑 `NEXT_PUBLIC_SUPABASE_URL` env var 設錯 → 實際是對的
- 再懷疑 Supabase Site URL 設成 `0.0.0.0` → 實際是對的
- 再懷疑 Supabase Redirect URLs 白名單有 `0.0.0.0` → 沒有
- 再懷疑 Google OAuth Console 有 `0.0.0.0` → 沒有
- 再懷疑 IE Tab 這類擴充在 local proxy → 刪了還是一樣
- 直接用 JS 構造 PKCE auth URL 觸發 → URL bar 停在 `https://0.0.0.0:8080/forbidden?reason=oauth`，path 明顯是**我們自己 app 的錯誤頁**，才確認是 app 這端 redirect 目標錯了

**解法**：`callback/route.ts` 改成優先讀 `x-forwarded-proto` + `x-forwarded-host`（Zeabur proxy 會塞），退回 `Host` header，最後才 fallback 到 `url.origin`。這樣 Docker bind 位址就完全碰不到。本機 `localhost:3000` 因為 Host header 會是 `localhost:3000`，也能正常走。

**How to apply**：未來任何在 Next.js App Router 寫 route handler、需要構造外部 redirect URL 的地方都要記得：Docker 後面的 `new URL(request.url).origin` 不可信，要讀 forwarded headers。不只這個 callback，`api/reports/` 或未來任何 redirect 場景都適用。

### C. 為什麼 patch1 的 `globals.css` 被 patch2 覆蓋是 byte-different

patch1 的 `globals.css` 是 v1（只有首頁用的 utility），patch2 的 `globals.css` 是 v2（多了 `nb-tab` / `nb-details` / `nb-stat` / `nb-check-card` / `nb-help` 等給其他頁面用的 utility）。patch2 README 明確說會覆蓋 v1。這是設計 intended。

### D. 為什麼 Zeabur 沒有 branch preview / PR preview 功能

Zeabur 目前 UI 沒有「自動為每個 branch / PR 開 preview 環境」這個選項。要 preview 只能**另開一個 service** 指向那個 branch（我們就是這樣做的——`stores-checking-system-castge`）。未來要 preview 其他 branch，有兩條路：
1. 在那個 preview service 的 Settings → Source → Branch 切過去（這次就這樣做）
2. 再開一個新的 preview service 專屬那個 branch（env vars 重設一次）

---

## 五、換電腦接手步驟

```bash
# 1. 從 GitHub clone
git clone https://github.com/chahababa/Stores-checking-system.git
cd Stores-checking-system

# 2. 切到改版 branch
git checkout ui/neo-brutalism

# 3. 安裝依賴
npm install

# 4. 設 .env.local（本機開發用，如果要跑 dev）
cp .env.example .env.local
# 編輯 .env.local，填入 Supabase 金鑰（從 Zeabur env vars 或 Notion API 金鑰庫取）

# 5. 讀這份文件 + PR #1 description 掌握進度

# 6. 直接繼續前面「二、下一步」的流程
```

---

## 六、如果開新 Claude Code session

貼這一段當脈絡起手：

> 我有一個 Next.js + Supabase + Zeabur 的門市巡檢系統專案（chahababa/Stores-checking-system）在做 Neo Brutalism 視覺改版。
> 進度在 `ui/neo-brutalism` branch、PR #1 開放中。
> 完整交接資訊在 repo 的 `docs/NEO_BRUTALISM_HANDOFF.md`，請先讀這份文件再開始工作。
