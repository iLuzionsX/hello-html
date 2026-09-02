import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });

  const dimensions = await page.evaluate(() => ({
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    bodyScrollHeight: document.body.scrollHeight,
    overflow: getComputedStyle(document.body).overflow
  }));
  assert.equal(dimensions.overflow, 'hidden');
  assert.ok(dimensions.scrollHeight <= dimensions.innerHeight + 1, `page scrolls: ${JSON.stringify(dimensions)}`);
  assert.ok(dimensions.bodyScrollHeight <= dimensions.innerHeight + 1, `body scrolls: ${JSON.stringify(dimensions)}`);

  const initialNet = await page.locator('#netOtPay').textContent();
  assert.match(initialNet, /^\$67\.7[67-9]$/);
  assert.equal(await page.locator('#worked').getAttribute('readonly'), '');

  await page.locator('#otHours').fill('5.00');
  await page.locator('#otHours').dispatchEvent('input');
  assert.equal(await page.locator('#worked').inputValue(), '39.01');
  const updatedNet = await page.locator('#netOtPay').textContent();
  assert.notEqual(updatedNet, initialNet);

  await page.getByRole('button', { name: '+1', exact: true }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '6.00');
  assert.equal(await page.locator('#worked').inputValue(), '40.01');

  await page.locator('#takeHomeRate').fill('70');
  await page.locator('#takeHomeRate').dispatchEvent('input');
  assert.equal(await page.locator('#keepRate').textContent(), '70.00%');

  await page.getByRole('button', { name: 'Pay adjustments' }).click();
  assert.equal(await page.locator('#adjustments').evaluate(el => el.open), true);
  await page.locator('#upsell').fill('200');
  await page.locator('#upsell').dispatchEvent('input');
  await page.locator('#adjustments [data-close]').click();
  assert.equal(await page.locator('#adjustments').evaluate(el => el.open), false);

  await page.getByRole('button', { name: 'Calculation' }).click();
  assert.equal(await page.locator('#breakdown').evaluate(el => el.open), true);
  assert.ok((await page.locator('#formula').textContent()).includes('Estimated net OT'));
  await page.locator('#breakdown [data-close]').click();

  await page.getByRole('button', { name: 'Clear' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '0.00');
  assert.equal(await page.locator('#worked').inputValue(), '34.01');
  assert.equal(await page.locator('#netOtPay').textContent(), '$0.00');

  await page.setViewportSize({ width: 375, height: 667 });
  const compactDimensions = await page.evaluate(() => ({
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    bodyScrollHeight: document.body.scrollHeight
  }));
  assert.ok(compactDimensions.scrollHeight <= compactDimensions.innerHeight + 1, `compact page scrolls: ${JSON.stringify(compactDimensions)}`);
  assert.ok(compactDimensions.bodyScrollHeight <= compactDimensions.innerHeight + 1, `compact body scrolls: ${JSON.stringify(compactDimensions)}`);

  console.log('Browser test passed: one-screen mobile layout, OT controls, dialogs, derived hours, and net estimate all work without page scrolling.');
} finally {
  await browser.close();
}
