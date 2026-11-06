// 單獨執行腳本庫裡的動作，可以串接多個。每個動作做完會截圖。
// 用法：
//   node scripts/run-action.mjs <動作編號> [key=value ...] [<動作編號> [key=value ...]] ... [--headed] [--zh] [--keep]
//   參數也可以用 JSON：'{"merchant":"Epybet"}'（Windows 建議用 key=value）
// 例子：
//   node scripts/run-action.mjs platform-admin/open-mission-create merchant=Epybet common/date-range start=2026-11-20 end=2026-12-05
//   --headed  開出看得到的瀏覽器視窗
//   --zh      用中文介面（預設英文）
//   --keep    跑完不關瀏覽器，按 Enter 才關（搭配 --headed 用來觀察）
// 需要登入的動作會自動先登入。截圖存在 tmp/actions/<時間>/。

import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import readline from 'node:readline/promises';
import { ROOT, launchBrowser, login, mask } from './lib/qa.mjs';

const argv = process.argv.slice(2);
const headed = argv.includes('--headed');
const locale = argv.includes('--zh') ? 'zh-CN' : 'en-US';
const keep = argv.includes('--keep');
const rest = argv.filter(a => !a.startsWith('--'));

const steps = [];
for (let i = 0; i < rest.length; i++) {
  const id = rest[i];
  let params = {};
  if (rest[i + 1] && rest[i + 1].trim().startsWith('{')) {
    try { params = JSON.parse(rest[++i]); } catch { console.log(`❌ 參數不是正確的 JSON：${rest[i]}`); process.exit(1); }
  }
  // 也可以寫成 key=value，Windows 的 PowerShell 比較不會出錯
  while (rest[i + 1] && /^[A-Za-z_]\w*=/.test(rest[i + 1])) {
    const kv = rest[++i];
    params[kv.slice(0, kv.indexOf('='))] = kv.slice(kv.indexOf('=') + 1);
  }
  steps.push({ id, params });
}
if (!steps.length) {
  console.log('用法：node scripts/run-action.mjs <動作編號> [key=value ...] ...   動作清單見 scripts/library/INDEX.md');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const outDir = path.join(ROOT, 'tmp', 'actions', stamp);
mkdirSync(outDir, { recursive: true });

const browser = await launchBrowser({ headless: !headed });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale })).newPage();
const loggedIn = new Set();
let ok = true;

for (const [n, s] of steps.entries()) {
  const file = path.join(ROOT, 'scripts', 'library', `${s.id}.mjs`);
  if (!existsSync(file)) { console.log(`❌ 腳本庫沒有這個動作：${s.id}`); ok = false; break; }
  const mod = await import(pathToFileURL(file).href);
  const project = s.params.project || (mod.meta.project && !mod.meta.project.includes('、') ? mod.meta.project : null);
  try {
    if (mod.meta.needsLogin && project && !loggedIn.has(project)) {
      await login(page, project, s.params.variant);
      loggedIn.add(project);
      console.log(`✅ 已登入 ${project}`);
    }
    const out = await mod.run(page, s.params);
    if (mod.meta.id === 'common/login') loggedIn.add(s.params.project);
    console.log(`✅ ${s.id}：${mask(JSON.stringify(out ?? '完成'))}`);
  } catch (e) {
    ok = false;
    console.log(`❌ ${s.id}：${mask(e.message.split('\n')[0])}`);
  }
  const shot = path.join(outDir, `${String(n + 1).padStart(2, '0')}-${s.id.replace(/\//g, '_')}${ok ? '' : '-FAIL'}.png`);
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  console.log(`   截圖：${path.relative(ROOT, shot)}`);
  if (!ok) break;
}

if (keep && headed) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('瀏覽器保持開啟中，按 Enter 關閉…');
  rl.close();
}
await browser.close();
process.exit(ok ? 0 : 1);
