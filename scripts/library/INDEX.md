# 腳本庫索引

這份檔案由 `node scripts/library/build-index.mjs` 自動產生，不要手動修改。

寫測試腳本前先看這裡：能用現成動作組合的，就不要重新摸索畫面。缺少的動作，用 `/qa-script` 建立後再加進來。

| 動作編號 | 做什麼 | 專案 | 需要先登入 | 副作用 | 最後驗證 |
| --- | --- | --- | --- | --- | --- |
| `common/date-range` | 日期區間選擇器（owl 日曆） | platform-admin | 否 | 無 | 2026-11-06 |
| `common/login` | 登入後台（含 OTP） | gomoney-admin、platform-admin | 否 | 無 | 2026-11-06 |
| `platform-admin/open-mission-create` | 打開任務獎勵活動的建立頁（基本設定） | platform-admin | 是 | 無。只打開頁面；在建立頁按「Next」才會存成草稿。 | 2026-11-06 |
| `platform-admin/select-merchant` | 在列表頁切換商戶 | platform-admin | 是 | 無 | 2026-11-06 |
| `platform-web/login` | 玩家前台登入（含手機驗證碼） | platform-web | 否 | 可能寄出一封手機驗證碼簡訊 | 2026-11-06 |
| `platform-web/open-deposit-transfer` | 打開存款視窗的 Transfer（加密貨幣轉入）頁 | platform-web | 是 | 無，只打開視窗 | 2026-11-06 |
| `platform-web/select-deposit-token` | 在 Transfer 頁選幣別與網路，讀取最低存款金額 | platform-web | 是 | 無 | 2026-11-06 |

## 參數與注意事項

### common/date-range

日期區間選擇器（owl 日曆）。檔案：`scripts/library/common/date-range.mjs`

- `start`：開始日期 YYYY-MM-DD（必填）
- `end`：結束日期 YYYY-MM-DD（必填）
- `placeholder`：輸入框的提示文字（選填）。不填時自動找頁面上第一個日期區間輸入框
- 回傳：輸入框最後顯示的值，例如 2026-11-20 14:30 ~ 2026-12-05 14:30
- 注意：中英文介面都可用。時與分沿用日曆預設值（目前時間）。日曆的「Confirm」是文字不是按鈕，要用文字定位。提示框擋住時會點不到輸入框，所以先把滑鼠移開。

### common/login

登入後台（含 OTP）。檔案：`scripts/library/common/login.mjs`

- `project`：專案代號：gomoney-admin 或 platform-admin（必填）
- 回傳：登入後的網址
- 注意：帳密與 OTP 從 .env 讀取。登入後 GoMoneyAdmin 會到会员列表，PlatformAdmin 會到 Dashboard。

### platform-admin/open-mission-create

打開任務獎勵活動的建立頁（基本設定）。檔案：`scripts/library/platform-admin/open-mission-create.mjs`

- `merchant`：商戶名稱，預設 Epybet
- 回傳：{ url, tenantId }
- 注意：中英文介面都可用。路徑：Marketing > Event > Mission Reward Event > Create Mission。建立流程三步：Basic Setting、Player Eligibility、Mission List。

### platform-admin/select-merchant

在列表頁切換商戶。檔案：`scripts/library/platform-admin/select-merchant.mjs`

- `merchant`：商戶名稱，例如 Epybet、GB、Vwin、PUBS.com（必填）
- 回傳：切換後顯示的商戶名稱
- 注意：中英文介面都可用。用在有「Merchant：」（中文介面為「商户：」）下拉選單的列表頁，例如活動列表。GB 是平台預設商戶（tenantId -1），沒有 VIP 等級，建立活動請用 Epybet（tenantId 10）。

### platform-web/login

玩家前台登入（含手機驗證碼）。檔案：`scripts/library/platform-web/login.mjs`

- `variant`：版型 m1、m2、m5、m7、m8、m9、m10，預設 m8
- 回傳：登入後的網址
- 注意：帳密用 .env 的 PLATFORM_WEB_USERNAME、PLATFORM_WEB_PASSWORD，驗證碼用 OTP_CODE。驗證碼視窗有 6 格，填滿會自動送出；不一定每次都會出現。同一帳號一分鐘內只能寄一次驗證碼，太密集登入會等不到驗證碼視窗。登入後會跳「Verification Required」與優惠彈窗，已自動關掉；換頁後會再出現，可用 qa.mjs 的 dismissWebPopups 關。偶爾會卡在載入動畫，已自動重試一次。介面語言是帳號偏好，不跟瀏覽器語系或網址走；m8 只有 English、Português、Español，沒有中文。m8 是 PUBS 品牌。

### platform-web/open-deposit-transfer

打開存款視窗的 Transfer（加密貨幣轉入）頁。檔案：`scripts/library/platform-web/open-deposit-transfer.mjs`

- `variant`：版型，預設 m8
- 回傳：{ tokens: [{ currency, networks: [{ network, desc }] }] }，後端回傳可存款的幣別與網路清單
- 注意：用網址 ?dialog=deposit 直接打開存款視窗，再點「Transfer your crypto」。每次換頁都會跳「Verification Required」提示壓在最上面，已自動按 OK。頁面上的優惠彈窗會壓在存款視窗下面，不用關。不要按 Esc，會把整個存款視窗關掉。

### platform-web/select-deposit-token

在 Transfer 頁選幣別與網路，讀取最低存款金額。檔案：`scripts/library/platform-web/select-deposit-token.mjs`

- `currency`：幣別，例如 USDT、USDC、BTC（必填）
- `network`：網路的顯示名稱或代碼，例如 Ethereum (ERC20) 或 ERC20（選填，不填就用預設網路）
- 回傳：{ currency, network, shownText, shownAmount, shownCurrency, backendMinDeposit }。shownAmount 是畫面上的最低金額，backendMinDeposit 是後端 depositaddress 回傳的原始值
- 注意：要先用 open-deposit-transfer 打開 Transfer 頁。幣別與網路的選項是浮在畫面上的清單，直接點文字。後端原始值來自 /v1/asset/deposit/depositaddress?currency=&network=。

## 怎麼用

單獨執行（會截圖到 `tmp/actions/`）：

```
node scripts/run-action.mjs platform-admin/open-mission-create merchant=Epybet
node scripts/run-action.mjs --headed --keep common/login project=platform-admin   # 開出瀏覽器看著它跑
```

在案例腳本裡組合：

```js
import { run as openMissionCreate } from '../../../../scripts/library/platform-admin/open-mission-create.mjs';
await t.step('打開建立頁', '顯示基本設定頁', async page => { await openMissionCreate(page, { merchant: 'Epybet' }); return '已打開'; });
```
