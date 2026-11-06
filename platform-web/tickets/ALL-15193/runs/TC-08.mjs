import { startCase } from '../../../../scripts/lib/qa.mjs';
import { TICKET, VARIANT, openTransfer, checkCombo, describe } from './_common.mjs';
const t = await startCase({ ticketDir: TICKET, caseId: 'TC-08', project: 'platform-web', variant: VARIANT });
await t.step('登入 m8 前台', '登入成功', async () => { await t.login(); return '已登入'; });
let tokens = [];
await t.step('打開存款視窗並切到 Transfer', '顯示 Transfer 內容', async page => {
  ({ tokens } = await openTransfer(page, { variant: VARIANT }));
  t.check(tokens.length > 0, '沒有拿到可存款的幣別清單');
  return `已打開，可存款幣別 ${tokens.length} 種`;
});
let a1, b1;
await t.step('選幣別甲：USDT Ethereum (ERC20)', '顯示 USDT 的金額', async page => {
  a1 = await checkCombo(page, 'USDT', 'ERC20');
  t.check(a1.shownCurrency === 'USDT', `畫面幣別不是 USDT：${a1.shownText}`);
  return describe(a1);
});
await t.step('換成幣別乙：USDC Solana (SOL)', '金額更新為 USDC 的值，沒有殘留 USDT', async page => {
  b1 = await checkCombo(page, 'USDC', 'Solana (SOL)');
  t.check(b1.shownCurrency === 'USDC', `畫面幣別沒有更新：${b1.shownText}`);
  t.check(b1.ok, `金額不符：${describe(b1)}`);
  return describe(b1);
});
await t.step('再切回 USDT Ethereum (ERC20)', '金額回到 USDT 的值', async page => {
  const a2 = await checkCombo(page, 'USDT', 'ERC20');
  t.check(a2.shownCurrency === 'USDT' && a2.shownAmount === a1.shownAmount, `沒有回到原本的值：第一次 ${a1.shownText}，現在 ${a2.shownText}`);
  return describe(a2);
});
await t.finish();
