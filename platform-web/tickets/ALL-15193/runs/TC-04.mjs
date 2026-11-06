import { startCase } from '../../../../scripts/lib/qa.mjs';
import { TICKET, VARIANT, openTransfer, checkCombo, describe } from './_common.mjs';
const t = await startCase({ ticketDir: TICKET, caseId: 'TC-04', project: 'platform-web', variant: VARIANT });
await t.step('登入 m8 前台', '登入成功', async () => { await t.login(); return '已登入'; });
let tokens = [];
await t.step('打開存款視窗並切到 Transfer', '顯示 Transfer 內容', async page => {
  ({ tokens } = await openTransfer(page, { variant: VARIANT }));
  t.check(tokens.length > 0, '沒有拿到可存款的幣別清單');
  return `已打開，可存款幣別 ${tokens.length} 種`;
});
const COINS = ['BTC'];
const bad = [];
let count = 0;
for (const c of COINS) {
  const tk = tokens.find(x => x.currency === c);
  if (!tk) continue;
  for (const n of tk.networks) {
    count++;
    await t.step(`${c} ${n.desc}`, '無條件進位到 8 位', async page => {
      const x = await checkCombo(page, c, n.desc);
      if (!x.ok) bad.push(describe(x));
      return (x.ok ? '符合：' : '不符：') + describe(x);
    });
  }
}
await t.step('彙整結果', '全部符合', async () => {
  if (count === 0) t.block(`UAT 沒有開放 ${COINS.join('、')} 存款，無法測試`);
  t.check(bad.length === 0, `有 ${bad.length} 組不符：${bad.join('；')}`);
  return `${count} 組全部符合`;
});
await t.finish();
