import { startCase } from '../../../../scripts/lib/qa.mjs';
import { TICKET, VARIANT, openTransfer, checkCombo, describe } from './_common.mjs';
const t = await startCase({ ticketDir: TICKET, caseId: 'TC-11', project: 'platform-web', variant: VARIANT });
await t.step('登入 m8 前台', '登入成功', async () => { await t.login(); return '已登入'; });
let tokens = [];
await t.step('打開存款視窗並切到 Transfer', '顯示 Transfer 內容', async page => {
  ({ tokens } = await openTransfer(page, { variant: VARIANT }));
  t.check(tokens.length > 0, '沒有拿到可存款的幣別清單');
  return `已打開，可存款幣別 ${tokens.length} 種`;
});
await t.step('找出 Transfer 頁除了最低金額之外的其他金額', '列出找到的其他金額', async page => {
  await checkCombo(page, 'USDT', 'ERC20');
  const dlg = page.getByRole('dialog').filter({ hasText: /Select currency|选择币种/ }).last();
  const text = (await dlg.innerText()).replace(/The minimum deposit amount is[^\n]*/g, '').replace(/0x[0-9a-fA-F ]+/g, '');
  const nums = [...text.matchAll(/\b\d+(?:[.,]\d+)?\s*(USDT|USDC|USD|\$)/g)].map(m => m[0]);
  if (!nums.length) t.block('Transfer 頁除了最低金額之外，畫面上沒有其他金額（沒有換算金額或上限）可以比對。建議改成人工測，或確認這條是否適用 Transfer 頁');
  return `找到：${nums.join('、')}`;
});
await t.finish();
