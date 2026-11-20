import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PARTICLES,
  ParticleSystem,
  spawnGrappleSparks,
  spawnLandingSparks,
  stepParticles,
} from './particles';
import { createInitialShellState, stepShellState } from './shellLogic';
import type { PlayerInputState, SparkParticle } from './types';

const NO_INPUT: PlayerInputState = {
  left: false,
  right: false,
  jumpJustPressed: false,
  mouseDown: false,
  mouseJustPressed: false,
  mouseWorldX: -9999,
  mouseWorldY: -9999,
};

test('ParticleSystem spawns landing and grapple sparks, updates motion, expires dead sparks, and caps count', () => {
  const ps = new ParticleSystem(42);
  assert.equal(ps.count, 0);

  ps.emitLanding(100, 280, 240);
  const landingCount = ps.count;
  assert.ok(landingCount >= 4 && landingCount <= 12);

  const firstX = ps.activeParticles[0].x;
  const firstY = ps.activeParticles[0].y;
  ps.update(0.03);
  assert.notEqual(ps.activeParticles[0].x, firstX);
  assert.notEqual(ps.activeParticles[0].y, firstY);

  // Grapple emits bursts at both player and anchor
  ps.emitGrapple(120, 200, 200, 140);
  assert.ok(ps.count > landingCount);

  // Advance enough time for all sparks to expire cleanly
  for (let i = 0; i < 30; i++) {
    ps.update(0.03);
  }
  assert.equal(ps.count, 0);

  // Stress test cap at MAX_PARTICLES
  const list: SparkParticle[] = [];
  let seed = 1;
  for (let i = 0; i < 30; i++) {
    seed = spawnLandingSparks(list, 100, 200, 320, seed);
    seed = spawnGrappleSparks(list, 100, 200, 150, 140, seed);
  }
  assert.ok(list.length <= MAX_PARTICLES);
  stepParticles(list, 0.016);
  assert.ok(list.length <= MAX_PARTICLES);
});

test('stepShellState spawns sparks on landing and grapple attach without spamming flat idle', () => {
  const state = createInitialShellState();
  assert.equal(state.particles.length, 0);

  // Flat idle steps do not trigger landing sparks
  for (let i = 0; i < 10; i++) {
    const ev = stepShellState(state, 0.016, 'playing', undefined, {
      ...NO_INPUT,
      right: true,
    });
    assert.equal(ev.landed, false);
  }
  assert.equal(state.particles.length, 0);

  // Jump and fall until landing -> emits landing sparks
  stepShellState(state, 0.016, 'playing', undefined, {
    ...NO_INPUT,
    jumpJustPressed: true,
  });
  let landedOnce = false;
  for (let i = 0; i < 80; i++) {
    const ev = stepShellState(state, 0.016, 'playing', undefined, NO_INPUT);
    if (ev.landed) {
      landedOnce = true;
      break;
    }
  }
  assert.equal(landedOnce, true);
  assert.ok(state.particles.length >= 4);

  // Clear and test grapple attach sparks at Reactor Chasm anchor #1 (1036, 166)
  state.particles.length = 0;
  state.player.x = 960;
  state.player.y = 200;
  state.player.grounded = false;

  const grappleStep = stepShellState(state, 0.016, 'playing', undefined, {
    ...NO_INPUT,
    mouseDown: true,
    mouseJustPressed: true,
    mouseWorldX: 1036,
    mouseWorldY: 166,
  });
  assert.equal(grappleStep.grappleAttached, true);
  assert.ok(state.particles.length >= 10);

  // Paused freezes particle motion and life
  const frozenCount = state.particles.length;
  const frozenX = state.particles[0].x;
  stepShellState(state, 0.05, 'paused');
  assert.equal(state.particles.length, frozenCount);
  assert.equal(state.particles[0].x, frozenX);
});
