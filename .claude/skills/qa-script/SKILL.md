---
name: qa-script
description: 建立或修理腳本庫裡的 Playwright 動作腳本（例如登入、選商戶、打開某個建立頁、填某個表單）。流程是：先實際操作一次並截圖、跟使用者討論做法、寫成可重複使用的腳本、驗證後登錄到 scripts/library/INDEX.md。使用者說「做一個腳本」「把這個流程寫成腳本」「教你怎麼登入／操作」「腳本壞了」「/qa-script」時使用；qa-run 發現腳本庫缺少需要的動作時也使用。
---

# qa-script：建立可重複使用的動作腳本

> **回覆使用者時**：一律依照 `CLAUDE.md` 的「怎麼跟使用者說話」，用教學、引導的方式回覆。使用者可能完全不懂程式：說清楚現在在第幾步、剛剛做了什麼、他現在要做什麼（點哪裡、打什麼字）、接下來會發生什麼。不要對使用者提技能名稱或程式檔名。

目標：把「AI 摸索過一次的操作」變成腳本庫裡的積木。之後同樣的需求直接跑腳本，不用再花 AI 去看畫面。腳本庫越完整，測試越快、越穩、越省。

## 兩種教法

- **用說的或讓 Claude 自己摸索**：照這個技能的流程做。
- **使用者想親自示範一次**：改用 `qa-teach` 技能，它會打開錄製用的瀏覽器，錄完再回到本技能第 5 到第 7 步的寫法做成腳本。

## 核心原則

- **一個腳本只做一件事**：例如「選商戶」「打開任務活動建立頁」。測試案例再把這些積木組合起來。
- **腳本只負責操作，不判斷案例對錯**：做不到就丟出中文錯誤訊息；成功就回傳有用的資訊，例如網址、畫面上的值。驗證「對不對」寫在案例腳本裡。
- **帳密和網址不寫死**：帳密由 `scripts/lib/qa.mjs` 從 `.env` 讀取，網址用 `PROJECTS[...].baseUrl`。
- **中英文介面都要能用**：後台介面語言跟著瀏覽器語系，不是網址。用文字找元素時，同時寫中英文，例如 `/Create Mission|创建活动/`。
- **副作用要寫清楚**：會建立資料、存草稿、送出表單的，在 `meta.sideEffects` 寫明白。
- **需要登入的探索，不用 Playwright 的 MCP 瀏覽器**：在那裡登入要把帳密打進對話。改用下面的臨時探查腳本，它會透過 `.env` 登入。MCP 瀏覽器只用在不需要登入的頁面。

## 流程

### 1. 確認要做什麼

用一兩句話跟使用者確認：

- 動作名稱：做什麼事，例如「在活動列表切換商戶」。
- 屬於哪個專案：`common`（跨專案共用）、`platform-admin`、`gomoney-admin`。
- 起點和終點：從哪個頁面開始、做完停在什麼狀態。
- 參數：哪些值每次會不同，例如商戶名稱、日期。

### 2. 先查腳本庫

讀 `scripts/library/INDEX.md`。

- 已經有一樣的：直接告訴使用者用法，不要重做。
- 有類似的：優先擴充原本的腳本（加參數），不要另寫一支幾乎一樣的。
- 需要的前置動作（例如登入、打開某頁）已經有了：新腳本直接 import 來用。

### 3. 實際操作一次（探查）

在 `tmp/` 寫臨時探查腳本，用現成積木走到起點，再收集畫面資訊：

```js
// tmp/probe.mjs
import { launchBrowser, login, mask } from '../scripts/lib/qa.mjs';
import { run as openMissionCreate } from '../scripts/library/platform-admin/open-mission-create.mjs';

const b = await launchBrowser({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'en-US' })).newPage();
await login(page, 'platform-admin');
await openMissionCreate(page, { merchant: 'Epybet' });
console.log(mask(await page.locator('body').ariaSnapshot()));   // 頁面結構，用來找穩定的定位方式
await page.screenshot({ path: 'tmp/probe-1.png', fullPage: true });
await b.close();
```

