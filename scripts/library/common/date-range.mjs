export const meta = {
  id: 'common/date-range',
  name: '日期區間選擇器（owl 日曆）',
  project: 'platform-admin',
  needsLogin: false,
  params: {
    start: '開始日期 YYYY-MM-DD（必填）',
    end: '結束日期 YYYY-MM-DD（必填）',
    placeholder: '輸入框的提示文字（選填）。不填時自動找頁面上第一個日期區間輸入框',
  },
  returns: '輸入框最後顯示的值，例如 2026-11-20 14:30 ~ 2026-12-05 14:30',
  sideEffects: '無',
  notes: '中英文介面都可用。時與分沿用日曆預設值（目前時間）。日曆的「Confirm」是文字不是按鈕，要用文字定位。提示框擋住時會點不到輸入框，所以先把滑鼠移開。',
  verified: '2026-11-06',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function shownMonth(container) {
  const text = (await container.innerText()).replace(/\s+/g, ' ');
  // 中文介面顯示「2026 11月」，英文介面顯示「2026 Nov」
  const zh = text.match(/(\d{4})\D{0,3}?(\d{1,2})\s*月/);
  if (zh) return Number(zh[1]) * 12 + Number(zh[2]) - 1;
  const m = text.match(/(\d{4})\s+([A-Z][a-z]{2})/) || text.match(/([A-Z][a-z]{2})\s+(\d{4})/);
  if (!m) throw new Error('讀不到日曆目前的年月');
  const [year, mon] = /\d{4}/.test(m[1]) ? [Number(m[1]), m[2]] : [Number(m[2]), m[1]];
  return year * 12 + MONTHS.indexOf(mon);
}

async function pickDay(page, container, iso) {
  const [y, mo, d] = iso.split('-').map(Number);
  const target = y * 12 + (mo - 1);
  for (let i = 0; i < 24; i++) {
    const cur = await shownMonth(container);
    if (cur === target) break;
    await container.locator(`button[aria-label="${cur < target ? '下一月' : '上一月'}"], .owl-dt-control-arrow-button`)
      .nth(cur < target ? -1 : 0).click();
    await page.waitForTimeout(250);
  }
  const cell = container.locator('.owl-dt-calendar-cell:not(.owl-dt-calendar-cell-out)')
    .filter({ hasText: new RegExp(`^\\s*${d}\\s*$`) }).first();
  if (!(await cell.count())) throw new Error(`日曆上找不到 ${iso}`);
  await cell.click();
  await page.waitForTimeout(300);
}

export async function run(page, { start, end, placeholder } = {}) {
  if (!start || !end) throw new Error('缺少參數 start 或 end');
  await page.mouse.move(5, 5);
  const input = placeholder ? page.locator(`input[placeholder="${placeholder}"]`).first() : page.locator('input[selectmode="range"]').first();
  await input.click();
  const container = page.locator('.owl-dt-container').first();
  await container.waitFor({ state: 'visible', timeout: 10000 });
  await pickDay(page, container, start);
  await pickDay(page, container, end);
  await container.getByText(/^\s*(Confirm|确认|確認)\s*$/).click();
  await page.waitForTimeout(500);
  const value = await input.inputValue();
  if (!value.includes(start) || !value.includes(end)) throw new Error(`日期沒有設定成功，目前是：${value || '空白'}`);
  return value;
}
