// 環境健康檢查。Windows 與 Mac 都能用。
// 用法：node scripts/doctor.mjs            一般檢查
//       node scripts/doctor.mjs --skip-login 不實際登入後台（比較快）
//       node scripts/doctor.mjs --json      輸出 JSON，給 qa-help 技能判讀
// 不會印出任何帳密。

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const args = new Set(process.argv.slice(2));
const results = [];

function add(id, name, ok, detail, fix = '', level = ok ? 'ok' : 'error') {
  results.push({ id, name, ok, level, detail, fix });
}
function run(cmd, cmdArgs = [], opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', shell: isWin, cwd: ROOT, timeout: 120000, ...opts });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}`.trim(), error: r.error };
}

// 1. 作業系統與路徑
add('os', '作業系統', true, `${isWin ? 'Windows' : process.platform === 'darwin' ? 'macOS' : process.platform} ${os.release()}`);
if (/[^\x00-\x7F]/.test(ROOT) || /\s/.test(ROOT)) {
  add('path', '專案路徑', false, `路徑含有中文或空白：${ROOT}`,
    '部分工具遇到中文或空白路徑會出錯。建議把資料夾搬到 C:\\QA-workflow 這種純英文、無空白的位置。', 'warn');
} else add('path', '專案路徑', true, ROOT);
if (/OneDrive/i.test(ROOT)) {
  add('onedrive', 'OneDrive 同步', false, '專案放在 OneDrive 資料夾內',
    'OneDrive 同步會鎖住檔案，造成安裝或截圖失敗。請把資料夾搬到 OneDrive 以外，例如 C:\\QA-workflow。', 'warn');
}

// 2. Node.js
const major = Number(process.versions.node.split('.')[0]);
add('node', 'Node.js', major >= 18, `v${process.versions.node}`,
  isWin ? '請安裝 Node.js 長期支援版：在 PowerShell 執行 winget install OpenJS.NodeJS.LTS，裝完關掉終端機重開。'
        : '請安裝 Node.js 長期支援版：https://nodejs.org');

// 3. Git
const git = run('git', ['--version']);
add('git', 'Git', git.code === 0, git.code === 0 ? git.out : '找不到 git 指令',
  isWin ? '請在 PowerShell 執行 winget install Git.Git，裝完關掉終端機重開。Windows 版 Claude Code 也需要它。'
        : '請執行 xcode-select --install 或從 https://git-scm.com 安裝。');

// 4. Claude Code
const claude = run('claude', ['--version']);
add('claude', 'Claude Code', claude.code === 0, claude.code === 0 ? claude.out : '找不到 claude 指令',
  '請依照 README.md 安裝 Claude Code，裝完關掉終端機重開。');

// 5. 專案套件
const pwInstalled = existsSync(path.join(ROOT, 'node_modules', 'playwright'));
add('deps', '專案套件', pwInstalled, pwInstalled ? '已安裝' : '尚未安裝',
  '在專案資料夾執行 npm install。');

// 6. 瀏覽器
if (pwInstalled) {
  const probe = run(process.execPath, ['-e', `
    import('playwright').then(async ({ chromium }) => {
      for (const o of [{ channel: 'chrome' }, {}]) {
        try { const b = await chromium.launch({ ...o, headless: true }); await b.close(); console.log(o.channel ? 'chrome' : 'chromium'); return; } catch {}
      }
      console.log('none');
    });`], { shell: false });
  const which = probe.out.split('\n').pop();
  add('browser', '瀏覽器', which !== 'none',
    which === 'chrome' ? 'Google Chrome 可用' : which === 'chromium' ? '使用 Playwright 內建瀏覽器' : '沒有可用的瀏覽器',
    isWin ? '請安裝 Google Chrome：winget install Google.Chrome。或在專案資料夾執行 npx playwright install chromium。'
          : '請安裝 Google Chrome，或在專案資料夾執行 npx playwright install chromium。');
}

// 7. .env
const envPath = path.join(ROOT, '.env');
let env = {};
const REQUIRED = ['TESTRAIL_INSTANCE_URL', 'TESTRAIL_USERNAME', 'TESTRAIL_API_KEY', 'GOMONEY_ADMIN_USERNAME', 'GOMONEY_ADMIN_PASSWORD',
  'PLATFORM_ADMIN_USERNAME', 'PLATFORM_ADMIN_PASSWORD', 'OTP_CODE'];
