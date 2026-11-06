# QA 工作流程：第一次使用請看這裡

這個資料夾讓 Claude 幫你做 QA：你貼一張 Jira 單子，Claude 會整理重點、寫測試案例、到 UAT 後台實際操作並截圖，最後把結果寫進 TestRail 並產出報告。

照下面四個步驟做完就能開始用。卡住的時候，在 Claude 裡輸入 `/qa-help`，它會帶你一步一步處理。

每個功能的詳細用法、換電腦的完整步驟，請看 [GUIDE.md](GUIDE.md)。

## 開始前，先跟主管拿這些東西

| 項目 | 說明 |
| --- | --- |
| 這個專案資料夾 | 整個資料夾，不是單一檔案 |
| claude.ai 帳號 | 要是付費方案（Pro、Max、Team 或 Enterprise），免費方案不能用 Claude Code |
| TestRail 帳號 | 登入 https://gorun.testrail.io ，並請主管把你加進 **Emma** 專案 |
| 後台測試帳號 | GoMoneyAdmin 與 PlatformAdmin 的 UAT 帳號密碼 |
| OTP 驗證碼 | UAT 共用的固定驗證碼 |

帳號密碼只能填進 `.env` 檔，不要貼到聊天軟體、信件，也不要貼給 Claude。

## 步驟一：放好資料夾

把資料夾放到 `C:\QA-workflow`。

- 路徑不要有中文或空白。
- 不要放在 OneDrive、桌面同步資料夾或網路磁碟裡。

## 步驟二：一鍵安裝（Windows）

在 `C:\QA-workflow` 裡，對 `setup-windows.cmd` 按兩下。

它會自動安裝 Node.js、Git、Google Chrome、Claude Code 和專案套件，接著用記事本打開 `.env` 讓你填帳密。填好按 `Ctrl + S` 存檔、關掉記事本，安裝會繼續。

- 跳出「是否允許變更」的視窗時，按「是」。
- 如果出現「請關掉這個視窗再執行一次」，照做就好，可以重複執行，已經裝好的會跳過。
- 最後會顯示一份檢查清單，全部打勾就完成了。

Mac 的話，請改成在終端機執行：`npm install`、複製 `.env.example` 成 `.env` 並填好、再執行 `node scripts/setup-mcp.mjs`。

## 步驟三：打開 Claude 並登入

1. 在 `C:\QA-workflow` 資料夾的空白處，按住 `Shift` 再按右鍵，選「在終端機中開啟」。
2. 輸入 `claude` 按 Enter。
3. 第一次會打開瀏覽器，用你的 claude.ai 帳號登入。看到「Login successful」就完成了。
4. 回到終端機，如果問你是否信任這個資料夾，選「是」。

## 步驟四：讓 Claude 幫你檢查

在 Claude 裡輸入：

```
/qa-help
```

它會檢查所有設定，告訴你還缺什麼，能自動修的會直接修好。

另外，Jira 是透過 claude.ai 的「連接器」使用。請到 https://claude.ai/customize/connectors 確認 **Atlassian** 已經連上；如果沒看到，請主管幫你開。

## 日常使用

| 想做什麼 | 在 Claude 裡這樣說 |
| --- | --- |
| **從頭到尾帶我做一張單** | **`/qa ALL-12345`，之後跟著它的提示走；隔天回來說「繼續」** |
| 開始測一張單 | 直接貼 Jira 網址，或輸入 `/qa-start ALL-12345` |
| 看完討論文件 | 「看完了」 |
| 案例確定了 | 「定案」 |
| 建到 TestRail | 「同步 TestRail」 |
| 開始自動測試 | 「開始測」 |
| 出報告 | 「出報告」 |
| 看所有單的進度 | 「進度」 |
| 教 Claude 一個新操作（你示範一次） | `/qa-teach`，再說要教什麼，例如「我要教你註冊」 |
| 把一個操作做成腳本（用說的） | 「做一個登入腳本」或 `/qa-script` |
| 不經過 AI 重跑整張單 | 在終端機執行 `node scripts/run-ticket.mjs platform-admin/tickets/ALL-12345` |
| 環境有問題 | `/qa-help` |

## 卡住了怎麼辦

1. 先在 Claude 裡輸入 `/qa-help`，把畫面上的錯誤訊息直接貼給它。
2. 還是不行，在終端機執行 `node scripts/doctor.mjs`，把整個畫面截圖給主管。
