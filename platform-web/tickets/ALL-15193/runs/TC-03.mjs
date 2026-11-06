import { startCase } from '../../../../scripts/lib/qa.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../../../scripts/lib/qa.mjs';
import { TICKET, VARIANT, openTransfer, checkCombo, describe } from './_common.mjs';
const t = await startCase({ ticketDir: TICKET, caseId: 'TC-03', project: 'platform-web', variant: VARIANT });
await t.step('登入 m8 前台', '登入成功', async () => { await t.login(); return '已登入'; });
let tokens = [];
await t.step('打開存款視窗並切到 Transfer', '顯示 Transfer 內容', async page => {
  ({ tokens } = await openTransfer(page, { variant: VARIANT }));
  t.check(tokens.length > 0, '沒有拿到可存款的幣別清單');
  return `已打開，可存款幣別 ${tokens.length} 種`;
});
const all = [];
for (const tk of tokens) for (const n of tk.networks) {
  await t.step(`${tk.currency} ${n.desc}`, '等於依位數無條件進位的結果，不低於門檻', async page => {
    const x = await checkCombo(page, tk.currency, n.desc);
    all.push(x);
    return (x.ok ? '符合：' : '不符：') + describe(x) + (x.below ? '（低於門檻）' : '');
  });
}
await t.step('彙整所有幣別與網路的比對表', '全部符合，沒有任何一組低於門檻', async () => {
  const dir = path.join(ROOT, TICKET, 'results'); mkdirSync(dir, { recursive: true });
  const rows = all.map(x => `| ${x.currency} | ${x.network} | ${x.backendMinDeposit} | ${x.places} | ${x.expected} | ${x.shownAmount} | ${x.ok ? '符合' : '不符'}${x.below ? '，低於門檻' : ''} |`);
  writeFileSync(path.join(dir, 'TC-03-比對表.md'), '| 幣別 | 網路 | 後端原始值 | 進位位數 | 應顯示 | 畫面顯示 | 結果 |\n| --- | --- | --- | --- | --- | --- | --- |\n' + rows.join('\n') + '\n');
  const bad = all.filter(x => !x.ok), below = all.filter(x => x.below);
  t.check(bad.length === 0, `${all.length} 組中有 ${bad.length} 組不符：${bad.map(describe).join('；')}`);
  t.check(below.length === 0, `有 ${below.length} 組低於門檻`);
  return `${all.length} 組全部符合，比對表存在 results/TC-03-比對表.md`;
});
await t.finish();
