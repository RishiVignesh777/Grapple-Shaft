import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEATH_VOID_Y,
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
  PHYSICS,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Y,
  clampCameraToBounds,
  createAccessCorridorLevel,
  createInitialPlayer,
  getSpikeHitbox,
  resolveAabbCollision,
  stepPlayerPhysics,
  updateCameraFollow,
} from './physics';
import { createInitialShellState, stepShellState } from './shellLogic';
import type { LevelBounds, PlatformRect } from './types';

const BOUNDS: LevelBounds = {
  width: LEVEL_WIDTH,
  height: LEVEL_HEIGHT,
  deathVoidY: DEATH_VOID_Y,
};

test('gravity accelerates player downward when airborne', () => {
  const player = createInitialPlayer();
  player.grounded = false;
  player.y = 100;

  stepPlayerPhysics(
    player,
    { left: false, right: false, jumpJustPressed: false },
    [],
    BOUNDS,
    0.02,
  );

  assert.ok(player.vy > 0);
  assert.ok(player.y > 100);
});

test('run acceleration caps at maxRunSpeed and ground friction decelerates to zero', () => {
  const player = createInitialPlayer();
  const level = createAccessCorridorLevel();

  for (let i = 0; i < 60; i++) {
    stepPlayerPhysics(
      player,
      { left: false, right: true, jumpJustPressed: false },
      level.platforms,
      BOUNDS,
      0.016,
    );
  }

  assert.equal(player.vx, PHYSICS.maxRunSpeed);

  for (let i = 0; i < 60; i++) {
    stepPlayerPhysics(
      player,
      { left: false, right: false, jumpJustPressed: false },
      level.platforms,
      BOUNDS,
      0.016,
    );
  }

  assert.equal(player.vx, 0);
});

test('single jump triggers only when grounded and ignores mid-air jump input', () => {
  const player = createInitialPlayer();
  const level = createAccessCorridorLevel();

  stepPlayerPhysics(
    player,
    { left: false, right: false, jumpJustPressed: true },
    level.platforms,
    BOUNDS,
    0.016,
  );
  assert.equal(player.grounded, false);
  assert.ok(player.vy < 0);

  player.vy = 20;
  stepPlayerPhysics(
    player,
    { left: false, right: false, jumpJustPressed: true },
    level.platforms,
    BOUNDS,
    0.016,
  );
  assert.ok(player.vy > 20);
});

test('AABB collision resolves along smaller overlap axis for top, bottom, left, and right', () => {
  const block: PlatformRect = { x: 100, y: 100, width: 40, height: 20 };

  const topPlayer = {
    ...createInitialPlayer(),
    x: 110,
    y: 86,
    vy: 50,
    grounded: false,
  };
  assert.equal(resolveAabbCollision(topPlayer, block), 'top');
  assert.equal(topPlayer.y, 84);
  assert.equal(topPlayer.vy, 0);
  assert.equal(topPlayer.grounded, true);

  const bottomPlayer = {
    ...createInitialPlayer(),
    x: 110,
    y: 117,
    vy: -80,
    grounded: false,
  };
  assert.equal(resolveAabbCollision(bottomPlayer, block), 'bottom');
  assert.equal(bottomPlayer.y, 120);
  assert.equal(bottomPlayer.vy, 0);
  assert.equal(bottomPlayer.grounded, false);

  const leftPlayer = { ...createInitialPlayer(), x: 87, y: 102, vx: 60 };
  assert.equal(resolveAabbCollision(leftPlayer, block), 'left');
  assert.equal(leftPlayer.x, 84);
  assert.equal(leftPlayer.vx, 0);

  const rightPlayer = { ...createInitialPlayer(), x: 137, y: 102, vx: -60 };
  assert.equal(resolveAabbCollision(rightPlayer, block), 'right');
  assert.equal(rightPlayer.x, 140);
  assert.equal(rightPlayer.vx, 0);
});

