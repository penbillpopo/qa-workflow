# PlatformWeb

## 版型與 UAT 網址

| 版型 | UAT 網址 |
| --- | --- |
| m1 | https://uat-newplatform.mxsyl.com/zh-cn |
| m2 | https://uat2-newplatform.mxsyl.com/zh-cn |
| m5 | https://uat5-newplatform.mxsyl.com/zh-cn |
| m7 | https://uat7-newplatform.mxsyl.com/zh-cn |
| m8 | https://uat8-newplatform.mxsyl.com/zh-cn |
| m9 | https://uat9-newplatform.mxsyl.com/zh-cn |
| m10 | https://uat10-newplatform.mxsyl.com/zh-cn |

規則：m1 的網域沒有數字，其他版型在 `uat` 後面接版型編號。
登入視窗可以在網址後加 `?dialog=login` 直接打開，例如 `https://uat8-newplatform.mxsyl.com/?dialog=login`。網址裡的 `/zh-cn` 不會決定介面語言，見下面「注意事項」。

## 測試帳號

放在 `.env`，都是 UAT 帳號，變數名稱見 `.env` 裡的 PlatformWeb 區塊。

## 主要模組

- 存款視窗：網址加 `?dialog=deposit` 直接打開。分頁有 Web3 Wallet、Transfer、Buy Crypto、Cash。
- Transfer（加密貨幣轉入）：選幣別、選網路，底部顯示最低存款金額。m8 目前開放 12 種幣別、29 組網路。

## 注意事項

以下是 2026-11-06 測 ALL-15193（m8）時踩到的經驗。對應的自動處理已寫進腳本庫，見 `scripts/library/INDEX.md` 的 platform-web 部分。

- **介面語言**：跟著帳號的語言偏好，不跟瀏覽器語系或網址走。網址打 `/zh-cn` 也會被導回 `/en-us`。m8 的語言只有 English、Português、Español，沒有中文。
- **登入**：Email 加密碼。有時會跳手機驗證碼視窗（6 格，填滿自動送出，用 `.env` 的 `OTP_CODE`）。同一帳號一分鐘內只能寄一次驗證碼，太密集登入會等不到驗證碼視窗。
- **登入後的彈窗**：會跳「Verification Required」和優惠彈窗，而且每次換頁都會再出現，擋住後面的按鈕。
- **測試帳號沒有完成 KYC**：登入後會被導到驗證頁，但不影響打開存款視窗。
- **載入**：網站會一直保持連線，自動測試不能等「網路完全閒置」；偶爾會卡在載入動畫超過 30 秒，要重新整理。
- **存款視窗**：按 Esc 會把整個視窗關掉。幣別與網路的選項是浮在畫面上的清單。
- **最低存款金額的後端來源**：`/v1/asset/deposit/depositaddress?currency=<幣別>&network=<網路>` 回傳的 `minDeposit`。要用原始文字取值，轉成數字會有浮點數誤差。
- **花費時間**：登入約 22 秒，打開存款視窗約 5 秒，選一組幣別約 2 到 3 秒，截圖約 0.1 秒。
- **品牌**：m8 是 PUBS。
