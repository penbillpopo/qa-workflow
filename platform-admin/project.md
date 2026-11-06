# PlatformAdmin

## UAT 網址

http://uat.newplatformadmin.mxsyl.com/en-US

注意：這個後台是 `http`，不是 `https`。


## 測試帳號

放在 `.env`，都是 UAT 帳號，變數名稱見 `.env` 裡的 PlatformAdmin 區塊。

## 主要模組

左側選單：Dashboard、User MGT、Marketing、Financial MGT、Payment MGT、Game MGT、Original MGT、Risk MGT、Content MGT、Messages MGT、Permission MGT、System MGT、Game Center、Useful Tools。

登入後預設進入 Dashboard 分析頁。

## 注意事項

- 後台是 Angular 寫的。時間欄位是日曆選擇器：點開始日、點結束日，再按日曆裡的「Confirm」文字。
- 活動頁的商戶選單中，GB 對應 `tenantId=-1`，是平台預設商戶，沒有設定 VIP 等級。在 GB 建立活動會卡在合規玩家頁的 VIP 等級必填。建立測試活動請改用真實商戶，例如 Epybet（`tenantId=10`，VIP0 到 VIP10）。
- 活動建立流程在第一頁按「Next」時就會存成草稿。探查畫面時要注意，每走一次就會多一筆草稿。
- 登入頁標題是「GoGaming System Login」，表單只有帳號、密碼兩欄，沒有圖形驗證碼。
- 帳密通過後會要求 OTP 驗證碼，寄到帳號綁定的工作信箱。沒收到的話，約一分鐘後才能重新寄送。
- UAT 有固定的 OTP 測試碼，存在 `.env` 的 `OTP_CODE`，所有後台共用。驗證碼頁只有一個輸入框，填入後按確認即可登入。