if (!existsSync(envPath)) {
  add('env', '設定檔 .env', false, '找不到 .env',
    existsSync(path.join(ROOT, '.env.txt')) ? '檔名變成 .env.txt 了（Windows 預設隱藏副檔名）。請改名為 .env。'
      : '把 .env.example 複製一份並改名為 .env，再填入帳密。');
} else {
  const text = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  env = Object.fromEntries(text.split(/\r?\n/).filter(l => /^[A-Z_][A-Z0-9_]*=/.test(l))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]));
  const missing = REQUIRED.filter(k => !env[k]);
  add('env', '設定檔 .env', missing.length === 0,
    missing.length ? `這些欄位還是空的：${missing.join('、')}` : '必填欄位都有值',
    '打開 .env 填入缺少的值。帳號、密碼、OTP 向主管索取；TestRail API key 自己到 TestRail 個人設定產生。');
}

// 8. TestRail 連線
if (env.TESTRAIL_INSTANCE_URL && env.TESTRAIL_USERNAME && env.TESTRAIL_API_KEY) {
  try {
    const auth = Buffer.from(`${env.TESTRAIL_USERNAME}:${env.TESTRAIL_API_KEY}`).toString('base64');
    const r = await fetch(`${env.TESTRAIL_INSTANCE_URL.replace(/\/$/, '')}/index.php?/api/v2/get_projects`,
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) });
    let detail = `HTTP ${r.status}`;
    let ok = r.status === 200;
    if (ok) {
      const data = await r.json();
      const list = Array.isArray(data) ? data : data.projects || [];
      const emma = list.some(p => p.name === 'Emma');
      detail = emma ? '連線成功，看得到 Emma 專案' : '連線成功，但看不到 Emma 專案';
      if (!emma) { ok = false; }
    }
    add('testrail', 'TestRail 連線', ok, detail,
      r.status === 401 ? '帳號或 API key 錯誤。到 TestRail 個人設定重新產生 key，記得按 Save Settings，再更新 .env。'
      : r.status === 404 ? 'TestRail 網址錯誤，應該是 https://gorun.testrail.io。'
      : r.status === 200 ? '請主管把你的 TestRail 帳號加入 Emma 專案。'
      : '請確認網路，或稍後再試。');
  } catch (e) {
    add('testrail', 'TestRail 連線', false, `連不上：${e.name}`, '請確認網路，公司網路可能需要 VPN。');
  }
}

// 9. Claude Code 連線工具
if (claude.code === 0) {
  const list = run('claude', ['mcp', 'list']);
  const line = name => list.out.split('\n').find(l => l.toLowerCase().startsWith(name)) || '';
  for (const [id, name] of [['mcp-testrail', 'testrail'], ['mcp-playwright', 'playwright']]) {
    const l = line(name);
    const ok = /Connected|✔|✓/.test(l);
    add(id, `連線工具 ${name}`, ok, l ? l.replace(/\s+/g, ' ').slice(0, 120) : '尚未加入',
      '在專案資料夾執行 node scripts/setup-mcp.mjs，完成後重開 Claude Code。');
  }
}

// 10. UAT 後台登入
if (!args.has('--skip-login') && pwInstalled && REQUIRED.slice(3).every(k => env[k])) {
  const login = run(process.execPath, [path.join('scripts', 'login-check.mjs')], { shell: false });
  for (const l of login.out.split('\n').filter(l => /登入(成功|失敗)/.test(l))) {
    const ok = l.startsWith('登入成功');
    add(`login-${l.split(' ')[1]?.replace(/[：:].*/, '')}`, `後台登入 ${l.split(' ')[1]?.replace(/[：:].*/, '')}`, ok, l,
      '確認 .env 的帳號、密碼、OTP_CODE 正確；如果是「網址不在 UAT 清單」，代表被導到別的網址，請回報主管。');
  }
}

// ---------- 輸出 ----------
if (args.has('--json')) {
  console.log(JSON.stringify({ root: ROOT, platform: process.platform, results }, null, 2));
} else {
  const icon = r => r.level === 'ok' ? '✅' : r.level === 'warn' ? '⚠️ ' : '❌';
  console.log('\nQA 環境檢查\n');
  for (const r of results) {
    console.log(`${icon(r)} ${r.name}：${r.detail}`);
    if (!r.ok && r.fix) console.log(`   → ${r.fix}`);
  }
  const bad = results.filter(r => r.level === 'error').length;
  console.log(bad ? `\n還有 ${bad} 個問題要處理。` : '\n全部通過，可以開始使用。');
}
process.exit(results.some(r => r.level === 'error') ? 1 : 0);
