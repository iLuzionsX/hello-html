import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

async function assertNoPageScroll(label) {
  const dimensions = await page.evaluate(() => ({
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    bodyScrollHeight: document.body.scrollHeight,
    overflow: getComputedStyle(document.body).overflow
  }));
  assert.equal(dimensions.overflow, 'hidden');
  assert.ok(dimensions.scrollHeight <= dimensions.innerHeight + 1, `${label} html scrolls: ${JSON.stringify(dimensions)}`);
  assert.ok(dimensions.bodyScrollHeight <= dimensions.innerHeight + 1, `${label} body scrolls: ${JSON.stringify(dimensions)}`);
}

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await assertNoPageScroll('390x844');

  const initialNet = await page.locator('#netOtPay').textContent();
  assert.match(initialNet, /^\$67\.7[67-9]$/);
  assert.equal(await page.locator('#resultHours').textContent(), '1.55h OT');
  assert.equal(await page.locator('#worked').getAttribute('readonly'), '');

  const fourHourPreset = page.getByRole('button', { name: '4 hr', exact: true });
  await fourHourPreset.click();
  assert.equal(await page.locator('#otHours').inputValue(), '4.00');
  assert.equal(await page.locator('#worked').inputValue(), '38.01');
  assert.equal(await page.locator('#resultHours').textContent(), '4h OT');
  assert.equal(await fourHourPreset.getAttribute('aria-pressed'), 'true');
  assert.notEqual(await page.locator('#netOtPay').textContent(), initialNet);

  await page.getByRole('button', { name: 'Add half an overtime hour' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '4.50');
  assert.equal(await page.locator('#worked').inputValue(), '38.51');
  assert.equal(await fourHourPreset.getAttribute('aria-pressed'), 'false');

  await page.getByRole('button', { name: 'Subtract half an overtime hour' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '4.00');
  assert.equal(await fourHourPreset.getAttribute('aria-pressed'), 'true');

  await page.getByRole('button', { name: 'Edit pay profile' }).click();
  assert.equal(await page.locator('#profile').evaluate(el => el.open), true);
  await page.locator('#takeHomeRate').fill('70');
  await page.locator('#takeHomeRate').dispatchEvent('input');
  assert.equal(await page.locator('#keepRate').textContent(), '70.00%');
  assert.match(await page.locator('#profileSummary').textContent(), /70\.00% keep/);
  await page.locator('#upsell').fill('200');
  await page.locator('#upsell').dispatchEvent('input');
  await page.locator('#profile [data-close]').click();
  assert.equal(await page.locator('#profile').evaluate(el => el.open), false);

  await page.getByRole('button', { name: /Details/ }).click();
  assert.equal(await page.locator('#breakdown').evaluate(el => el.open), true);
  assert.ok((await page.locator('#formula').textContent()).includes('Estimated net OT'));
  await page.locator('#breakdown [data-close]').click();

  await page.getByRole('button', { name: 'Reset' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '0.00');
  assert.equal(await page.locator('#worked').inputValue(), '34.01');
  assert.equal(await page.locator('#resultHours').textContent(), '0h OT');
  assert.equal(await page.locator('#netOtPay').textContent(), '$0.00');

  await page.setViewportSize({ width: 375, height: 667 });
  await assertNoPageScroll('375x667');

  console.log('Browser test passed: refined one-screen mobile app, scenario presets, half-hour stepper, pay profile, payroll details, and net estimate all work without page scrolling.');
} finally {
  await browser.close();
}
