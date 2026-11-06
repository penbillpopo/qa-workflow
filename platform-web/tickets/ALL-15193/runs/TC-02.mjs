import { startCase } from '../../../../scripts/lib/qa.mjs';
import { TICKET, VARIANT, openTransfer, checkCombo, describe } from './_common.mjs';
const t = await startCase({ ticketDir: TICKET, caseId: 'TC-02', project: 'platform-web', variant: VARIANT });
await t.step('登入 m8 前台', '登入成功', async () => { await t.login(); return '已登入'; });
let tokens = [];
await t.step('打開存款視窗並切到 Transfer', '顯示 Transfer 內容', async page => {
  ({ tokens } = await openTransfer(page, { variant: VARIANT }));
  t.check(tokens.length > 0, '沒有拿到可存款的幣別清單');
  return `已打開，可存款幣別 ${tokens.length} 種`;
});
const usdt = () => (tokens.find(x => x.currency === 'USDT') || { networks: [] }).networks;
const bad = [];
for (const n of usdt()) {
  await t.step(`USDT ${n.desc}`, '無條件進位到 2 位', async page => {
    const x = await checkCombo(page, 'USDT', n.desc);
    if (!x.ok) bad.push(describe(x));
    return (x.ok ? '符合：' : '不符：') + describe(x);
  });
}
await t.step('彙整 USDT 各網路結果', '每個網路都符合', async () => {
  t.check(usdt().length > 0, '沒有找到 USDT 的網路');
  t.check(bad.length === 0, `有 ${bad.length} 個網路不符：${bad.join('；')}`);
  return `${usdt().length} 個網路全部符合`;
});
await t.finish();
