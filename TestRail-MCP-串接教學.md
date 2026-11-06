# TestRail MCP 串接教學

> 這份是早期只串 TestRail 的教學，已由 `README.md` 取代。新電腦請照 `README.md` 操作，或在 Claude 裡輸入 `/qa-help`。

Nov 4, 2026 · @Ban

## 這份文件做什麼

照著做完，新電腦上的 Claude Code 就能直接讀取 `https://gorun.testrail.io` 的專案、測試案例、執行紀錄和結果。整個流程約 10 分鐘，預設只開讀取權限。

帳號和 API key 不寫在這份文件裡，它們只放在專案資料夾的 `.env` 檔。

## 事前準備

新電腦要先裝好下面兩個軟體，再準備一把 TestRail API key。

| 項目 | 原本電腦的版本 | 怎麼確認 |
| --- | --- | --- |
| Node.js（提供 `npx` 指令） | v22.12.0 | `node -v` |
| Claude Code | 2.1.310 | `claude --version` |
| TestRail API key | 已存在 `.env` | 見下方說明 |

需要新的 API key 時：

1. 用瀏覽器打開 [TestRail 個人設定](https://gorun.testrail.io/index.php?/mysettings)。
2. 切到「API Keys」分頁，按「Add Key」，取個名字例如「Claude 新電腦」。
3. 複製產生的 key，再按「Save Settings」儲存，沒儲存的話 key 不會生效。

登入密碼用不到。這個工具只用帳號加 API key 登入。

## 步驟一：準備專案資料夾與 .env

把整個 `QA-workflow` 資料夾搬到新電腦的桌面，裡面的 `.env` 就已經有所有需要的值。請用隨身碟或 AirDrop 搬，不要透過聊天軟體、信件或公開的雲端硬碟傳。

如果沒辦法搬檔案，就在新電腦手動建立：

```bash
mkdir -p ~/Desktop/QA-workflow
cd ~/Desktop/QA-workflow
cat > .env <<'EOF'
# TestRail MCP 連線設定
TESTRAIL_INSTANCE_URL=https://gorun.testrail.io
TESTRAIL_USERNAME=ema@intellianalyze.com
TESTRAIL_API_KEY=貼上你的APIkey
TESTRAIL_ALLOW_WRITE_OPERATIONS=false
EOF
chmod 600 .env
```

最後一行讓只有你自己的使用者帳號能讀這個檔案。之後若把資料夾放進 git，記得把 `.env` 加到 `.gitignore`。

## 步驟二：加入 TestRail MCP

在終端機貼上下面整段。它會先讀 `.env`，再拿裡面的值加入設定，所以不用手打任何帳密。

```bash
cd ~/Desktop/QA-workflow
set -a; source .env; set +a

claude mcp remove testrail --scope local 2>/dev/null

claude mcp add \
  --scope local \
  --env TESTRAIL_INSTANCE_URL="$TESTRAIL_INSTANCE_URL" \
  --env TESTRAIL_USERNAME="$TESTRAIL_USERNAME" \
  --env TESTRAIL_API_KEY="$TESTRAIL_API_KEY" \
  --env TESTRAIL_ALLOW_WRITE_OPERATIONS="$TESTRAIL_ALLOW_WRITE_OPERATIONS" \
  --transport stdio \
  testrail -- npx -y @uarlouski/testrail-mcp-server@latest
```

成功時會看到這行：

```
Added stdio MCP server testrail with command: npx -y @uarlouski/testrail-mcp-server@latest to local config
```

三個要注意的地方：

- **一定要先 `cd` 進資料夾**：`--scope local` 只對當下的資料夾生效，在別的資料夾開 Claude Code 會看不到這個工具。想讓每個資料夾都能用，就把兩處 `local` 改成 `user`。
- **`remove` 那行是保險**：第一次裝沒有舊設定可刪，它會安靜跳過；重複執行也不會重複加入。
- **設定會寫進 `~/.claude.json`**：API key 會以明文存在這個檔案，這是這種加法的正常行為。

## 步驟三：重開 Claude Code 並驗證

新設定只有重開之後才會載入，正在跑的對話看不到。依序做這三件事：

1. 在同一個資料夾執行 `claude mcp list`，確認 `testrail` 那行是 `✔ Connected`。
2. 關掉並重開 Claude Code，或在對話裡輸入 `/mcp` 重新連線。
3. 跟 Claude 說「列出 TestRail 所有專案」。正常會列出 12 個專案，包含 inta、Gogaming、Intellianalyze、前台功能測試。

想繞過 Claude，直接確認帳號和 key 本身有沒有問題，可以跑這段：

```bash
cd ~/Desktop/QA-workflow
set -a; source .env; set +a
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -u "$TESTRAIL_USERNAME:$TESTRAIL_API_KEY" \
  "$TESTRAIL_INSTANCE_URL/index.php?/api/v2/get_statuses"
```

看到 `HTTP 200` 就代表帳密正確。

## 開啟寫入權限與其他設定

想讓 Claude 幫你新增或修改案例、回填測試結果，把 `.env` 的 `TESTRAIL_ALLOW_WRITE_OPERATIONS` 改成 `true`，再重跑一次步驟二和步驟三。

| 變數 | 用途 | 目前的值 |
| --- | --- | --- |
| `TESTRAIL_INSTANCE_URL` | TestRail 網址 | `https://gorun.testrail.io` |
| `TESTRAIL_USERNAME` | 登入帳號 | `ema@intellianalyze.com` |
| `TESTRAIL_API_KEY` | 代替密碼的金鑰 | 存在 `.env` |
| `TESTRAIL_ALLOW_WRITE_OPERATIONS` | 允許新增與修改 | `false` |
| `TESTRAIL_ALLOW_DELETE_OPERATIONS` | 允許刪除 | 未設定 |

後兩個建議沒必要就保持關閉。要加刪除權限的話，在 `.env` 加一行，並在步驟二的指令補上對應的 `--env`。

## 常見問題

| 症狀 | 原因 | 怎麼修 |
| --- | --- | --- |
| 顯示「已連線」，但查資料出現 `404 Not Found` | 網址還是範例的 `your-instance.testrail.io`，或網址打錯 | 檢查 `.env` 的網址，重跑步驟二 |
| 出現 `401` 或「驗證失敗」 | 帳號或 API key 不對，或 key 產生後沒按儲存 | 到 TestRail 個人設定重新產生 key，更新 `.env` 後重跑步驟二 |
| 重開後 Claude 還是說沒有 TestRail 工具 | 在別的資料夾開 Claude Code，而設定是 `local` | 在 `QA-workflow` 裡開，或改用 `--scope user` 重加 |
| `command not found: npx` | 沒裝 Node.js | 到 [Node.js 官網](https://nodejs.org) 安裝長期支援版 |
| `claude mcp list` 顯示連線失敗 | 第一次下載套件太久或網路不通 | 等一下再執行一次 `claude mcp list` |

第一個問題就是這次在舊電腦實際遇到的：照抄官方範例沒有換成真實的值。
