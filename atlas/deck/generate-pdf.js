import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generatePDF() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load the HTML deck
  await page.goto(`file://${join(__dirname, 'deck.html')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Generate PDF with landscape slides
  await page.pdf({
    path: join(__dirname, 'Regen_Atlas_RAEIS_Pitch_Deck.pdf'),
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: false,
  });

  console.log('PDF generated: Regen_Atlas_RAEIS_Pitch_Deck.pdf');

  // Also generate thumbnail grid for visual QA
  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) {
    await slides[i].screenshot({
      path: join(__dirname, `screenshots/slide-${i + 1}.png`),
    });
    console.log(`Thumbnail: slide-${i + 1}.png`);
  }

  await browser.close();
}

generatePDF().catch(e => { console.error(e); process.exit(1); });
