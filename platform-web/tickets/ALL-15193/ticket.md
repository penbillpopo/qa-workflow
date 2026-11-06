# ALL-15193：[FE][Funding] Transfer 存款最低金額被四捨五入，USDC 顯示為 0

- 狀態：已完成
- 連結：https://inta.atlassian.net/browse/ALL-15193
- 討論文件：https://claude.ai/artifact/9iwdfAvAisyo7ajM7561To
- TestRail 測試執行：R556
- 測試報告：https://claude.ai/artifact/Tm7NrBufRd4pgTQhUCrNc7
- 類型：漏洞，優先度 Medium，Jira 狀態 UAT
- 專案：PlatformWeb（玩家前台）
- 影響版型：m8（單子寫 master-8）
- 測試網址：https://uat8-newplatform.mxsyl.com/zh-cn
- 讀取日期：2026-11-06

## 需求摘要

存款視窗 Transfer 頁底部的「The minimum deposit amount is」，最低金額原本被四捨五入到 2 位小數，後端值小於 0.005 時會顯示 0。修正後改成無條件進位，顯示的金額不能比實際門檻低。

## 重現步驟（單子原文）

1. 開啟存款視窗，切到 Transfer。
2. 幣別選 USDC，網路選 Ethereum (ERC20)。
3. 看底部提示的最低儲值金額。

## 預期結果（單子原文）

最低儲值金額是門檻，應該無條件進位，不能顯示得比實際門檻低：

- `0.00000001` → `0.01`
- `0.006` → `0.01`

## 進位規則

| 幣別 | 進位到小數幾位 |
| --- | --- |
| 穩定幣（USDT、USDC 等） | 2 |
| BTC、ETH | 8 |
| 其他 | 6 |

同一個金額格式工具的整體規則：換算四捨五入、門檻進位、上限捨去。這次只修門檻這一行，其他地方不該受影響。

## 原因與修法（開發說明，供參考）

- `deposit-transfer.component.html` 用 `cashierAmount` 顯示 `minDeposit`，穩定幣會用 `roundAmount` 四捨五入到 2 位。
- 由 ALL-14576（`4f62f24d68`）引入。
- 修法：在 `deposit-transfer.component.ts` 加 getter，先用 `roundUpAmount(minDeposit, cryptoBonusMinimumDecimals(token))` 無條件進位，再交給 `cashierAmount` 顯示。

## 附註

USDC ERC20 的最低儲值設成 `0.00000001` 看起來不合理，屬於後端或營運設定，和這張單的前端顯示問題分開處理。

## 子任務與關聯

沒有子任務、沒有關聯單、沒有附件、沒有留言。

## 待確認（已回答）

- 玩家帳號：用 `.env` 現有的 PlatformWeb 帳號，打不開存款視窗時再通知。
- 版型範圍：只測 m8。
- 測試資料：不請後端改設定，只驗 UAT 現有設定值。
- USDC 設定值：不在這次範圍，報告裡提醒。

## 決定紀錄

- 2026-11-06：PlatformWeb 原本暫停，這張單決定恢復前台測試。
- 2026-11-06：討論文件沒有修改，使用者同意照建議做法定案。
- 2026-11-06：只測 m8，TC-12 不測；不請後端改設定。
- 2026-11-06：定案，要測 11 條，全部 AI 測試。
- 2026-11-06：已建進 TestRail（Emma > PlatformWeb > ALL-15193），案例 C42755 到 C42765，測試執行 R556。
- 2026-11-06：AI 測試完成，通過 9、失敗 0、阻擋 2（TC-09：m8 沒有中文介面；TC-11：Transfer 頁沒有其他金額可比對）。結果與截圖已上傳 R556。
- 2026-11-06：發現 SHIB 最低金額顯示 4 位小數（10000.0000），其他幣顯示 6 位；數值正確，只是格式不一致，報告中提醒。
- 2026-11-06：報告確認，存入版本紀錄。
