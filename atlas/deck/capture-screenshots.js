import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://hedera-hello-future.vercel.app';

async function capture() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const pages = [
    { url: '/publish', name: 'publish' },
    { url: '/insights', name: 'insights' },
    { url: '/actions', name: 'actions' },
    { url: '/', name: 'explore' },
  ];

  for (const { url, name } of pages) {
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(4000);
      await page.screenshot({ path: join(__dirname, `screenshots/${name}.png`), fullPage: false });
      console.log(`Captured ${name}`);
    } catch (e) {
      console.log(`Failed ${name}: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('Done.');
}

capture().catch(e => { console.error(e); process.exit(1); });
