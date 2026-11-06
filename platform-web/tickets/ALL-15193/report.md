# ALL-15193 測試報告

- 測試網址：https://uat8-newplatform.mxsyl.com（UAT，PlatformWeb m8，PUBS）
- 測試日期：2026-11-06
- 測試帳號：`.env` 的 PLATFORM_WEB_USERNAME
- 版型：m8
- 線上報告：https://claude.ai/artifact/Tm7NrBufRd4pgTQhUCrNc7
- TestRail：R556，https://gorun.testrail.io/index.php?/runs/view/556

## 結論

修正有效，建議可以上線。存款視窗 Transfer 頁的最低金額已改成無條件進位，USDC 不再顯示 0；29 組幣別與網路全部符合，沒有任何一組低於門檻。

## 結果總覽

| 通過 | 失敗 | 阻擋 | 未測 |
| --- | --- | --- | --- |
| 9 | 0 | 2 | 0 |

全部為 AI 自動測試，沒有人工案例。

## 逐條結果

| 編號 | 結果 | 說明 | 截圖 |
| --- | --- | --- | --- |
| TC-01 | 通過 | USDC ERC20 後端 0.00000001，顯示 0.01 USDC | screenshots/m8/TC-01-* |
| TC-02 | 通過 | USDT 6 個網路後端 0.006，都顯示 0.01 | screenshots/m8/TC-02-* |
| TC-03 | 通過 | 12 種幣別、29 組全部符合，見 results/TC-03-比對表.md | screenshots/m8/TC-03-* |
| TC-04 | 通過 | BTC 3 個網路後端 0.0000001，顯示 0.00000010 | screenshots/m8/TC-04-* |
| TC-05 | 通過 | ETH 2 個網路後端 0.00000001，顯示 0.00000001 | screenshots/m8/TC-05-* |
| TC-06 | 通過 | BNB、XRP、TRX 共 4 組符合 | screenshots/m8/TC-06-* |
| TC-07 | 通過 | 16 組門檻不需進位，抽 5 組都原樣顯示 | screenshots/m8/TC-07-* |
| TC-08 | 通過 | USDT → USDC → USDT 切換即時更新 | screenshots/m8/TC-08-* |
| TC-09 | 阻擋 | 英文正確；m8 沒有中文介面 | screenshots/m8/TC-09-* |
| TC-10 | 通過 | 手機尺寸 390×844 完整顯示 | screenshots/m8/TC-10-* |
| TC-11 | 阻擋 | Transfer 頁沒有其他金額可比對 | screenshots/m8/TC-11-* |

## 失敗紀錄

無。

## 無法測與本次不測

| 編號 | 原因 | 風險與建議 |
| --- | --- | --- |
| TC-09 | m8 只有 English、Português、Español | 低，進位與語言無關，英文已驗 |
| TC-11 | Transfer 頁只有最低金額 | 中，建議開發確認只改 Transfer 這一行，或人工抽看 Cash 分頁 |
| TC-12 | 決定只測 m8 | 低到中，其他版型若共用元件，可用現成小程式快速抽測 |

## 其他發現（範圍外）

- SHIB 最低金額顯示 4 位小數（10000.0000），其他非穩定幣是 6 位；數值正確，格式不一致。
- USDC 全部網路、ETH、TRX 的後端最低儲值都是 0.00000001，看起來偏低，建議另開單給營運確認。
- 單子沒列穩定幣名單，這次以 USDT、USDC 為準，比對結果與畫面一致。
