---
name: qa-run
description: QA 流水線第五階段：執行標為「AI 測試」的案例，每一步截圖，結果與截圖回寫 TestRail 測試執行；失敗時起草 Jira 缺陷單。使用者說「開始測」「跑測試」「跑 TC-03 到 TC-11」「/qa-run」時使用。只處理狀態為「已同步」或「測試中」的單。
---

# qa-run：AI 執行測試並留證據

> **回覆使用者時**：一律依照 `CLAUDE.md` 的「怎麼跟使用者說話」，用教學、引導的方式回覆。使用者可能完全不懂程式：說清楚現在在第幾步、剛剛做了什麼、他現在要做什麼（點哪裡、打什麼字）、接下來會發生什麼。不要對使用者提技能名稱或程式檔名。

遵守 `CLAUDE.md` 的安全規則：只測 UAT、帳密只從 `.env` 讀、測試資料加 `QA-TEST-` 前綴、不刪資料。

## 1. 準備

1. 讀 `ticket.md` 取得測試執行編號與「決定紀錄」，讀 `test-cases.md` 取得案例步驟和 TestRail 編號。
   - 決定紀錄寫了「不使用 TestRail」時，照常執行與截圖，但跳過第 4 步回寫 TestRail，結果只存在本機的 `results/`。
2. 只跑測試方式為「AI 測試」的案例。使用者有指定範圍就照範圍跑。
3. 先跑 `node scripts/login-check.mjs <專案>` 確認能登入。
4. `ticket.md` 狀態改為「測試中」。

## 2. 先查腳本庫

寫案例腳本之前，先讀 `scripts/library/INDEX.md`：

- 案例裡的操作能用現成動作組合的，一律直接 import 來用，不要重新摸索畫面。
- 缺少的動作，如果之後別的單也會用到（例如打開某個頁面、填某個表單），先依照 `qa-script` 技能把它做成腳本庫的動作，再回來組合。
- 只屬於這條案例的操作和判斷，才直接寫在案例腳本裡。
- 跑案例時發現腳本庫的動作壞了，依照 `qa-script` 的「腳本壞了怎麼修」處理，不要在案例腳本裡繞過去。

## 3. 每條案例一支腳本

在 `<單號資料夾>/runs/<案例編號>.mjs` 寫腳本，用共用函式庫和腳本庫：

```js
import { startCase, testName } from '../../../../scripts/lib/qa.mjs';
import { run as openMissionCreate } from '../../../../scripts/library/platform-admin/open-mission-create.mjs';

const t = await startCase({ ticketDir: 'platform-admin/tickets/ALL-14490', caseId: 'TC-03', project: 'platform-admin' });
await t.step('登入後台', '進入儀表板', async () => { await t.login(); return '已登入'; });
await t.step('打開建立表單', '顯示基本設定頁', async page => {
  const r = await openMissionCreate(page, { merchant: 'Epybet' });   // 腳本庫的動作
  t.check(r.tenantId === '10', `商戶不對，tenantId=${r.tenantId}`); // 案例自己的判斷
  return `已打開，tenantId=${r.tenantId}`;
});
// …每個步驟都用 t.step，判斷不符合就用 t.check 丟出錯誤
await t.finish();
```

規則：

- 步驟和 `test-cases.md` 一一對應，`step` 的第一個參數是步驟說明，第二個是預期結果。
- 每個步驟結束都會自動截圖，檔名是 `<案例編號>-<步驟號>-<說明>.png`，失敗會加 `-FAIL`。
- 回傳字串當作「實際結果」，寫具體觀察到的內容，例如畫面上的提示文字。
- 驗證文案時要比對完整字串，不要只比關鍵字。
- 需要建立資料時，名稱用 `testName('單號')`。不要按刪除，也不要改到別人的資料。
- 介面預設是英文。要驗證中文文案時，`startCase` 加上 `locale: 'zh-CN'`。
- 用 `node <腳本路徑>` 執行。結果寫在 `<單號資料夾>/results/<案例編號>.json`。
- 整張單重跑（例如修好缺陷後的回歸測試）不需要重寫，直接 `node scripts/run-ticket.mjs <單號資料夾>`，不用花 AI。
- 腳本自己出錯，例如選擇器寫錯，不算測試失敗。先修腳本再重跑，並在回報中說明。

## 4. 回寫 TestRail

優先用上傳工具，一次把所有結果與截圖傳上去，不用逐筆呼叫：

```
node scripts/testrail-upload.mjs <單號資料夾> [案例編號...]
```

它會讀 `ticket.md` 的測試執行編號、`test-cases.md` 的 TestRail 編號、`results/` 的結果檔，逐條新增結果並附上每一張截圖。只新增，不刪改。

上傳工具不能用時，才改用連線工具逐條處理：

1. 用 `add_results_for_cases` 寫入結果。狀態編號：通過 1、阻擋 2、重測 4、失敗 5。
2. `comment` 放分步結果表，格式如下，每步一列：
   ```
   | 步驟 | 預期結果 | 實際結果 | 結果 |
   ```
   最後一行寫「由 Claude 自動執行，截圖見附件」。
3. 用回傳的結果編號，以 `add_attachment` 上傳這條案例的每一張截圖，`entity_type` 用 `result`。

## 5. 失敗處理

- 在對話裡列出失敗案例：重現步驟、預期結果、實際結果、截圖檔名。
- 起草 Jira 缺陷單內容，標題格式參考既有缺陷：`[UAT][專案][模組] 簡述`。**不要建立**，等使用者同意。
- 使用者同意後才建立缺陷單，並把缺陷單號填回 TestRail 結果的 `defects`。

## 6. 收尾

- 回報統計：通過、失敗、阻擋各幾條，附上 TestRail 測試執行連結。
- 列出人工測試的案例，提醒使用者在 TestRail 自己填結果。
- 全部案例都有結果後，用白話告訴使用者下一步：整理成一份測試報告給他確認。
