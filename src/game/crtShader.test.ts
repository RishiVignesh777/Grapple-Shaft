import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCrtUniforms } from './crtShader';

test('computeCrtUniforms keeps subtle scanline/aberration levels during normal play and boosts on glitch or death', () => {
  const calm = computeCrtUniforms(1.5, 0, 'playing', 360, 225, false);
  assert.equal(calm.glitchIntensity, 0);
  assert.ok(calm.aberrationPx > 0.2 && calm.aberrationPx < 0.7);
  assert.ok(calm.scanlineStrength >= 0.08 && calm.scanlineStrength <= 0.16);

  // Periodic micro-glitch window around 4.88s
  const microGlitch = computeCrtUniforms(4.88, 0, 'playing', 360, 225, false);
  assert.ok(microGlitch.glitchIntensity > 0.15 && microGlitch.glitchIntensity <= 0.35);
  assert.ok(microGlitch.aberrationPx > calm.aberrationPx);

  // Death flash spike
  const death = computeCrtUniforms(1.5, 1.0, 'playing', 360, 225, false);
  assert.ok(death.glitchIntensity >= 0.7);
  assert.ok(death.aberrationPx > calm.aberrationPx + 1.0);

  // Paused suppresses periodic glitch pulses
  const paused = computeCrtUniforms(4.88, 0, 'paused', 360, 225, false);
  assert.equal(paused.glitchIntensity, 0);

  // Reduced motion disables glitch bursts while retaining subtle static scanlines
  const reduced = computeCrtUniforms(4.88, 0, 'playing', 360, 225, true);
  assert.equal(reduced.glitchIntensity, 0);
  assert.ok(reduced.aberrationPx <= 0.3);
});
