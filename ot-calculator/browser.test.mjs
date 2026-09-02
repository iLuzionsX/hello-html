import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });

  const initialNet = await page.locator('#netOtPay').textContent();
  assert.match(initialNet, /^\$67\.7[67-9]$/);

  await page.locator('#otHours').fill('5.00');
  await page.locator('#otHours').dispatchEvent('input');

  assert.equal(await page.locator('#worked').inputValue(), '39.01');
  const updatedNet = await page.locator('#netOtPay').textContent();
  assert.notEqual(updatedNet, initialNet);

  await page.locator('#takeHomeRate').fill('70');
  await page.locator('#takeHomeRate').dispatchEvent('input');
  const higherNet = await page.locator('#netOtPay').textContent();
  assert.notEqual(higherNet, updatedNet);

  await page.locator('#otHours').fill('0');
  await page.locator('#otHours').dispatchEvent('input');
  assert.equal(await page.locator('#worked').inputValue(), '34.01');
  assert.equal(await page.locator('#netOtPay').textContent(), '$0.00');

  console.log('Browser test passed: OT input updates hours and net take-home in the rendered page.');
} finally {
  await browser.close();
}
