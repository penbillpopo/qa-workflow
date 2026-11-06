import { startCase } from '../../../../scripts/lib/qa.mjs';
import { TICKET, VARIANT, openTransfer, checkCombo, describe } from './_common.mjs';
const t = await startCase({ ticketDir: TICKET, caseId: 'TC-10', project: 'platform-web', variant: VARIANT, viewport: { width: 390, height: 844 } });
await t.step('登入 m8 前台', '登入成功', async () => { await t.login(); return '已登入'; });
let tokens = [];
await t.step('打開存款視窗並切到 Transfer', '手機排版顯示 Transfer 內容', async page => {
  ({ tokens } = await openTransfer(page, { variant: VARIANT }));
  t.check(tokens.length > 0, '沒有拿到可存款的幣別清單');
  return `已打開，可存款幣別 ${tokens.length} 種`;
});
async function fits(page) {
  const tip = page.getByRole('dialog').getByText(/minimum deposit amount is|最低|最少/).first();
  return tip.evaluate(el => {
    const r = el.getBoundingClientRect();
    return { inView: r.left >= 0 && r.right <= window.innerWidth + 1, overflow: el.scrollWidth > el.clientWidth + 1, text: el.innerText };
  });
}
for (const [c, n, label] of [['USDC', 'ERC20', '選 USDC Ethereum (ERC20)'], ['BTC', 'Bitcoin', '選 BTC Bitcoin（8 位小數）']]) {
  await t.step(label, '金額完整顯示，不截斷、不錯位', async page => {
    const x = await checkCombo(page, c, n);
    const f = await fits(page);
    t.check(f.inView && !f.overflow, `提示超出畫面或被截斷：${f.text}`);
    t.check(x.ok, `金額不符：${describe(x)}`);
    return `完整顯示「${f.text}」；${describe(x)}`;
  });
}
await t.finish();
