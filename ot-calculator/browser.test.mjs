import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

async function assertOneScreen(label) {
  const dimensions = await page.evaluate(() => {
    const card = document.querySelector('.utility-card');
    const rect = card?.getBoundingClientRect();
    return {
      innerHeight: window.innerHeight,
      htmlScrollHeight: document.documentElement.scrollHeight,
      bodyScrollHeight: document.body.scrollHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      cardBottom: rect?.bottom ?? 0
    };
  });
  assert.equal(dimensions.bodyOverflow, 'hidden');
  assert.ok(dimensions.htmlScrollHeight <= dimensions.innerHeight + 1, `${label} html scrolls: ${JSON.stringify(dimensions)}`);
  assert.ok(dimensions.bodyScrollHeight <= dimensions.innerHeight + 1, `${label} body scrolls: ${JSON.stringify(dimensions)}`);
  assert.ok(dimensions.cardBottom < dimensions.innerHeight - 50, `${label} card still fills the viewport: ${JSON.stringify(dimensions)}`);
}

function parseWholeMoney(text) {
  return Number(String(text).replace(/[^0-9-]/g, ''));
}

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await assertOneScreen('390x844');

  assert.equal(await page.locator('.utility-card').count(), 1);
  assert.equal(await page.locator('#timeDisplay').textContent(), '1h 33m');
  assert.equal(await page.locator('#netOtPay').textContent(), '$68');
  assert.equal(await page.locator('#worked').getAttribute('readonly'), '');
  assert.equal(await page.getByText('15-minute adjustments', { exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Clear', exact: true }).count(), 0);

  const twoHourPreset = page.getByRole('button', { name: '2 hr', exact: true });
  await twoHourPreset.click();
  assert.equal(await page.locator('#otHours').inputValue(), '2.00');
  assert.equal(await page.locator('#timeDisplay').textContent(), '2h');
  assert.equal(await twoHourPreset.getAttribute('aria-pressed'), 'true');

  const roundedNet = parseWholeMoney(await page.locator('#netOtPay').textContent());
  const roundedGross = parseWholeMoney(await page.locator('#grossOtPay').textContent());
  const roundedWithheld = parseWholeMoney(await page.locator('#withheldPay').textContent());
  assert.equal(roundedGross - roundedWithheld, roundedNet, 'rounded summary must reconcile exactly');
  assert.equal(roundedGross, 138);
  assert.equal(roundedNet, 87);
  assert.equal(roundedWithheld, 51);

  await page.getByRole('button', { name: 'Add fifteen minutes' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '2.25');
  assert.equal(await page.locator('#timeDisplay').textContent(), '2h 15m');
  assert.equal(await twoHourPreset.getAttribute('aria-pressed'), 'false');

  const stepperAppearance = await page.locator('.stepper').evaluate(el => {
    const style = getComputedStyle(el);
    return { borderColor: style.borderColor, backgroundColor: style.backgroundColor };
  });
  const selectedPresetAppearance = await twoHourPreset.evaluate(el => {
    const style = getComputedStyle(el);
    return { borderColor: style.borderColor, backgroundColor: style.backgroundColor };
  });
  assert.notEqual(stepperAppearance.borderColor, selectedPresetAppearance.borderColor, 'stepper should not use selected accent border');

  await page.getByRole('button', { name: 'Subtract fifteen minutes' }).click();
  assert.equal(await page.locator('#otHours').inputValue(), '2.00');
  assert.equal(await page.locator('#timeDisplay').textContent(), '2h');
  assert.equal(await twoHourPreset.getAttribute('aria-pressed'), 'true');

  await page.getByRole('button', { name: 'Edit pay settings' }).click();
  assert.equal(await page.locator('#profile').evaluate(el => el.open), true);
  await page.locator('#takeHomeRate').fill('70');
  await page.locator('#takeHomeRate').dispatchEvent('input');
  await page.getByText('Paycheck additions', { exact: true }).click();
  await page.locator('#upsell').fill('200');
  await page.locator('#upsell').dispatchEvent('input');
  await page.locator('#profile [data-close]').click();
  assert.equal(await page.locator('#profile').evaluate(el => el.open), false);

  const calculation = page.locator('#calculation');
  await calculation.locator('summary').click();
  assert.equal(await calculation.getAttribute('open'), '');
  assert.ok((await page.locator('#formula').textContent()).includes('Gross overtime includes straight time'));
  assert.equal(await page.getByText('Estimate. Actual withholding varies.', { exact: true }).count(), 1);
  assert.match(await page.locator('#netEffective').textContent(), /^\$\d+\.\d{2}\/hr$/);
  await page.getByRole('button', { name: 'Change pay settings →' }).click();
  assert.equal(await page.locator('#profile').evaluate(el => el.open), true);
  await page.locator('#profile [data-close]').click();
  await calculation.locator('summary').click();

  await page.setViewportSize({ width: 375, height: 667 });
  await assertOneScreen('375x667');

  console.log('Browser test passed: compact one-card OT flow, reconciled rounding, neutral stepper, natural time format, and single settings entry all work without scrolling.');
} finally {
  await browser.close();
}
