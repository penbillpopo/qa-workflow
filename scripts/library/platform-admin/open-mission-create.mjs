import { PROJECTS } from '../../lib/qa.mjs';
import { run as selectMerchant } from './select-merchant.mjs';

export const meta = {
  id: 'platform-admin/open-mission-create',
  name: '打開任務獎勵活動的建立頁（基本設定）',
  project: 'platform-admin',
  needsLogin: true,
  params: { merchant: '商戶名稱，預設 Epybet' },
  returns: '{ url, tenantId }',
  sideEffects: '無。只打開頁面；在建立頁按「Next」才會存成草稿。',
  notes: '中英文介面都可用。路徑：Marketing > Event > Mission Reward Event > Create Mission。建立流程三步：Basic Setting、Player Eligibility、Mission List。',
  verified: '2026-11-06',
};

export async function run(page, { merchant = 'Epybet' } = {}) {
  await page.goto(`${PROJECTS['platform-admin'].baseUrl}/en-US/bonus/activity-manage/MissionEvent`, { waitUntil: 'networkidle' });
  await selectMerchant(page, { merchant });
  // 中英文介面都可用：英文「Create Mission」，中文「创建活动」
  await page.getByRole('button', { name: /Create Mission|创建活动/ }).click();
  await page.waitForURL(/MissionEvent\/base/, { timeout: 20000 });
  await page.locator('input[selectmode="range"]').first().waitFor({ state: 'visible', timeout: 20000 });
  const url = page.url();
  return { url, tenantId: new URL(url).searchParams.get('tenantId') };
}
