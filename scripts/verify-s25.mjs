import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'screenshots');
const phase = process.argv.includes('--after') ? 'after' : 'before';
const errors = [];

const EXAMPLE = `היי Oren!
השובר שלך ל־שופרסל שלי סוקולוב - רמת השרון מחכה לך :) 
סכום: ₪50.00
נרכש ב־2026-08-08 
לצפייה ומימוש: https://myconsumers.pluxee.co.il/b?eyZzXraPfiObIv9Sd
לצפייה בתקנון: https://cibus.pluxee.co.il/terms/תקנון-שוברים-שופרסל`;

async function shot(page, name) {
  await page.screenshot({
    path: join(outDir, `${name}.png`),
    animations: 'disabled',
  });
}

async function overflowReport(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflowing = [...document.querySelectorAll('body *')].filter(
      (node) => node instanceof HTMLElement && node.scrollWidth > node.clientWidth + 1,
    );
    return {
      htmlScrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowing: overflowing.slice(0, 8).map((node) => ({
        tag: node.tagName,
        className: String(node.className).slice(0, 80),
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
      })),
    };
  });
}

async function seedExtraVouchers(page) {
  await page.evaluate(async () => {
    const { listCompanies, createVoucher } = await import('/src/db/index.ts');
    const companies = await listCompanies();
    const company = companies[0];
    if (!company) {
      return;
    }
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const extras = [
      { code: '11112222333344445555', balance: 80, expiresAt: now + 20 * day },
      { code: '55556666777788889999', balance: 25, expiresAt: now - 12 * day },
      { code: '00001111222233334444', balance: 0, status: 'used' },
      { code: '99998888777766665555', balance: 120, expiresAt: now + 40 * day },
    ];
    for (const extra of extras) {
      await createVoucher({
        companyId: company.id,
        code: extra.code,
        balance: extra.balance,
        initialBalance: extra.balance || 50,
        expiresAt: extra.expiresAt,
        barcodeFormat: 'code128',
        status: extra.status,
      });
    }
  });
}

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push(`console: ${msg.text()}`);
  }
});
page.on('pageerror', (error) => {
  errors.push(`pageerror: ${error.message}`);
});

await mkdir(outDir, { recursive: true });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'Vouchers' }).waitFor();

if (phase === 'before' || phase === 'after') {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('voucher-manager');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Vouchers' }).waitFor();
  await page.getByRole('button', { name: 'New company' }).first().click();
  await page.getByLabel('Name').fill(
    'Shufersal Super-Discount Gift Cards And More',
  );
  await page.getByRole('button', { name: 'Create company' }).click();
  await page.getByText('Company created').waitFor();

  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'New voucher' }).last().click();
  await page.getByRole('textbox', { name: 'Code' }).fill('12345678901234567890');
  await page.getByRole('spinbutton', { name: 'Balance', exact: true }).fill('50');
  await page.getByLabel('Expires', { exact: true }).fill('2026-09-30');
  await page.getByRole('button', { name: 'Save voucher' }).click();
  await page.getByText('Voucher saved').waitFor();
  await seedExtraVouchers(page);
  await page.reload({ waitUntil: 'networkidle' });
}

await shot(page, '01-home-light');
const homeOverflow = await overflowReport(page);
console.log('HOME_OVERFLOW', JSON.stringify(homeOverflow, null, 2));

await page.getByRole('link', { name: /Shufersal/ }).first().click();
await page.getByRole('heading', { name: /Shufersal/ }).waitFor();
await shot(page, `02-company-used-off-${phase}`);
const companyOffOverflow = await overflowReport(page);
console.log('COMPANY_OFF_OVERFLOW', JSON.stringify(companyOffOverflow, null, 2));

await page.getByRole('switch', { name: 'Used' }).click();
await shot(page, `03-company-used-on-${phase}`);
const companyOnOverflow = await overflowReport(page);
console.log('COMPANY_ON_OVERFLOW', JSON.stringify(companyOnOverflow, null, 2));
await page.getByRole('switch', { name: 'Used' }).click();

if (phase === 'before' || phase === 'after') {
  await page.getByRole('button', { name: /12345678901234567890/ }).click();
  await page.getByRole('button', { name: 'Show barcode' }).click();
  await page.getByRole('button', { name: 'Close barcode' }).waitFor();
  await shot(page, '04-barcode-fullscreen');
  await page.getByRole('button', { name: 'Close barcode' }).click();

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('CVV').fill('123');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByText('Voucher updated').waitFor();

  await page.getByRole('button', { name: /12345678901234567890/ }).click();
  await page.getByRole('button', { name: 'Mark used' }).click();
  await page.getByText('Marked as used').waitFor();
  await shot(page, '05-mark-used-undo');
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByText('Restored').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  await page.getByRole('button', { name: 'Show actions' }).first().click();
  await page.getByRole('button', { name: 'Balance' }).click();
  await page.getByLabel('New balance').fill('35');
  await page.getByRole('button', { name: 'Save balance' }).click();
  await page.getByText('Balance updated').waitFor();

  await page.getByRole('button', { name: /12345678901234567890/ }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByText('Voucher deleted').waitFor();

  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('heading', { name: 'Settings' }).waitFor();
  await shot(page, '06-settings-light');
  await page.getByRole('tab', { name: 'Dark' }).click();
  await shot(page, '07-settings-dark');

  const share = `/share?text=${encodeURIComponent(EXAMPLE)}`;
  await page.goto(`http://localhost:5173${share}`, { waitUntil: 'networkidle' });
  await shot(page, '08-share-import');

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await shot(page, '09-home-dark');
  await page.getByRole('tab', { name: 'All vouchers' }).click();
  await shot(page, '10-home-all-dark');
}

console.log('CONSOLE_ERRORS', JSON.stringify(errors, null, 2));
await browser.close();

if (errors.length > 0) {
  process.exitCode = 2;
}
