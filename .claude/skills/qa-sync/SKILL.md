---
name: qa-sync
description: QA 流水線第四階段：把已定案的 test-cases.md 建進 TestRail 的 Emma 專案，並建立測試執行。使用者說「同步 TestRail」「建到 TestRail」「/qa-sync」時使用。只處理 ticket.md 狀態為「已定案」的單。
---

# qa-sync：同步到 TestRail

> **回覆使用者時**：一律依照 `CLAUDE.md` 的「怎麼跟使用者說話」，用教學、引導的方式回覆。使用者可能完全不懂程式：說清楚現在在第幾步、剛剛做了什麼、他現在要做什麼（點哪裡、打什麼字）、接下來會發生什麼。不要對使用者提技能名稱或程式檔名。

遵守 `CLAUDE.md` 的 TestRail 規則：Emma 專案（project_id 9、suite_id 9），只能新增和修改，不能刪除。

## 1. 前置檢查

- `ticket.md` 狀態必須是「已定案」，否則停下來，用白話告訴使用者：案例還沒確定，要先在討論文件裡看完並說「定案」。
- 這是確認點三。開始寫入前，先用一句話列出要建立的內容（幾條案例、哪個資料夾、測試執行名稱），等使用者同意。

## 2. 資料夾

1. 用 `query_section` 列出 Emma 的區段。
2. 第一層找專案名稱：GoMoneyAdmin、PlatformAdmin、PlatformWeb。沒有就用 `mutate_section` 建立，`parent_id` 不填。
3. 第二層在專案底下找 `<單號> <單子標題>`，沒有就建立。區段說明填 Jira 連結和討論文件連結。
4. 同一張單重跑時，沿用既有區段，不重複建立。

## 3. 案例

每條案例用 `add_case`，已經有 TestRail 編號的改用 `update_case`：

- `title`：`<案例編號> <標題>`，例如 `TC-03 名稱與副標題字數上限`。
- `fields`：
  - `template_id`: 2
  - `refs`: Jira 單號
  - `priority_id`: 依案例重要性
  - `custom_preconds`: 前置條件
  - `custom_steps_separated`: 陣列，每步 `{"content": 步驟, "expected": 預期結果}`
  - `labels`: 依測試方式填「AI 測試」或「人工測試」
- 標籤的處理：先用 `get_labels` 查。已存在就用編號。不存在就先試著直接傳標籤名稱，建完再用 `get_labels` 確認有沒有自動建立。都不行就停下來告訴使用者，請管理員在 TestRail 建立這兩個標籤。
- 每建一條，就把 TestRail 編號（例如 `C1234`）寫回 `test-cases.md` 的對應欄位。

## 4. 測試執行

- 用 `mutate_run` 建立，名稱：`<單號> <中文短名> <YYYY-MM-DD>`。
- `case_ids` 只放這張單要測的案例。
- 說明欄寫 Jira 連結、討論文件連結、測試環境 UAT。
- 把測試執行編號寫進 `ticket.md`：`- TestRail 測試執行：R<編號>`。

## 5. 收尾

- `ticket.md` 狀態改為「已同步」。
- 回報：建立了幾條案例、測試執行連結（`https://gorun.testrail.io/index.php?/runs/view/<編號>`）、AI 與人工各幾條。
- 用白話告訴使用者下一步：由 Claude 自動測試標為 AI 測試的案例；標為人工測試的，要請他自己測，並教他在 TestRail 的哪裡填結果。