test('camera smoothly follows player and clamps within level bounds', () => {
  const player = createInitialPlayer();
  const camera = { x: 0, y: 135 };

  player.x = LEVEL_WIDTH - 24;
  player.y = 10;

  for (let i = 0; i < 120; i++) {
    updateCameraFollow(camera, player, 360, 225, BOUNDS, 0.016);
  }

  assert.ok(camera.x <= LEVEL_WIDTH - 360);
  assert.ok(camera.x >= LEVEL_WIDTH - 360 - 1);
  assert.ok(camera.y >= 0);

  const outOfBounds = { x: -50, y: 999 };
  clampCameraToBounds(outOfBounds, 360, 225, BOUNDS);
  assert.equal(outOfBounds.x, 0);
  assert.equal(outOfBounds.y, LEVEL_HEIGHT - 225);
});

test('lava, spike, and safety-net void contact cause instant death and respawn at start when no checkpoint reached', () => {
  const level = createAccessCorridorLevel();
  const respawn = { x: PLAYER_SPAWN_X, y: PLAYER_SPAWN_Y };

  // 1. Lava contact
  const lavaPlayer = createInitialPlayer();
  lavaPlayer.x = level.lavaPits[0].x + 8;
  lavaPlayer.y = level.lavaPits[0].y - 4;
  const lavaResult = stepPlayerPhysics(
    lavaPlayer,
    { left: false, right: false, jumpJustPressed: false },
    level.platforms,
    BOUNDS,
    0.016,
    level.lavaPits,
    level.spikes,
    level.checkpoint,
    respawn,
  );
  assert.equal(lavaResult.died, true);
  assert.equal(lavaPlayer.x, PLAYER_SPAWN_X);
  assert.equal(lavaPlayer.y, PLAYER_SPAWN_Y);

  // 2. Spike contact
  const spikePlayer = createInitialPlayer();
  const spikeHitbox = getSpikeHitbox(level.spikes[0]);
  spikePlayer.x = spikeHitbox.x;
  spikePlayer.y = spikeHitbox.y - 4;
  const spikeResult = stepPlayerPhysics(
    spikePlayer,
    { left: false, right: false, jumpJustPressed: false },
    level.platforms,
    BOUNDS,
    0.016,
    level.lavaPits,
    level.spikes,
    level.checkpoint,
    respawn,
  );
  assert.equal(spikeResult.died, true);
  assert.equal(spikePlayer.x, PLAYER_SPAWN_X);

  // 3. Falling far below level (safety net)
  const voidPlayer = createInitialPlayer();
  voidPlayer.x = 660;
  voidPlayer.y = DEATH_VOID_Y + 2;
  const voidResult = stepPlayerPhysics(
    voidPlayer,
    { left: false, right: false, jumpJustPressed: false },
    level.platforms,
    BOUNDS,
    0.016,
    level.lavaPits,
    level.spikes,
    level.checkpoint,
    respawn,
  );
  assert.equal(voidResult.died, true);
  assert.equal(voidPlayer.x, PLAYER_SPAWN_X);
});

test('reaching checkpoint updates respawn point and triggers death flash on subsequent hazard death', () => {
  const state = createInitialShellState();
  const cp = state.checkpoint;

  // Move player onto checkpoint marker
  state.player.x = cp.x;
  state.player.y = cp.baseY - state.player.height;

  const touchEvents = stepShellState(state, 0.016, 'playing');
  assert.equal(touchEvents.checkpointActivated, true);
  assert.equal(state.checkpoint.reached, true);
  assert.equal(state.respawnPoint.x, cp.x - 1);
  assert.equal(state.respawnPoint.y, cp.baseY - state.player.height);

  // Now hit the post-checkpoint spike
  const endSpike = getSpikeHitbox(state.spikes[state.spikes.length - 1]);
  state.player.x = endSpike.x;
  state.player.y = endSpike.y - 4;
  const deathEvents = stepShellState(state, 0.016, 'playing');
  assert.equal(deathEvents.died, true);
  assert.equal(state.deathCount, 1);
  assert.ok(state.deathFlashTimer > 0);
  assert.equal(state.player.x, state.respawnPoint.x);
  assert.equal(state.player.y, state.respawnPoint.y);
});
