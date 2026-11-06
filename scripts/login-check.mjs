// 檢查各後台的 UAT 帳號能否登入。用法：node scripts/login-check.mjs [gomoney-admin|platform-admin]
import { PROJECTS, login, mask, launchBrowser } from './lib/qa.mjs';

const targets = process.argv[2] ? [process.argv[2]] : Object.keys(PROJECTS);
const browser = await launchBrowser({ headless: true });
let ok = true;
for (const key of targets) {
  const page = await browser.newPage();
  try {
    await login(page, key);
    console.log(`登入成功 ${PROJECTS[key].name}：${page.url()}`);
  } catch (e) {
    ok = false;
    console.log(`登入失敗 ${PROJECTS[key]?.name || key}：${mask(e.message)}`);
  }
  await page.close();
}
await browser.close();
process.exit(ok ? 0 : 1);
