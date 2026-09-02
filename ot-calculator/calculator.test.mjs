import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, syncFromOT, syncFromWorked } from './calculator.mjs';

test('July paycheck reproduces blended rate and OT pay', () => {
  const r = calculate({ base:43.98, ot:1.55, worked:35.56, reg:34.01, upsell:185, shift:24.42, other:0 });
  assert.ok(Math.abs(r.blended - 49.868) < 0.002);
  assert.ok(Math.abs(r.premium - 38.65) < 0.02);
  assert.ok(Math.abs(r.otPay - 106.82) < 0.02);
});

test('August paycheck reproduces blended rate and OT pay', () => {
  const r = calculate({ base:43.98, ot:1.40, worked:29.10, reg:27.70, upsell:50, shift:24.90, other:0 });
  assert.ok(Math.abs(r.blended - 46.554) < 0.002);
  assert.ok(Math.abs(r.premium - 32.59) < 0.02);
  assert.ok(Math.abs(r.otPay - 94.16) < 0.02);
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

test('zero OT produces zero OT pay without NaN', () => {
  const r = calculate({ base:43.98, ot:0, worked:34, reg:34, upsell:0, shift:0, other:0 });
  assert.equal(r.otPay, 0);
  assert.equal(r.premium, 0);
  assert.equal(r.effective, 0);
});
