export const meta = {
  id: 'platform-admin/select-merchant',
  name: '在列表頁切換商戶',
  project: 'platform-admin',
  needsLogin: true,
  params: { merchant: '商戶名稱，例如 Epybet、GB、Vwin、PUBS.com（必填）' },
  returns: '切換後顯示的商戶名稱',
  sideEffects: '無',
  notes: '中英文介面都可用。用在有「Merchant：」（中文介面為「商户：」）下拉選單的列表頁，例如活動列表。GB 是平台預設商戶（tenantId -1），沒有 VIP 等級，建立活動請用 Epybet（tenantId 10）。',
  verified: '2026-11-06',
};

export async function run(page, { merchant } = {}) {
  if (!merchant) throw new Error('缺少參數 merchant');
  // 介面語言跟著瀏覽器語系：英文是「Merchant：」，中文是「商户：」
  const select = page.getByText(/^(Merchant|商户)\s*[：:]/).first().locator('xpath=..').locator('mat-select');
  await select.waitFor({ state: 'visible', timeout: 15000 });
  const current = (await select.innerText()).trim();
  if (current === merchant) return current;
  await select.click();
  const option = page.locator('mat-option', { hasText: new RegExp(`^\\s*${merchant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) });
  if (!(await option.count())) {
    const all = await page.$$eval('mat-option', os => os.map(o => o.innerText.trim()));
    await page.keyboard.press('Escape');
    throw new Error(`找不到商戶 ${merchant}，可選的有：${all.join('、')}`);
  }
  await option.first().click();
  await page.waitForTimeout(1500);
  return (await select.innerText()).trim();
}