- 用 `node tmp/probe.mjs` 執行。看截圖確認畫面，並把關鍵截圖給使用者看。
- 一次走一小段，邊走邊截圖，不要一口氣寫完整個流程。
- 要讓使用者親眼看著跑，可以用 `node scripts/run-action.mjs --headed --keep <前置動作>` 開出瀏覽器視窗。
- 探查時盡量不要按「儲存」「下一步」「送出」這類會留下資料的按鈕。真的需要時，先告訴使用者，名稱一律用 `QA-TEST-` 開頭。

### 4. 跟使用者討論做法

把探查結果整理成簡短清單給使用者確認：

1. 操作步驟：每一步點哪裡、填什麼。
2. 怎麼判斷成功：例如網址變成什麼、出現哪個欄位。
3. 可能出狀況的地方：例如提示框擋住按鈕、商戶沒有 VIP 等級、按下一步會存草稿。
4. 參數與預設值。

使用者有修正就照改。使用者說「照你的做」就直接寫。

### 5. 寫成腳本

位置：`scripts/library/<專案>/<英文動詞-名詞>.mjs`，例如 `platform-admin/select-merchant.mjs`。檔名用英文小寫加連字號，說明用中文。

固定格式：

```js
import { PROJECTS } from '../../lib/qa.mjs';

export const meta = {
  id: 'platform-admin/open-xxx',          // 等於「專案/檔名」
  name: '一句話說明做什麼',
  project: 'platform-admin',               // 跨專案用「gomoney-admin、platform-admin」
  needsLogin: true,                        // 需要先登入就填 true，執行工具會自動登入
  params: { merchant: '商戶名稱，預設 Epybet' },
  returns: '回傳什麼',
  sideEffects: '無',                       // 會建立資料、存草稿就寫清楚
  notes: '中英文介面都可用。其他踩過的坑寫在這裡。',
  verified: 'YYYY-MM-DD',                  // 最後一次實際跑成功的日期
};

export async function run(page, { merchant = 'Epybet' } = {}) {
  // 操作
  // 做不到時：throw new Error('中文說明哪裡失敗、目前看到什麼');
  return { /* 有用的資訊 */ };
}
```

寫法規則：

- 定位元素的優先順序：角色加名稱（`getByRole`）→ 畫面文字（`getByText`，中英文都寫）→ 輸入框提示文字或特殊屬性 → CSS class。避免依賴自動產生的 class 或很深的層級。
- 等待用「等到某個東西出現」：`waitFor`、`waitForURL`。固定秒數的等待只用在動畫或下拉選單展開，而且不超過 1.5 秒。
- 錯誤訊息要讓人看得懂下一步，例如「找不到商戶 X，可選的有：A、B、C」。
- 可以 import 其他積木來組合，例如 `open-mission-create` 裡面呼叫 `select-merchant`。

### 6. 驗證

1. 用執行工具跑，英文介面和中文介面各一次：
   ```
   node scripts/run-action.mjs <動作編號> key=value
   node scripts/run-action.mjs --zh <動作編號> key=value
   ```
2. 再連跑一次，確認結果穩定。
3. 看 `tmp/actions/` 的截圖，把最後一張給使用者看。
4. 有副作用的腳本，驗證完要告訴使用者留下了哪些測試資料。

### 7. 登錄到索引

執行 `node scripts/library/build-index.mjs`，更新 `scripts/library/INDEX.md`。回報給使用者：

- 新動作的編號和用途。
- 單獨執行的指令。
- 在案例腳本裡怎麼用。

### 8. 腳本壞了怎麼修

後台改版後，腳本可能失效。

1. 先用 `run-action.mjs` 重現，看失敗截圖。
2. 用第 3 步的方式探查新畫面，找出差異。
3. 修腳本，保留原本的參數和回傳格式，避免影響已經在用它的案例腳本。
4. 中英文各跑一次，更新 `meta.verified`，重建索引。
5. 告訴使用者改了什麼、為什麼壞掉。
