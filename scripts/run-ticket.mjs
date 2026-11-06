// 不經過 AI，直接重跑一張單所有已寫好的案例腳本（回歸測試）。
// 用法：node scripts/run-ticket.mjs <單號資料夾> [案例編號...]
// 例子：node scripts/run-ticket.mjs platform-admin/tickets/ALL-14490
//       node scripts/run-ticket.mjs platform-admin/tickets/ALL-14490 TC-03 TC-05
// 結果寫在 <單號資料夾>/results/，截圖在 <單號資料夾>/screenshots/。

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './lib/qa.mjs';

const [ticketArg, ...only] = process.argv.slice(2);
if (!ticketArg) { console.log('用法：node scripts/run-ticket.mjs <單號資料夾> [案例編號...]'); process.exit(1); }
const ticketDir = path.resolve(ROOT, ticketArg);
const runsDir = path.join(ticketDir, 'runs');
if (!existsSync(runsDir)) { console.log(`❌ 找不到 ${path.relative(ROOT, runsDir)}，這張單還沒有案例腳本。`); process.exit(1); }

const scripts = readdirSync(runsDir).filter(f => f.endsWith('.mjs') && !f.startsWith('_'))  // _ 開頭是共用檔，不是案例
  .filter(f => !only.length || only.includes(f.replace(/\.mjs$/, '')))
  .sort();
if (!scripts.length) { console.log('沒有符合的案例腳本。'); process.exit(1); }

const summary = [];
for (const f of scripts) {
  const caseId = f.replace(/\.mjs$/, '');
  console.log(`\n▶ ${caseId}`);
  const r = spawnSync(process.execPath, [path.join(runsDir, f)], { cwd: ROOT, stdio: 'inherit', timeout: 10 * 60 * 1000 });
  // 結果檔可能帶版型，例如 TC-01-m8.json
  const resDir = path.join(ticketDir, 'results');
  const hit = existsSync(resDir) ? readdirSync(resDir).find(f => f === `${caseId}.json` || f.startsWith(`${caseId}-`)) : null;
  const resultFile = hit ? path.join(resDir, hit) : path.join(resDir, `${caseId}.json`);
  let status = r.status === 0 ? 'passed' : 'error';
  if (existsSync(resultFile)) {
    try { status = JSON.parse(readFileSync(resultFile, 'utf8')).status; } catch {}
  }
  summary.push({ caseId, status });
}

const label = { passed: '✅ 通過', failed: '❌ 失敗', blocked: '⛔ 阻擋', error: '⚠️  腳本出錯' };
console.log('\n結果總覽');
for (const s of summary) console.log(`${label[s.status] || s.status}  ${s.caseId}`);
const c = k => summary.filter(s => s.status === k).length;
console.log(`\n通過 ${c('passed')}、失敗 ${c('failed')}、阻擋 ${c('blocked')}、腳本出錯 ${c('error')}`);
process.exit(summary.every(s => s.status === 'passed') ? 0 : 1);
