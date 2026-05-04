# 通知機制規格 v1

## 1. 目的

第一版通知包含兩個層次：

1. 站內通知中心。
2. 巡店送出完成後的 Email 通知（已實作，需 Resend env vars 啟用）。

目標是讓使用者能看到或收到：

- 高風險異常
- 本月加強與連續低分
- 待改善任務是否堆積
- 新巡店完成通知

## 2. 優先級

- 高：必查項目出現 C、客訴項目出現 C、整店總評為 C
- 中：本月加強項目仍落在 B / C、連續低分兩週以上、待改善任務過多
- 低：本月巡店摘要或本月尚未巡店

## 3. 顯示位置

- `/notifications` 提供完整通知中心。
- 首頁可提供通知摘要預覽。

## 4. Email 通知

巡店新增成功後，系統可透過 Resend 寄出完成通知。

- 收件者：該店店長、全部 manager、全部 owner。
- 寄送方式：BCC，避免收件者互相看到 email。
- 失敗處理：不阻擋巡店送出；失敗原因寫入 audit log。
- 啟用條件：Zeabur / production environment 需設定 `RESEND_API_KEY` 和 `RESEND_FROM_EMAIL`。
- Setup 待辦：見 `TODO_RESEND_SETUP.md`。

## 5. 後續擴充

- 加入已讀 / 未讀。
- LINE integration。
- 更細緻的通知偏好設定，例如依角色、店別、嚴重程度決定通知管道。
