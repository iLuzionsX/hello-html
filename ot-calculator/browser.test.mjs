import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

async function assertOneScreen(label) {
  const dimensions = await page.evaluate(() => {
    const card = document.querySelector('.utility-card');
    return {
      innerHeight: window.innerHeight,
      htmlScrollHeight: document.documentElement.scrollHeight,
      bodyScrollHeight: document.body.scrollHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      cardClientHeight: card?.clientHeight ?? 0,
      cardScrollHeight: card?.scrollHeight ?? 0
    };
  });
  assert.equal(dimensions.bodyOverflow, 'hidden');
  assert.ok(dimensions.htmlScrollHeight <= dimensions.innerHeight + 1, `${label} html scrolls: ${JSON.stringify(dimensions)}`);
  assert.ok(dimensions.bodyScrollHeight <= dimensions.innerHeight + 1, `${label} body scrolls: ${JSON.stringify(dimensions)}`);
  assert.ok(dimensions.cardScrollHeight <= dimensions.cardClientHeight + 1, `${label} default card scrolls: ${JSON.stringify(dimensions)}`);
}

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await assertOneScreen('390x844');

  assert.equal(await page.locator('.utility-card').count(), 1);
  assert.equal(await page.locator('#timeDisplay').textContent(), '1h 33m');
  assert.equal(await page.locator('#netOtPay').textContent(), '$68');
  assert.equal(await page.locator('#worked').getAttribute('readonly'), '');
  assert.match(await page.locator('#grossOtPay').textContent(), /^\$107 gross$/);
  assert.match(await page.locator('#withheldPay').textContent(), /^\$39 withheld$/);

  const initialNet = await page.locator('#netOtPay').textContent();
  const fourHourPreset = page.getByRole('button', { name: '4 hr', exact: true });
  await fourHourPreset.click();
  assert.equal(await page.locator('#otHours').inputValue(), '4.00');
  assert.equal(await page.locator('#worked').inputValue(), '38.01');
  assert.equal(await page.locator('#timeDisplay').textContent(), '4h');
  assert.equal(await fourHourPreset.getAttribute('aria-pressed'), 'true');
  assert.notEqual(await page.locator('#netOtPay').textContent(), initialNet);

  await page.getByRole('button', { name: 'Add fifteen minutes' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '4.25');
  assert.equal(await page.locator('#timeDisplay').textContent(), '4h 15m');
  assert.equal(await fourHourPreset.getAttribute('aria-pressed'), 'false');

  await page.getByRole('button', { name: 'Subtract fifteen minutes' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '4.00');
  assert.equal(await page.locator('#timeDisplay').textContent(), '4h');
  assert.equal(await fourHourPreset.getAttribute('aria-pressed'), 'true');

  await page.getByRole('button', { name: 'Edit pay settings' }).click();
  assert.equal(await page.locator('#profile').evaluate(el => el.open), true);
  await page.locator('#takeHomeRate').fill('70');
  await page.locator('#takeHomeRate').dispatchEvent('input');
  assert.match(await page.locator('#withheldPay').textContent(), /withheld$/);
  await page.getByText('Paycheck additions', { exact: true }).click();
  await page.locator('#upsell').fill('200');
  await page.locator('#upsell').dispatchEvent('input');
  await page.locator('#profile [data-close]').click();
  assert.equal(await page.locator('#profile').evaluate(el => el.open), false);

  const calculation = page.locator('#calculation');
  await calculation.locator('summary').click();
  assert.equal(await calculation.getAttribute('open'), '');
  assert.ok((await page.locator('#formula').textContent()).includes('Gross overtime includes straight time'));
  assert.match(await page.locator('#netEffective').textContent(), /^\$\d+\.\d{2}\/hr$/);
  await page.getByRole('button', { name: 'Change pay settings →' }).click();
  assert.equal(await page.locator('#profile').evaluate(el => el.open), true);
  await page.locator('#profile [data-close]').click();

  await page.getByRole('button', { name: 'Clear' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '0.00');
  assert.equal(await page.locator('#worked').inputValue(), '34.01');
  assert.equal(await page.locator('#timeDisplay').textContent(), '0m');
  assert.equal(await page.locator('#netOtPay').textContent(), '$0');

  await calculation.locator('summary').click();
  await page.setViewportSize({ width: 375, height: 667 });
  await assertOneScreen('375x667');

  console.log('Browser test passed: one-card mobile OT flow, natural time controls, rounded estimate, single settings sheet, and collapsed calculation all work without scrolling.');
} finally {
  await browser.close();
}
