// 從 .env 讀取設定，把 TestRail 與 Playwright 連線工具加進 Claude Code（只對這個專案資料夾生效）。
// 用法：在專案資料夾執行 node scripts/setup-mcp.mjs
// 可以重複執行：會先移除舊設定再重新加入。不會印出帳密。

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

const envPath = path.join(ROOT, '.env');
if (!existsSync(envPath)) {
  console.log('❌ 找不到 .env。請先把 .env.example 複製成 .env 並填好。');
  process.exit(1);
}
const env = Object.fromEntries(readFileSync(envPath, 'utf8').replace(/^﻿/, '').split(/\r?\n/)
  .filter(l => /^[A-Z_][A-Z0-9_]*=/.test(l))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]));

const need = ['TESTRAIL_INSTANCE_URL', 'TESTRAIL_USERNAME', 'TESTRAIL_API_KEY'];
const missing = need.filter(k => !env[k]);
if (missing.length) {
  console.log(`❌ .env 缺少：${missing.join('、')}`);
  process.exit(1);
}

// Windows 上要用 cmd /c 包住 npx，否則 Claude Code 啟動不了它。
const npx = isWin ? ['cmd', '/c', 'npx'] : ['npx'];

function claude(args) {
  // Windows 的 claude 可能是 .cmd，需要經過殼層；參數逐一加上引號，避免被拆開。
  const quoted = isWin ? args.map(a => (/[\s&|<>^"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)) : args;
  const r = spawnSync('claude', quoted, { cwd: ROOT, encoding: 'utf8', shell: isWin });
  if (r.error) {
    console.log('❌ 找不到 claude 指令。請先安裝 Claude Code，並重開終端機。');
    process.exit(1);
  }
  return r.status;
}

const servers = [
  {
    name: 'testrail',
    env: {
      TESTRAIL_INSTANCE_URL: env.TESTRAIL_INSTANCE_URL,
      TESTRAIL_USERNAME: env.TESTRAIL_USERNAME,
      TESTRAIL_API_KEY: env.TESTRAIL_API_KEY,
      TESTRAIL_ALLOW_WRITE_OPERATIONS: env.TESTRAIL_ALLOW_WRITE_OPERATIONS || 'true',
    },
    command: [...npx, '-y', '@uarlouski/testrail-mcp-server@latest'],
  },
  {
    name: 'playwright',
    env: {},
    command: [...npx, '-y', '@playwright/mcp@latest', '--output-dir', './.playwright-mcp'],
  },
];

function connected(name) {
  const r = spawnSync('claude', ['mcp', 'get', name], { cwd: ROOT, encoding: 'utf8', shell: isWin, timeout: 120000 });
  return /Connected|✔|✓/.test(`${r.stdout}${r.stderr}`);
}

function addServer(s, command) {
  claude(['mcp', 'remove', s.name, '--scope', 'local']);
  // --env 會吃掉後面所有參數，所以 --transport 一定要放在 --env 之後，名稱才不會被當成環境變數。
  const args = ['mcp', 'add', '--scope', 'local'];
  for (const [k, v] of Object.entries(s.env)) args.push('--env', `${k}=${v}`);
  args.push('--transport', 'stdio', s.name, '--', ...command);
  return claude(args) === 0;
}

let ok = true;
for (const s of servers) {
  console.log(`設定 ${s.name}…（第一次會下載套件，可能要一兩分鐘）`);
  let added = addServer(s, s.command);
  let live = added && connected(s.name);
  // Windows 上兩種寫法都試：先用 cmd /c 包住，連不上再改成直接執行 npx。
  if (!live && isWin) {
    added = addServer(s, s.command.slice(2));
    live = added && connected(s.name);
  }
  console.log(live ? `✅ ${s.name} 已加入並連線成功` : added ? `⚠️  ${s.name} 已加入，但連線測試沒有通過` : `❌ 加入 ${s.name} 失敗`);
  if (!live) ok = false;
}

console.log(ok
  ? '\n完成。請關掉 Claude Code 再重新打開，連線工具才會生效。之後可以執行 node scripts/doctor.mjs 確認。'
  : '\n有工具沒加成功。請把上面的訊息貼給 Claude，或在 Claude Code 裡輸入 /qa-help。');
process.exit(ok ? 0 : 1);
