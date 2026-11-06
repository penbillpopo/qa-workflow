import { startCase, dismissWebPopups } from '../../../../scripts/lib/qa.mjs';
import { TICKET, VARIANT, openTransfer, checkCombo, describe } from './_common.mjs';

// 前台語言是帳號偏好，不跟瀏覽器語系走。m8 的語言選單只有 English、Português、Español。
const t = await startCase({ ticketDir: TICKET, caseId: 'TC-09', project: 'platform-web', variant: VARIANT });
await t.step('登入 m8 前台', '登入成功', async () => { await t.login(); return '已登入'; });
await t.step('英文介面：打開 Transfer，選 USDC Ethereum (ERC20)', '顯示 The minimum deposit amount is 與正確金額', async page => {
  await openTransfer(page, { variant: VARIANT });
  const x = await checkCombo(page, 'USDC', 'ERC20');
  t.check(/^The minimum deposit amount is \S+ USDC$/.test(x.shownText), `英文提示句不對：${x.shownText}`);
  t.check(x.ok, `金額不符：${describe(x)}`);
  return `提示句：「${x.shownText}」；${describe(x)}`;
});
await t.step('中文介面：查看語言選單有沒有中文', '可以切換成中文並顯示中文提示句', async page => {
  await page.goto(`${page.url().split('?')[0]}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await dismissWebPopups(page);
  await page.getByText(/^\s*English\s*$/).last().click();
  await page.waitForTimeout(1000);
  const options = (await page.locator('.cdk-overlay-pane').last().innerText()).split('\n').map(s => s.trim()).filter(Boolean);
  await page.mouse.click(5, 5);
  if (!options.some(o => /中文|简体|繁體|Chinese/.test(o))) t.block(`m8 沒有中文介面，語言選單只有：${options.join('、')}。中文這半條無法測`);
  return `語言選單：${options.join('、')}`;
});
await t.finish();
