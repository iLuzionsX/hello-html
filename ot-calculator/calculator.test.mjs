import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, syncFromOT, syncFromWorked } from './calculator.mjs';

test('July paycheck reproduces blended rate, gross OT, and estimated net OT', () => {
  const r = calculate({ base:43.98, ot:1.55, worked:35.56, reg:34.01, upsell:185, shift:24.42, other:0, takeHomeRate:63.45 });
  assert.ok(Math.abs(r.blended - 49.868) < 0.002);
  assert.ok(Math.abs(r.premium - 38.65) < 0.02);
  assert.ok(Math.abs(r.grossOtPay - 106.82) < 0.02);
  assert.ok(Math.abs(r.netOtPay - 67.78) < 0.03);
});

test('August paycheck reproduces blended rate, gross OT, and estimated net OT', () => {
  const r = calculate({ base:43.98, ot:1.40, worked:29.10, reg:27.70, upsell:50, shift:24.90, other:0, takeHomeRate:63.45 });
  assert.ok(Math.abs(r.blended - 46.554) < 0.002);
  assert.ok(Math.abs(r.premium - 32.59) < 0.02);
  assert.ok(Math.abs(r.grossOtPay - 94.16) < 0.02);
  assert.ok(Math.abs(r.netOtPay - 59.74) < 0.03);
});

test('changing OT hours updates total worked hours', () => {
  assert.equal(syncFromOT(34.01, 1.55), 35.56);
  assert.equal(syncFromOT(34.01, 5), 39.01);
  assert.equal(syncFromOT(34.01, 0), 34.01);
});

test('changing regular hours updates total worked hours', () => {
  assert.equal(syncFromOT(40, 3), 43);
  assert.equal(syncFromOT(27.70, 1.40), 29.10);
});

test('changing total hours recalculates regular hours', () => {
  assert.equal(syncFromWorked(40, 5), 35);
  assert.equal(syncFromWorked(29.10, 1.40), 27.70);
});

test('regular hours never go negative when OT exceeds total', () => {
  assert.equal(syncFromWorked(3, 5), 0);
});

test('zero OT produces zero gross and net OT pay', () => {
  const r = calculate({ base:43.98, ot:0, worked:34, reg:34, upsell:0, shift:0, other:0, takeHomeRate:63.45 });
  assert.equal(r.grossOtPay, 0);
  assert.equal(r.netOtPay, 0);
  assert.equal(r.netEffective, 0);
});

test('take-home percentage actually changes net amount', () => {
  const a = calculate({ base:43.98, ot:2, worked:36, reg:34, takeHomeRate:63.45 });
  const b = calculate({ base:43.98, ot:2, worked:36, reg:34, takeHomeRate:70 });
  assert.ok(b.netOtPay > a.netOtPay);
  assert.ok(Math.abs(a.netOtPay - a.grossOtPay * 0.6345) < 0.001);
});
