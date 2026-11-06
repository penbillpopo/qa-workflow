import { startCase } from '../../../../scripts/lib/qa.mjs';
import { TICKET, VARIANT, openTransfer, checkCombo, describe } from './_common.mjs';
const t = await startCase({ ticketDir: TICKET, caseId: 'TC-01', project: 'platform-web', variant: VARIANT });
await t.step('登入 m8 前台', '登入成功', async () => { await t.login(); return '已登入'; });
let tokens = [];
await t.step('打開存款視窗並切到 Transfer', '顯示 Transfer 內容', async page => {
  ({ tokens } = await openTransfer(page, { variant: VARIANT }));
  t.check(tokens.length > 0, '沒有拿到可存款的幣別清單');
  return `已打開，可存款幣別 ${tokens.length} 種`;
});
await t.step('選 USDC 與 Ethereum (ERC20) 並讀取最低金額', '後端 0.00000001 時顯示 0.01 USDC，不會是 0', async page => {
  const x = await checkCombo(page, 'USDC', 'ERC20');
  t.check(x.shownAmount !== '0' && x.shownAmount !== '0.00', `畫面顯示 0：${describe(x)}`);
  t.check(x.ok, `顯示值不符：${describe(x)}`);
  return describe(x);
});
await t.finish();
