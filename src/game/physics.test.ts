import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
  PHYSICS,
  clampCameraToBounds,
  createInitialPlayer,
  createTestPlatforms,
  resolveAabbCollision,
  stepPlayerPhysics,
  updateCameraFollow,
} from './physics';
import type { LevelBounds, PlatformRect } from './types';

const BOUNDS: LevelBounds = {
  width: LEVEL_WIDTH,
  height: LEVEL_HEIGHT,
  lavaTopY: LEVEL_HEIGHT - 14,
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
  const platforms = createTestPlatforms();

  for (let i = 0; i < 60; i++) {
    stepPlayerPhysics(
      player,
      { left: false, right: true, jumpJustPressed: false },
      platforms,
      BOUNDS,
      0.016,
    );
  }

  assert.equal(player.vx, PHYSICS.maxRunSpeed);

  for (let i = 0; i < 60; i++) {
    stepPlayerPhysics(
      player,
      { left: false, right: false, jumpJustPressed: false },
      platforms,
      BOUNDS,
      0.016,
    );
  }

  assert.equal(player.vx, 0);
});

test('single jump triggers only when grounded and ignores mid-air jump input', () => {
  const player = createInitialPlayer();
  const platforms = createTestPlatforms();

  // Grounded jump succeeds
  stepPlayerPhysics(
    player,
    { left: false, right: false, jumpJustPressed: true },
    platforms,
    BOUNDS,
    0.016,
  );
  assert.equal(player.grounded, false);
  assert.ok(player.vy < 0);

  // Mid-air jump while falling/rising is ignored
  player.vy = 20;
  stepPlayerPhysics(
    player,
    { left: false, right: false, jumpJustPressed: true },
    platforms,
    BOUNDS,
    0.016,
  );
  assert.ok(player.vy > 20);
});

test('AABB collision resolves along smaller overlap axis for top, bottom, left, and right', () => {
  const block: PlatformRect = { x: 100, y: 100, width: 40, height: 20 };

  // Landing on top (vertical overlap 2 < horizontal overlap 12)
  const topPlayer = { ...createInitialPlayer(), x: 110, y: 86, vy: 50, grounded: false };
  assert.equal(resolveAabbCollision(topPlayer, block), 'top');
  assert.equal(topPlayer.y, 84);
  assert.equal(topPlayer.vy, 0);
  assert.equal(topPlayer.grounded, true);

  // Hitting head on bottom (vertical overlap 3 < horizontal overlap 12)
  const bottomPlayer = { ...createInitialPlayer(), x: 110, y: 117, vy: -80, grounded: false };
  assert.equal(resolveAabbCollision(bottomPlayer, block), 'bottom');
  assert.equal(bottomPlayer.y, 120);
  assert.equal(bottomPlayer.vy, 0);
  assert.equal(bottomPlayer.grounded, false);

  // Blocked on left side of block (horizontal overlap 3 < vertical overlap 14)
  const leftPlayer = { ...createInitialPlayer(), x: 87, y: 102, vx: 60 };
  assert.equal(resolveAabbCollision(leftPlayer, block), 'left');
  assert.equal(leftPlayer.x, 84);
  assert.equal(leftPlayer.vx, 0);

  // Blocked on right side of block (horizontal overlap 3 < vertical overlap 14)
  const rightPlayer = { ...createInitialPlayer(), x: 137, y: 102, vx: -60 };
  assert.equal(resolveAabbCollision(rightPlayer, block), 'right');
  assert.equal(rightPlayer.x, 140);
  assert.equal(rightPlayer.vx, 0);
});

test('camera smoothly follows player and clamps within level bounds', () => {
  const player = createInitialPlayer();
  const camera = { x: 100, y: 135 };

  // Move player to far right edge and high up
  player.x = LEVEL_WIDTH - 24;
  player.y = 10;

  for (let i = 0; i < 120; i++) {
    updateCameraFollow(camera, player, 360, 225, BOUNDS, 0.016);
  }

  assert.ok(camera.x <= LEVEL_WIDTH - 360);
  assert.ok(camera.x >= LEVEL_WIDTH - 360 - 1);
  assert.ok(camera.y >= 0);

  // Direct clamp test beyond min/max
  const outOfBounds = { x: -50, y: 999 };
  clampCameraToBounds(outOfBounds, 360, 225, BOUNDS);
  assert.equal(outOfBounds.x, 0);
  assert.equal(outOfBounds.y, LEVEL_HEIGHT - 225);
});
