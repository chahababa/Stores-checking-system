# TODO：啟用巡店通知 Email（Resend setup 待辦）

> **這份文件給「下次接手的 AI agent / 人」看**：
> 程式碼已合進 `main`，但 production 還沒設 Resend 的 env var，所以巡店送出後**目前不會真的寄信**（程式會 silently no-op，行為跟以前完全一樣）。
> 完成下面 3 步後通知就會自動啟用。**完成後請刪掉這份檔案**並在 `CHANGELOG.md` 新增一筆「巡店通知 email 正式啟用」的記錄。

---

## 背景與已完成的部分

- 2026-04-27 commit `9c5fc32` `feat(email): notify store leader, managers, owners on new inspection` 已合入 `main`。
- 邏輯：`createInspection` 成功後寄信給「該店店長 + 全部主管 + 全部 owner」，BCC 發送、失敗會寫進 audit log。
- 寄送服務：[Resend](https://resend.com)。
- 主要實作檔案：
  - [src/lib/email.ts](src/lib/email.ts)：寄信主邏輯（`sendInspectionCompletedEmail`）。
  - [src/lib/inspection.ts](src/lib/inspection.ts)：`createInspection` 結尾呼叫上面那個 function。
  - [src/lib/supabase/env.ts](src/lib/supabase/env.ts)：`getResendApiKey()` / `getResendFromEmail()`，未設時回傳 `null`，feature silently no-op。
- 詳細功能說明見 [CHANGELOG.md](CHANGELOG.md) 2026-04-27 entry「巡店送出完成後，自動寄信通知相關人員」。

## 還沒決定的事（請先跟 chahababa 對齊再動工）

1. **`hoochuu.com.tw` 的 DNS 在哪邊管理？** Cloudflare / GoDaddy / Hinet / TWNIC / 其他？這會決定下面步驟 3 的具體操作介面。
2. **From email 用 `no-reply@hoochuu.com.tw` 嗎？** 或別的（`inspection@`、`notify@`...）？

## 還沒做的 Setup（3 步）

### 1. Resend 註冊 / 登入並 Verify 寄件 domain

到 [resend.com](https://resend.com) 用 chahababa@hoochuu.com.tw 登入或註冊（Free Tier 即可，每月 3000 封）。

→ Domains → Add Domain → 輸入 `hoochuu.com.tw`（region 選 `ap-northeast-1` Tokyo）。

Resend 會給 3 條 DNS records（1 條 SPF + 2 條 DKIM），把這 3 條 records 的 Type / Name / Value / Priority 完整抄下來。

### 2. 把 3 條 DNS records 加到 hoochuu.com.tw 的 DNS provider

到 hoochuu.com.tw 的 DNS dashboard，把 Resend 給的 3 條 records 一條一條 add 進去（Type、Name、Value 完全照抄）。儲存後回 Resend Domains 頁，點該 domain 的 `Verify DNS Records`，等到狀態變綠色 `Verified`（5–30 分鐘）。

⚠️ 如果不確定 hoochuu.com.tw 的 DNS 在哪邊管理，先到 [dnschecker.org/ns-lookup.php?query=hoochuu.com.tw](https://dnschecker.org/ns-lookup.php?query=hoochuu.com.tw) 看 NS records 判斷 provider：

| NS pattern | DNS provider |
|---|---|
| `*.cloudflare.com` | Cloudflare（dash.cloudflare.com） |
| `*.awsdns-*` | AWS Route 53 |
| `*.googledomains.com` | Google Domains / Cloud DNS |
| `dns*.gandi.net` | Gandi |
| `*.godaddy.com` 或 `*.domaincontrol.com` | GoDaddy |
| `dns*.hinet.net` | 中華電信 Hinet |
| `ns*.twnic.tw` | TWNIC |

### 3. 設 Zeabur env vars

domain Verified 後到 Resend → API Keys → Create API Key（Permission 選 `Sending access`）→ 複製 key（只顯示一次）。

到 [Zeabur stores-checking-system service → Variable](https://zeabur.com/projects/69d6eb3686ea5714a4e49e39/services/69d6ecbc86ea5714a4e4a02a) 加兩條：

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=no-reply@hoochuu.com.tw
```

存檔後 Zeabur 自動 redeploy，1–2 分鐘後完成。

### 4. 實測

到 [stores-checking-system.zeabur.app/inspection/new](https://stores-checking-system.zeabur.app/inspection/new) 隨手送一筆測試巡店（用「測試資料清理」頁可以事後清乾淨）。預期 owner / manager / 該店店長都會收到 `[巡店通知] X店 ... 總評 A` 之類的信。Resend 後台 Logs 分頁可以看寄送結果。

如果沒收到信，去 [audit log](https://stores-checking-system.zeabur.app/audit) 找 `send_inspection_email_failed` 找原因。

---

## 完整 Browser AI Prompt（直接複製貼到 Claude in Chrome / Computer Use）

```
我有一個跑在 Zeabur 上的 Next.js 系統「stores-checking-system」（門市巡檢系統），剛剛新增了一個「巡店送出後自動寄信通知」功能。程式已經 deploy 上線，但還沒設定 email provider 跟 env var，所以目前不會真的寄信。請幫我把整個流程跑完。

【目標】
讓系統在每次新增巡店成功後，自動寄一封通知信給該店店長 + 全部主管 + 全部 owner。
寄送服務用 Resend，寄件 domain 是 hoochuu.com.tw，from email 是 no-reply@hoochuu.com.tw。

【整個流程的 5 步驟】

==== 步驟 1：Resend 註冊 / 登入並新增 domain ====

1. 開 https://resend.com/，用 Google 帳號（chahababa@hoochuu.com.tw）登入；如果是首次需要註冊，付費方案選 Free Tier 即可（每月 3000 封免費，遠遠用不滿）。
2. 進入左側 `Domains` → 右上 `Add Domain`。
3. Domain name 填 `hoochuu.com.tw`。Region 選 `ap-northeast-1` (Tokyo) 或 `us-east-1`，看哪個離主要使用者比較近。
4. 按下 `Add` 後，Resend 會給你 3 條 DNS records：1 條 SPF（TXT，name 通常是 send 或 @）+ 2 條 DKIM（TXT/CNAME，name 是某個 selector 例如 resend._domainkey.send）。
5. 把 3 條 record 的「Type / Name / Value / Priority」逐字截圖或文字複製下來，等下要用。先不要關 Resend 那個分頁，因為下面的 Verify 動作要回來這裡點。

==== 步驟 2：找出 hoochuu.com.tw 的 DNS 在哪邊管理 ====

我不確定這個 domain 目前 DNS 由誰管。請幫我用下面任一方法判斷：

選項 A：在新分頁開 https://dnschecker.org/ns-lookup.php?query=hoochuu.com.tw → 看 NS records，會顯示像「ns-1234.awsdns-56.org」、「dolly.ns.cloudflare.com」、「dns1.gandi.net」之類的字樣。
選項 B：開 terminal 跑 `dig hoochuu.com.tw NS +short`（如果你能跑 shell）。

常見的 NS 對應到的 DNS 管理介面：
- `*.cloudflare.com` → Cloudflare（dash.cloudflare.com）
- `*.awsdns-*` → AWS Route 53（console.aws.amazon.com/route53）
- `*.googledomains.com` 或 `ns-cloud-*.googledomains.com` → Google Domains / Cloud DNS
- `dns*.gandi.net` → Gandi
- `*.godaddy.com` 或 `*.domaincontrol.com` → GoDaddy
- `dns*.hinet.net` → 中華電信 Hinet
- `ns*.twnic.tw` → TWNIC

判斷出 DNS provider 後，告訴我「DNS 看起來在 XX」，並準備好登入該 provider 的 dashboard。如果你不確定怎麼登入，停下來問我，不要亂猜密碼。

==== 步驟 3：把 Resend 給的 3 條 TXT/CNAME records 加進 DNS ====

到判斷出來的 DNS dashboard：
1. 找到 hoochuu.com.tw 的 DNS settings。
2. 把步驟 1 拿到的 3 條 records 一條一條加進去（Type、Name、Value 完全照抄，Priority 如果有就照抄、沒有就空）。
3. 注意 Name 欄位通常 dashboard 會「自動補上 .hoochuu.com.tw」，所以只要填 selector 部分（例如 `resend._domainkey.send`）。如果 Resend 給的 Name 是完整 FQDN（含 .hoochuu.com.tw），dashboard 那邊只填前半段就好，避免重複。
4. 全部加完之後 save。

==== 步驟 4：回 Resend Verify ====

1. 回 Resend Domains 那個分頁。
2. 對 `hoochuu.com.tw` 點 `Verify DNS Records`。
3. 通常 5–30 分鐘可以驗證通過（需要等 DNS propagate）。如果 5 分鐘後還是 Pending，可以多等一下、再點一次 Verify。
4. 等到狀態變成綠色 `Verified` 才能進下一步。

==== 步驟 5：建立 API Key + 設到 Zeabur ====

1. Resend 左側 `API Keys` → `Create API Key`：
   - Name 填 `stores-checking-system-prod`
   - Permission 選 `Sending access`（不需要 Full access）
   - 點 Add 之後 API key 只會顯示一次，馬上複製貼到一個安全的地方（例如記事本）。
2. 開新分頁到 https://zeabur.com/ → 進入 stores-checking-system 這個 service（如果不確定，project 名字也叫 Stores-checking-System）。
3. 點 `Variable` 分頁 → `Add Variable` 新增兩條：
   - Key: `RESEND_API_KEY` Value: 步驟 5.1 複製的 key（re_ 開頭那一長串）
   - Key: `RESEND_FROM_EMAIL` Value: `no-reply@hoochuu.com.tw`
4. 儲存後 Zeabur 會自動 redeploy，等 build 完成顯示 Running（約 1–2 分鐘）。

==== 步驟 6：實測 ====

1. 開 https://stores-checking-system.zeabur.app/inspection/new 用我的 owner 帳號登入。
2. 隨便送一筆測試巡店（任一店、任一時段、全部評 A、Menu QA 隨便填、不上傳照片）。
3. 巡店送出成功後，去 chahababa@hoochuu.com.tw 的收件匣確認有收到一封主旨類似 `[巡店通知] X店 2026-04-XX XX點-XX點 — 總評 A` 的信。
4. 同時應該也會寄到 ivywu@hoochuu.com.tw（店長）跟 yen1926@hoochuu.com.tw（主管）。我這邊看不到他們的信箱，但你可以在 Resend 的 Logs 分頁看到實際寄出的紀錄（每封信的狀態、收件者、是否被退信）。

【回報】

完成後請告訴我：
(a) Resend domain verified 的時間
(b) 加了 3 條 DNS records 的 DNS provider 名稱
(c) Zeabur 兩條 env var 是否設定成功 + redeploy 是否完成
(d) 測試巡店的 inspection id 跟 Resend Logs 顯示的寄送結果（有沒有 bounced）
(e) 中間任何一步卡住或不確定的狀況

【中途遇到狀況的處理】

- 任何要輸入密碼 / 2FA 驗證碼 / 信用卡資料 → 停下來問我，不要亂填。
- DNS verify 等 30 分鐘還是 pending → 截圖 Resend 顯示的 record 跟 DNS dashboard 上加的 record，貼給我比對是不是有打錯。
- 步驟 6 巡店送出後沒收到信 → 看 Resend 的 Logs 分頁，找最新一筆，看 status 是 delivered / bounced / dropped、看 reason，貼給我。

不要動到任何跟「巡店通知 email」無關的設定（例如其他 Zeabur env var、其他 DNS records、其他 Resend domain）。
```
