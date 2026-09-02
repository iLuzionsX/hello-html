import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });

  const initialNet = await page.locator('#netOtPay').textContent();
  assert.match(initialNet, /^\$67\.7[67-9]$/);
  assert.equal(await page.locator('#worked').getAttribute('readonly'), '');

  await page.locator('#otHours').fill('5.00');
  await page.locator('#otHours').dispatchEvent('input');
  assert.equal(await page.locator('#worked').inputValue(), '39.01');
  const updatedNet = await page.locator('#netOtPay').textContent();
  assert.notEqual(updatedNet, initialNet);

  await page.getByRole('button', { name: '+1 hr' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '6.00');
  assert.equal(await page.locator('#worked').inputValue(), '40.01');

  await page.locator('#takeHomeRate').fill('70');
  await page.locator('#takeHomeRate').dispatchEvent('input');
  assert.equal(await page.locator('#keepRate').textContent(), '70.00%');

  await page.getByRole('button', { name: 'Clear' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '0.00');
  assert.equal(await page.locator('#worked').inputValue(), '34.01');
  assert.equal(await page.locator('#netOtPay').textContent(), '$0.00');

  const advanced = page.locator('details.advanced');
  assert.equal(await advanced.getAttribute('open'), null);
  await advanced.locator('summary').click();
  assert.notEqual(await advanced.getAttribute('open'), null);

  console.log('Browser test passed: mobile OT flow, quick controls, derived hours, keep rate, and advanced disclosure all work.');
} finally {
  await browser.close();
}
