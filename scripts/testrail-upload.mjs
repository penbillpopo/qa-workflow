// 把一張單的本機測試結果與截圖，直接上傳到 TestRail 的測試執行。不需要經過 AI。
// 用法：node scripts/testrail-upload.mjs <單號資料夾> [案例編號...]
// 例子：node scripts/testrail-upload.mjs platform-web/tickets/ALL-15193
// 會讀：
//   <單號資料夾>/ticket.md        的「TestRail 測試執行：R<編號>」
//   <單號資料夾>/test-cases.md    表格裡每條案例的 TestRail 編號（C<編號>）
//   <單號資料夾>/results/*.json   每條案例的結果與截圖路徑
// 只會新增結果，不會刪除或修改既有資料。帳密從 .env 讀，不會印出。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadEnv } from './lib/qa.mjs';

const [ticketArg, ...only] = process.argv.slice(2);
if (!ticketArg) { console.log('用法：node scripts/testrail-upload.mjs <單號資料夾> [案例編號...]'); process.exit(1); }
const ticketDir = path.resolve(ROOT, ticketArg);
const env = loadEnv();
const base = `${env.TESTRAIL_INSTANCE_URL.replace(/\/$/, '')}/index.php?/api/v2`;
const auth = 'Basic ' + Buffer.from(`${env.TESTRAIL_USERNAME}:${env.TESTRAIL_API_KEY}`).toString('base64');

const ticket = readFileSync(path.join(ticketDir, 'ticket.md'), 'utf8');
const runId = (ticket.match(/TestRail 測試執行：R(\d+)/) || [])[1];
if (!runId) { console.log('❌ ticket.md 找不到「TestRail 測試執行：R<編號>」'); process.exit(1); }

// 案例編號 → TestRail 案例編號
const map = {};
for (const line of readFileSync(path.join(ticketDir, 'test-cases.md'), 'utf8').split('\n')) {
  const m = line.match(/^\|\s*(TC-\d+)\s*\|.*\|\s*C(\d+)\s*\|\s*$/);
  if (m) map[m[1]] = Number(m[2]);
}

const STATUS = { passed: 1, blocked: 2, failed: 5 };
const LABEL = { passed: '通過', blocked: '阻擋', failed: '失敗' };
const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

async function api(method, endpoint, body, isForm = false) {
  const r = await fetch(`${base}/${endpoint}`, {
    method,
    headers: isForm ? { Authorization: auth } : { Authorization: auth, 'Content-Type': 'application/json' },
    body: isForm ? body : body && JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`TestRail 回應 ${r.status}：${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

const resDir = path.join(ticketDir, 'results');
const files = readdirSync(resDir).filter(f => /^TC-\d+.*\.json$/.test(f)).sort();
let ok = true;
for (const f of files) {
  const r = JSON.parse(readFileSync(path.join(resDir, f), 'utf8'));
  if (only.length && !only.includes(r.caseId)) continue;
  const caseId = map[r.caseId];
  if (!caseId) { console.log(`⚠️  ${r.caseId} 在 test-cases.md 沒有 TestRail 編號，略過`); continue; }

  const rows = r.steps.map(s => `| ${s.no}. ${cell(s.desc)} | ${cell(s.expected)} | ${cell(s.actual)} | ${LABEL[s.status] || s.status} |`);
  const comment = [
    r.variant ? `版型：${r.variant}` : '',
    '| 步驟 | 預期結果 | 實際結果 | 結果 |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    '由 Claude 自動執行，截圖見附件。',
  ].filter((l, i) => l || i > 0).join('\n');

  try {
    const res = await api('POST', `add_result_for_case/${runId}/${caseId}`, { status_id: STATUS[r.status] || 4, comment });
    let n = 0;
    for (const s of r.steps) {
      if (!s.screenshot) continue;
      const file = path.join(ticketDir, s.screenshot);
      if (!existsSync(file)) continue;
      const form = new FormData();
      form.append('attachment', new Blob([readFileSync(file)], { type: 'image/png' }), path.basename(file));
      await api('POST', `add_attachment_to_result/${res.id}`, form, true);
      n++;
    }
    console.log(`✅ ${r.caseId}（C${caseId}）${LABEL[r.status]}，上傳 ${n} 張截圖`);
  } catch (e) {
    ok = false;
    console.log(`❌ ${r.caseId}：${e.message}`);
  }
}
console.log(`\n測試執行：${env.TESTRAIL_INSTANCE_URL.replace(/\/$/, '')}/index.php?/runs/view/${runId}`);
process.exit(ok ? 0 : 1);
