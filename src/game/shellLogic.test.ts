import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FRAME_DT,
  clampDeltaTime,
  computeParallaxOffset,
  computeVirtualViewport,
  createInitialShellState,
  createStarfield,
  stepShellState,
} from './shellLogic';
import {
  resolveInitialScreenState,
  transitionGameState,
} from './stateMachine';

test('clampDeltaTime clamps spikes to MAX_FRAME_DT and rejects non-positive/NaN', () => {
  assert.equal(clampDeltaTime(0.016), 0.016);
  assert.equal(clampDeltaTime(0.5), MAX_FRAME_DT);
  assert.equal(clampDeltaTime(-1), 0);
  assert.equal(clampDeltaTime(Number.NaN), 0);
});

test('computeVirtualViewport produces integer pixel scale and crisp dimensions', () => {
  const desktop = computeVirtualViewport(1440, 900);
  assert.equal(Number.isInteger(desktop.pixelScale), true);
  assert.ok(desktop.pixelScale >= 3);
  assert.ok(desktop.virtualWidth <= 480);

  const mobile = computeVirtualViewport(390, 844);
  assert.equal(Number.isInteger(mobile.pixelScale), true);
  assert.ok(mobile.virtualWidth >= 160);
});

test('createStarfield is deterministic for identical seeds', () => {
  const a = createStarfield(1337, 30, 320, 240);
  const b = createStarfield(1337, 30, 320, 240);
  assert.deepEqual(a, b);
  assert.equal(a.length, 30);
});

test('computeParallaxOffset wraps cleanly across tile boundaries', () => {
  const pos = computeParallaxOffset(100, 200, 0.25, 32, 32);
  assert.equal(pos.x, 25);
  assert.equal(pos.y, 18);

  const neg = computeParallaxOffset(-40, -16, 0.5, 32, 32);
  assert.equal(neg.x, 12);
  assert.equal(neg.y, 24);
});

test('stepShellState keeps player stationary on title and moves player with input while playing', () => {
  const state = createInitialShellState();
  const spawnX = state.player.x;
  const viewport = computeVirtualViewport(1440, 900);

  stepShellState(state, 0.016, 'title', viewport);
  assert.equal(state.player.x, spawnX);
  assert.ok(state.elapsedTime > 0);

  const moveRightInput = {
    left: false,
    right: true,
    jumpJustPressed: false,
    mouseDown: false,
    mouseJustPressed: false,
    mouseWorldX: -9999,
    mouseWorldY: -9999,
  };

  stepShellState(state, 0.016, 'playing', viewport, moveRightInput);
  stepShellState(state, 0.016, 'playing', viewport, moveRightInput);
  assert.ok(state.player.x > spawnX);
});

test('stepShellState freezes simulation while paused or won', () => {
  const state = createInitialShellState();
  const viewport = computeVirtualViewport(1440, 900);
  stepShellState(state, 0.016, 'playing', viewport);
  const snapshotTime = state.elapsedTime;
  const snapshotCam = { ...state.camera };

  stepShellState(state, 0.016, 'paused', viewport);
  assert.equal(state.elapsedTime, snapshotTime);
  assert.deepEqual(state.camera, snapshotCam);

  stepShellState(state, 0.016, 'won', viewport);
  assert.equal(state.elapsedTime, snapshotTime);
  assert.deepEqual(state.camera, snapshotCam);
});

test('state machine resolves ?autostart=1 and handles transitions including WIN and RESTART_RUN cleanly', () => {
  assert.equal(resolveInitialScreenState(''), 'title');
  assert.equal(resolveInitialScreenState('?autostart=1'), 'playing');

  assert.equal(transitionGameState('title', 'START'), 'playing');
  assert.equal(transitionGameState('playing', 'PAUSE'), 'paused');
  assert.equal(transitionGameState('paused', 'RESUME'), 'playing');
  assert.equal(transitionGameState('playing', 'TOGGLE_PAUSE'), 'paused');
  assert.equal(transitionGameState('paused', 'TOGGLE_PAUSE'), 'playing');
  assert.equal(transitionGameState('title', 'TOGGLE_PAUSE'), 'title');
  assert.equal(transitionGameState('paused', 'RETURN_TITLE'), 'title');
  assert.equal(transitionGameState('playing', 'WIN'), 'won');
  assert.equal(transitionGameState('won', 'RESTART_RUN'), 'playing');
  assert.equal(transitionGameState('title', 'WIN'), 'title');
});

