// 掃描腳本庫，依照每支腳本的 meta 重新產生 INDEX.md。
// 用法：node scripts/library/build-index.mjs
// 新增或修改腳本後都要執行一次。

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LIB = path.dirname(fileURLToPath(import.meta.url));
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.mjs') && f !== 'build-index.mjs') files.push(p);
  }
})(LIB);

const metas = [];
for (const f of files.sort()) {
  const mod = await import(pathToFileURL(f).href);
  if (!mod.meta || typeof mod.run !== 'function') {
    console.log(`⚠️  略過 ${path.relative(LIB, f)}：缺少 meta 或 run`);
    continue;
  }
  metas.push({ ...mod.meta, file: path.relative(LIB, f).split(path.sep).join('/') });
}

const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
let md = `# 腳本庫索引

這份檔案由 \`node scripts/library/build-index.mjs\` 自動產生，不要手動修改。

寫測試腳本前先看這裡：能用現成動作組合的，就不要重新摸索畫面。缺少的動作，用 \`/qa-script\` 建立後再加進來。

| 動作編號 | 做什麼 | 專案 | 需要先登入 | 副作用 | 最後驗證 |
| --- | --- | --- | --- | --- | --- |
`;
for (const m of metas) {
  md += `| \`${m.id}\` | ${esc(m.name)} | ${esc(m.project)} | ${m.needsLogin ? '是' : '否'} | ${esc(m.sideEffects)} | ${esc(m.verified)} |\n`;
}
md += `\n## 參數與注意事項\n`;
for (const m of metas) {
  md += `\n### ${m.id}\n\n${esc(m.name)}。檔案：\`scripts/library/${m.file}\`\n\n`;
  const params = Object.entries(m.params || {});
  md += params.length ? params.map(([k, v]) => `- \`${k}\`：${esc(v)}`).join('\n') + '\n' : '- 沒有參數\n';
  md += `- 回傳：${esc(m.returns)}\n`;
  if (m.notes) md += `- 注意：${esc(m.notes)}\n`;
}
md += `
## 怎麼用

單獨執行（會截圖到 \`tmp/actions/\`）：

\`\`\`
node scripts/run-action.mjs platform-admin/open-mission-create merchant=Epybet
node scripts/run-action.mjs --headed --keep common/login project=platform-admin   # 開出瀏覽器看著它跑
\`\`\`

在案例腳本裡組合：

\`\`\`js
import { run as openMissionCreate } from '../../../../scripts/library/platform-admin/open-mission-create.mjs';
await t.step('打開建立頁', '顯示基本設定頁', async page => { await openMissionCreate(page, { merchant: 'Epybet' }); return '已打開'; });
\`\`\`
`;
writeFileSync(path.join(LIB, 'INDEX.md'), md);
console.log(`已更新 INDEX.md，共 ${metas.length} 個動作。`);
