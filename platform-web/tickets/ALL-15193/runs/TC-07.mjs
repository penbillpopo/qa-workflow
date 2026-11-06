import { startCase } from '../../../../scripts/lib/qa.mjs';
import { ceilTo, sameAmount, trim } from '../../../../scripts/lib/amount.mjs';
import { placesFor, TICKET, VARIANT, openTransfer, checkCombo, describe } from './_common.mjs';
const t = await startCase({ ticketDir: TICKET, caseId: 'TC-07', project: 'platform-web', variant: VARIANT });
await t.step('登入 m8 前台', '登入成功', async () => { await t.login(); return '已登入'; });
let tokens = [];
await t.step('打開存款視窗並切到 Transfer', '顯示 Transfer 內容', async page => {
  ({ tokens } = await openTransfer(page, { variant: VARIANT }));
  t.check(tokens.length > 0, '沒有拿到可存款的幣別清單');
  return `已打開，可存款幣別 ${tokens.length} 種`;
});
// 找出後端門檻本來就在進位位數內（整數或小數位數不超過）的組合，畫面要原樣顯示
const found = [];
const bad = [];
await t.step('找出門檻不需要進位的幣別與網路', '至少找到一組', async page => {
  for (const tk of tokens) for (const n of tk.networks) {
    const x = await checkCombo(page, tk.currency, n.desc);
    if (sameAmount(ceilTo(x.backendMinDeposit, placesFor(tk.currency)), x.backendMinDeposit)) found.push(x);
  }
  if (!found.length) t.block('UAT 目前沒有門檻剛好在位數內的幣別，無法測這條');
  return `找到 ${found.length} 組：` + found.map(x => `${x.currency} ${x.network}（${trim(x.backendMinDeposit)}）`).join('、');
});
for (const x0 of found.slice(0, 5)) {
  await t.step(`${x0.currency} ${x0.network}`, '與後端值相同，沒有多進一位', async page => {
    const x = await checkCombo(page, x0.currency, x0.network);
    const ok = sameAmount(x.shownAmount, x.backendMinDeposit);
    if (!ok) bad.push(describe(x));
    return (ok ? '符合：' : '不符：') + describe(x);
  });
}
await t.step('彙整結果', '全部原樣顯示', async () => {
  t.check(bad.length === 0, `有 ${bad.length} 組多進了一位：${bad.join('；')}`);
  return `${Math.min(found.length, 5)} 組全部原樣顯示`;
});
await t.finish();