test('runTimeSeconds advances only while playing and resets on fresh state', () => {
  const state = createInitialShellState();
  const viewport = computeVirtualViewport(1440, 900);
  assert.equal(state.runTimeSeconds, 0);

  stepShellState(state, 0.05, 'title', viewport);
  stepShellState(state, 0.05, 'title', viewport);
  assert.equal(state.runTimeSeconds, 0);

  stepShellState(state, 0.05, 'playing', viewport);
  stepShellState(state, 0.05, 'playing', viewport);
  assert.ok(Math.abs(state.runTimeSeconds - 0.1) < 1e-6);

  stepShellState(state, 0.05, 'paused', viewport);
  assert.ok(Math.abs(state.runTimeSeconds - 0.1) < 1e-6);

  stepShellState(state, 0.05, 'won', viewport);
  assert.ok(Math.abs(state.runTimeSeconds - 0.1) < 1e-6);

  const reset = createInitialShellState();
  assert.equal(reset.runTimeSeconds, 0);
});

test('deathCount tracks hazard and void deaths during a run and resets to zero on restart', () => {
  const state = createInitialShellState();
  const viewport = computeVirtualViewport(1440, 900);
  assert.equal(state.deathCount, 0);

  // Death 1: fall into Access Corridor lava pit 1
  state.player.x = state.lavaPits[0].x + 8;
  state.player.y = state.lavaPits[0].y - 4;
  const lavaDeath = stepShellState(state, 0.016, 'playing', viewport);
  assert.equal(lavaDeath.died, true);
  assert.equal(state.deathCount, 1);

  // Death 2: fall below safety-net void
  state.player.x = 660;
  state.player.y = state.bounds.deathVoidY + 5;
  const voidDeath = stepShellState(state, 0.016, 'playing', viewport);
  assert.equal(voidDeath.died, true);
  assert.equal(state.deathCount, 2);

  // Restarting from the beginning resets deathCount to 0
  const restarted = createInitialShellState();
  assert.equal(restarted.deathCount, 0);
});

test('grapple motion trail stays empty during normal running and jumping', () => {
  const state = createInitialShellState();
  const viewport = computeVirtualViewport(1440, 900);

  for (let i = 0; i < 20; i++) {
    stepShellState(state, 0.016, 'playing', viewport, {
      left: false,
      right: true,
      jumpJustPressed: i === 5,
      mouseDown: false,
      mouseJustPressed: false,
      mouseWorldX: -9999,
      mouseWorldY: -9999,
    });
    assert.equal(state.grappleTrail.length, 0);
  }
});

test('grapple motion trail spawns cyan afterimages while swinging and disappears quickly after release', () => {
  const state = createInitialShellState();
  const viewport = computeVirtualViewport(1440, 900);
  const anchor = state.anchors[0]; // chasm-1 at (1036, 166)

  // Position player within grapple range below chasm-1 with initial forward momentum
  state.player.x = 950;
  state.player.y = 220;
  state.player.vx = 120;
  state.player.vy = 0;
  state.player.grounded = false;

  // Attach grapple on frame 1
  stepShellState(state, 0.016, 'playing', viewport, {
    left: false,
    right: true,
    jumpJustPressed: false,
    mouseDown: true,
    mouseJustPressed: true,
    mouseWorldX: anchor.x,
    mouseWorldY: anchor.y,
  });
  assert.equal(state.grapple.activeAnchorId, anchor.id);

  // Swing for several frames while holding mouse button
  for (let i = 0; i < 10; i++) {
    stepShellState(state, 0.016, 'playing', viewport, {
      left: false,
      right: true,
      jumpJustPressed: false,
      mouseDown: true,
      mouseJustPressed: false,
      mouseWorldX: anchor.x,
      mouseWorldY: anchor.y,
    });
  }

  const peakCount = state.grappleTrail.length;
  assert.ok(
    peakCount >= 3 && peakCount <= 7,
    `expected short active swing trail (3..7 samples), got ${peakCount}`,
  );

  // Release grapple and step ~0.2s — trail must stop growing and expire completely
  for (let i = 0; i < 12; i++) {
    stepShellState(state, 0.016, 'playing', viewport, {
      left: false,
      right: true,
      jumpJustPressed: false,
      mouseDown: false,
      mouseJustPressed: false,
      mouseWorldX: anchor.x,
      mouseWorldY: anchor.y,
    });
  }
  assert.equal(state.grapple.activeAnchorId, null);
  assert.equal(state.grappleTrail.length, 0);
});
