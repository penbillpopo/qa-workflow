# ALL-14490：[GoGaming] Mission Bonus

- 狀態：討論中（建立流水線時的試跑單，未實際測試）
- 連結：https://inta.atlassian.net/browse/ALL-14490
- 討論文件：https://claude.ai/artifact/5koMQA4AKaVVZ6JcUMxqcg
- 類型：故事，上層大型工作 ALL-12059「GO BAU - Events」
- 專案：PlatformAdmin（後台設定）＋ PlatformWeb（玩家前台）
- 影響版型：子任務有 M1、M5、M10、Pubs
- 讀取日期：2026-11-06
- 期限：單子要求聖誕節前完成

## 需求摘要

新增「任務獎勵活動」（Mission Reward Event）。商戶在後台建立活動、設定合規玩家、配置任務與每個任務的獎品。玩家完成任務後自己按「領取」，獎品像存款紅利一樣發到優惠券頁等待激活。

後台建立流程有三步：基本設定 → 合規玩家 → 任務清單。

## 後台實際畫面（2026-11-06 在 UAT 探查）

- 入口：Marketing > Event > 「Mission Reward Event」卡片，網址 `/bonus/activity-manage/MissionEvent`。
- 列表頁：篩選欄位有 Event Name、Event Time、Event Status，按鈕有 Create Mission、Export。商戶 GB 目前沒有任何任務活動。
- 基本設定欄位：Event Name（必填，上限 40 字）、Event Sub-Name（上限 20 字）、Event Rules（文字編輯器）、Slogan、Event Time（必填）、Days to Claim (days)。
- 語系分頁：English、中文、ประเทศไทย、Việt Nam、한글、Türk Dili、Português、日本語、id、Türkçe、Uzbek、français、Deutsch、Español，另有 Show Currency 勾選。
- 截圖：`screenshots/recon/`。

## 任務類型

| 主類型 | 條件 | 達標計算 |
| --- | --- | --- |
| 登入 | 登入次數 | 活動期間累計登入次數 |
| 登入 | 連續登入天數 | 每天至少登入一次，中斷就重算；天數不能大於活動總天數 |
| 下注 | 指定遊戲廠商／類型／遊戲 | 單次達標，或每天達標 |
| 下注 | 下注次數 | 累計，或每日 |
| 下注 | 下注金額（USDT） | 累計，或每日 |
| 下注 | 下注金額（USDT）＋指定遊戲 | 累計，或每日 |
| 存款 | 存款金額（USDT） | 累計，或每日 |
| 存款 | 存款成功次數 | 累計，或每日 |
| 存款 | 連續存款成功天數 | 連續天數 |
| 玩家狀態 | KYC 等級：Basic、Intermediate、Advance | 活動期間 KYC 升到指定等級，依 KYC 更新時間判斷 |
| 推薦好友 | 推薦好友並完成存款 | 被推薦人註冊且存款成功的人數 |
| 累計完成任務 | 需完成任務數量 | 不能大於已配置的任務數 |

下注一律以注單狀態「結算」為準，存款以「成功」為準，金額換算成 USDT 判斷。

## 核心邏輯

1. 可以同時有多個任務活動。
2. 同一個玩家行為，會同時推進所有活動中所有符合條件的任務，包含同類型任務。
3. 獎品要玩家自己按領取，領取後發到優惠券頁等待激活。
4. 獎品只能設定 BW 紅利：BW 現金券、BW Free Spin、BW Free Chip。
5. 任務狀態：開始 → 可領取 → 已領取。
6. 用紅利下注不計。BW 加主錢包混合下注時，次數加 1，金額只取主錢包比例。
7. 「累計完成任務」不能大於現有任務數。刪除任務或儲存時都要檢查，並有指定的提示文案。
8. 玩家曾經合規參加過的活動，之後變成不合規也會保留到活動結束，進度照常累積。
9. 活動結束後，已達標但沒領的獎品，在「Days to Claim」天數內仍可領取，逾期失效。

## 前台調整（2026-10-20 更新）

- 任務放在優惠券紅利頁。
- 有進度大於 0 的任務會自動展開。
- 多個活動時，進度數量多的排前面，已完成的不算。
- 主卡片拿掉支援幣種。
- 活動條款改成圖示，不再是文字按鈕。
- 手機版領券按鈕縮短，電腦版不變。所有版本按鈕文字改成 Redeem Coupon／兌換優惠券。

## 指定文案

| 位置 | 中文 | 英文 |
| --- | --- | --- |
| Days to Claim 驚嘆號說明 | 此天数用于设置活动结束后的奖励领取宽限期。玩家在活动期间已完成但尚未领取的任务奖励，可在活动结束后 {{days}} 天内领取，逾期失效。 | This setting defines the reward claim grace period after the event ends. Rewards for missions completed during the event but not yet claimed remain claimable for {{days}} days after the event ends, after which they expire. |
| 刪除任務後少於累計完成任務數 | 删除后，任务总数将少于「累计完成任务」设置的数量。请先调整「累计完成任务」的数量，再删除任务。 | Deleting this task would reduce the total number of tasks below the “Complete X Missions” requirement. Please lower this requirement before deleting this task. |
| 累計完成任務數大於現有任務數 | 所需完成任务数量不能超过当前 Event 已配置的任务数量。 | Required mission count cannot exceed the number of missions configured for this Event. |

## 驗收條件

1. UI／UX 驗證：前台全部商戶、後台 GoGaming。
2. 測試全部任務類型，結果符合預期。
3. 獎品依照設定正確發出。
4. 前台資料顯示正確：文字、條款、圖片、圖示。
5. 測試核心邏輯。

## 子任務狀態（讀取當下）

| 子任務 | 內容 | 狀態 |
| --- | --- | --- |
| ALL-14685 | 後台前端 | UAT |
| ALL-14598 | 前台 UI，M1 | PENDING RELEASE |
| ALL-14621 | 前台 UI，M5 | PENDING RELEASE |
| ALL-14622 | 前台 UI，Pubs | PENDING RELEASE |
| ALL-14623 | 後台 UI | PENDING RELEASE |
| ALL-14596 | 後端 .net | 進行中 |
| ALL-14597 | 前台前端 | 進行中 |
| ALL-14599 | App | 進行中 |
| ALL-14600 | QA | 進行中 |
| ALL-15280 | 前台 UI，M10 | 待辦事項 |
| ALL-14601 | 前台重構 | 待辦事項 |

已知缺陷：ALL-15666「M1 任務頁活動規則跑版，與任務卡片重疊」，狀態待辦事項。

## 相關文件

- BRD：https://trident787.atlassian.net/browse/BR-801
- 附件 4 個：3 張截圖與流程圖 `Mission Bonus.drawio (2).svg`。目前的連線工具無法下載附件，內容沒有讀到。
- 單子沒有留言。

## 待確認

見 `test-cases.md` 最後一節。

## 決定紀錄

- 2026-11-06：這張單是建立流水線時的試跑單，未實際測試。
- 2026-11-06：PlatformWeb 暫停，前台案例不測。
