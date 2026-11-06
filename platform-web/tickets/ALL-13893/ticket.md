# ALL-13893：[UAT][Pubs][KYC]账号绑定电话，输入错误格式仍可以进行到下一步opt验证页

- 狀態：討論中
- 連結：https://inta.atlassian.net/browse/ALL-13893
- 討論文件：https://claude.ai/artifact/YQh4eUZqqxURgxD2bST4ud
- 專案：PlatformWeb（前台）
- 影響版型（只有 PlatformWeb 需要填）：m8
- 讀取日期：2026-11-06

## 需求摘要

缺陷單（漏洞），優先度 Medium，Jira 狀態 UAT。

玩家在前台綁定或更新手機號碼時，輸入格式錯誤的號碼，原本仍可進到 OTP 驗證碼頁。修正後應擋在目前頁面。

- 路徑：前台 Profile > Security > Connect phone number
- 情境：帳號已綁 2FA，再綁定電話號碼／更新手機號
- 回報時的環境：2026-09-07，M8 前台 F: 20260907.1、B: 20260904.3，測試帳號 08000526

## 後台實際畫面（2026-11-06 探查，m8，F: 20261105.3、B: 20261106.9）

- 安全性頁網址：`/en-us/settings/security`。截圖：`screenshots/recon/01-security.png`
- 「Two factor authentication (2FA)」區塊有 Email、Phone、Authenticator 三張卡片，Default 2FA method 下拉（Mobile／Email）。
- 測試帳號（.env 的 PlatformWeb 帳號）手機已綁定，卡片顯示「Connected」與「Update Phone Number」按鈕。沒有綁手機的帳號才會看到「Connect phone number」。
- 更新流程：
  1. 點「Update Phone Number」→ 立刻寄驗證碼到舊手機（`POST /v1/member/auth/quicksendmobileverify`），跳「VERIFY / Enter One-Time Code」視窗，6 格。截圖 `02-update-phone-dialog.png`
  2. 填驗證碼按 Submit（`POST /v1/member/auth/quickgeneral2faverify`）→ 跳「CONNECT PHONE NUMBER」視窗。截圖 `03-new-phone-form.png`
  3. 新號碼視窗：國碼下拉（預設 +1，旗子是加拿大），號碼欄位（文字框、數字鍵盤），Submit。
- 國碼清單：有搜尋框「Search Country」，約 222 組國碼。截圖 `04-country-code-list.png`
- 畫面上的格式檢查（國碼 +1，只打字、沒按 Submit）：

| 輸入 | 錯誤提示 | Submit |
| --- | --- | --- |
| `123` | Please enter a valid phone number | 不能按 |
| `abc` | Please enter a valid phone number | 不能按 |
| `12-34 56` | Please enter a valid phone number | 不能按 |
| `2015550123` | 無 | 可以按 |
| `201555012345678901` | Please enter a valid phone number | 不能按 |
| `0000000000` | Please enter a valid phone number | 不能按 |

- 欄位不限制字元：英文字母、橫線、空白都打得進去，只是會顯示錯誤。
- 驗證碼一分鐘只能寄一次，視窗顯示「The code has been sent, please wait 59 seconds before trying again.」

## 核心邏輯

依所選國碼判斷號碼格式（看起來依國家規則，`0000000000` 在 +1 下判定無效）。格式不對時：顯示錯誤提示、Submit 不能按、不會寄驗證碼、不進驗證碼頁。

## 指定文案

單子沒有指定文案。畫面目前的錯誤提示：`Please enter a valid phone number`

## 驗收條件

與 PM 確認後，電話號碼輸入錯誤格式時，判斷應該擋在當前頁，不能進到 OTP 驗證頁。

## 相關留言與附件重點

- 2026-09-16 ema：與 PM、RD 溝通後，該問題為舊有問題，會在 sprint 56 處理。
- 附件兩張截圖（image-20260907-060509.png、image-20260907-081451.png）是回報時的畫面，沒有額外規則。
- 關聯：本單 blocks ALL-13359「[Account][KYC] Add phone number to Basic KYC form」（已完成）。

## 子任務狀態

沒有子任務。

## 已知缺陷

無。

## 待確認

- 測試帳號手機已綁定，只能測「更新」。要測「綁定」需要一個沒綁手機的 UAT 帳號。
- 輸入合法新號碼並完成驗證，會改掉測試帳號的手機號碼，可能影響之後登入的驗證碼。
- 只檢查畫面，還是也要確認後端直接收到錯誤號碼時會擋。
- 基本 KYC 表單、註冊的手機欄位是否共用同一套檢查。

## 決定紀錄

- 2026-11-06：前台雖然暫停測試，這張單照常測。
- 2026-11-06：只測 m8 版型。
