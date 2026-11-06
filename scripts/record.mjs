// 打開一個會錄製操作的瀏覽器，讓使用者示範一次流程。關掉瀏覽器視窗就結束錄製。
// 用法：
//   node scripts/record.mjs --project platform-web --variant m8 --name 註冊
//   node scripts/record.mjs --project platform-web --variant m8 --login --name 初級KYC
//   node scripts/record.mjs --project platform-admin --login --name KYC審核
// 選項：
//   --project   platform-web、platform-admin、gomoney-admin（必填）
//   --variant   前台版型，預設 m8
//   --login     先用 .env 的帳號自動登入，再開始錄（錄登入以外的流程時用）
//   --url       起始網址（選填，預設是該專案的首頁或登入頁）
//   --mobile    用手機尺寸錄
//   --name      這次錄的是什麼，用在檔名
//   --dry-run   只做登入與準備，不打開錄製視窗（測試用）
//   --postprocess <路徑前綴>  只做錄完後的整理，例如 tmp/recordings/20261106-註冊
// 產出（都在 tmp/recordings/，不會進 git）：
//   <時間>-<名稱>.mjs       錄到的操作。帳密會被換成 <變數名稱>，不會留明碼
//   <時間>-<名稱>-api.md    錄製期間網頁呼叫的後端 API 摘要（網址、狀態、回傳的欄位名稱）

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { ROOT, PROJECTS, webBaseUrl, launchBrowser, login, loadEnv } from './lib/qa.mjs';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null; };
const flag = k => argv.includes(`--${k}`);

const project = opt('project');
const variant = opt('variant') || 'm8';
const name = (opt('name') || '錄製').replace(/[\\/:*?"<>|\s]+/g, '_');
if (!PROJECTS[project]) { console.log('❌ 請用 --project 指定 platform-web、platform-admin 或 gomoney-admin'); process.exit(1); }

const isWeb = PROJECTS[project].kind === 'web';
const startUrl = opt('url') || (isWeb ? `${webBaseUrl(variant)}/` : PROJECTS[project].loginUrl.replace(/\/login$/, '/'));
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const dir = path.join(ROOT, 'tmp', 'recordings');
mkdirSync(dir, { recursive: true });
mkdirSync(path.join(ROOT, '.auth'), { recursive: true });
// --postprocess <路徑前綴>：只做錄完後的整理（去識別化、API 摘要），用來測試或補救
const post = opt('postprocess');
const base = post ? path.resolve(ROOT, post) : path.join(dir, `${stamp}-${name}`);
const scriptFile = `${base}.mjs`, harFile = `${base}.har`, apiFile = `${base}-api.md`;
const viewport = flag('mobile') ? '390,844' : '1600,1000';

let code = 0;
if (!post) {
// 1. 需要的話先自動登入，存下登入狀態
let storage = null;
if (flag('login')) {
  storage = path.join(ROOT, '.auth', `${project}${isWeb ? '-' + variant : ''}.json`);
  console.log('先自動登入…');
  const b = await launchBrowser({ headless: true });
  const ctx = await b.newContext({ viewport: { width: Number(viewport.split(',')[0]), height: Number(viewport.split(',')[1]) } });
  const page = await ctx.newPage();
  await login(page, project, variant);
  await ctx.storageState({ path: storage });
  await b.close();
  console.log('✅ 已登入，錄製視窗會從登入後的狀態開始');
}
if (flag('dry-run')) { console.log(`（測試模式）準備完成，起始網址：${startUrl}`); process.exit(0); }

// 2. 打開錄製視窗
const args = ['playwright', 'codegen', '--target', 'javascript', '-o', scriptFile, '--save-har', harFile,
  '--viewport-size', viewport, startUrl];
if (storage) args.splice(2, 0, '--load-storage', storage);
const { chromium } = await import('playwright');
const hasChrome = await chromium.launch({ channel: 'chrome', headless: true }).then(async b => { await b.close(); return true; }).catch(() => false);
if (hasChrome) args.splice(2, 0, '--channel', 'chrome');
console.log('\n🎬 錄製視窗打開了。請照平常的方式操作一次，做完把瀏覽器視窗關掉就會結束錄製。\n');
code = await new Promise(res => {
  const p = spawn('npx', args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  p.on('exit', res);
});
}

// 3. 帳密去識別化：把 .env 裡的值換成 <變數名稱>
const env = loadEnv();
const secrets = Object.entries(env).filter(([k, v]) => v && v.length >= 3 && /USERNAME|PASSWORD|OTP|KEY|TOKEN|SECRET/.test(k))
  .sort((a, b) => b[1].length - a[1].length);
if (existsSync(scriptFile)) {
  let s = readFileSync(scriptFile, 'utf8');
  for (const [k, v] of secrets) s = s.split(v).join(`<${k}>`);
  writeFileSync(scriptFile, s);
}

// 4. 從網路紀錄整理後端 API 摘要，原始紀錄含登入憑證，整理完就刪掉
if (existsSync(harFile)) {
  try {
    const har = JSON.parse(readFileSync(harFile, 'utf8'));
    const seen = new Set();
    const rows = [];
    for (const e of har.log.entries || []) {
      const ct = (e.response.content && e.response.content.mimeType) || '';
      if (!/json/.test(ct)) continue;
      const u = new URL(e.request.url);
      const key = `${e.request.method} ${u.origin}${u.pathname}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let fields = '';
      try {
        const body = JSON.parse(e.response.content.text || '{}');
        const sample = Array.isArray(body.data) ? body.data[0] : body.data ?? body;
        fields = sample && typeof sample === 'object' ? Object.keys(sample).slice(0, 15).join(', ') : '';
      } catch {}
      let line = `| ${e.request.method} | ${u.pathname}${u.search ? '?' + [...u.searchParams.keys()].map(k => k + '=').join('&') : ''} | ${e.response.status} | ${fields} |`;
      for (const [k, v] of secrets) line = line.split(v).join(`<${k}>`);
      rows.push(line);
    }
    writeFileSync(apiFile, `# 錄製期間呼叫的後端 API\n\n只列回傳 JSON 的請求，同一個網址只列一次。查詢參數只留名稱。\n\n| 方法 | 路徑 | 狀態 | 回傳欄位 |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n`);
  } catch (e) { console.log('⚠️  網路紀錄整理失敗：' + e.message); }
  rmSync(harFile, { force: true });
}

const steps = existsSync(scriptFile) ? (readFileSync(scriptFile, 'utf8').match(/await page\d*\./g) || []).length : 0;
console.log(steps ? `\n✅ 錄製完成，記錄到 ${steps} 個操作。` : '\n⚠️  沒有錄到任何操作。');
console.log(`操作紀錄：${path.relative(ROOT, scriptFile)}`);
if (existsSync(apiFile)) console.log(`後端 API 摘要：${path.relative(ROOT, apiFile)}`);
process.exit(code === 0 || steps ? 0 : 1);
