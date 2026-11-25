import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKPOINT_FLASH_DURATION,
  DEATH_VOID_Y,
  GRAPPLE_CURSOR_RANGE,
  GRAPPLE_PLAYER_RANGE,
  LEVEL_HEIGHT,
  LEVEL_MIN_Y,
  LEVEL_WIDTH,
  PHYSICS,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Y,
  TOTAL_ENERGY_SHARDS,
  applyPendulumConstraint,
  clampCameraToBounds,
  createFacilityLevel,
  createInitialPlayer,
  findAttachableAnchor,
  getSpikeHitbox,
  isAnchorInPlayerRange,
  resolveAabbCollision,
  resolveZoneName,
  stepPlayerPhysics,
  updateCameraFollow,
} from './physics';
import { createInitialShellState, stepShellState } from './shellLogic';
import type { LevelBounds, PlatformRect, PlayerInputState } from './types';

const BOUNDS: LevelBounds = {
  minX: 0,
  width: LEVEL_WIDTH,
  minY: LEVEL_MIN_Y,
  height: LEVEL_HEIGHT,
  deathVoidY: DEATH_VOID_Y,
};

const NO_INPUT: PlayerInputState = {
  left: false,
  right: false,
  jumpJustPressed: false,
  mouseDown: false,
  mouseJustPressed: false,
  mouseWorldX: -9999,
  mouseWorldY: -9999,
};

test('gravity accelerates player downward when airborne', () => {
  const player = createInitialPlayer();
  player.grounded = false;
  player.y = 100;

  stepPlayerPhysics(player, NO_INPUT, [], BOUNDS, 0.02);

  assert.ok(player.vy > 0);
  assert.ok(player.y > 100);
});

test('run acceleration caps at maxRunSpeed and ground friction decelerates to zero', () => {
  const player = createInitialPlayer();
  const level = createFacilityLevel();

  for (let i = 0; i < 60; i++) {
    stepPlayerPhysics(
      player,
      { ...NO_INPUT, right: true },
      level.platforms,
      BOUNDS,
      0.016,
    );
  }

  assert.equal(player.vx, PHYSICS.maxRunSpeed);

  for (let i = 0; i < 60; i++) {
    stepPlayerPhysics(player, NO_INPUT, level.platforms, BOUNDS, 0.016);
  }

  assert.equal(player.vx, 0);
});

test('single jump triggers only when grounded and ignores mid-air jump input', () => {
  const player = createInitialPlayer();
  const level = createFacilityLevel();

  stepPlayerPhysics(
    player,
    { ...NO_INPUT, jumpJustPressed: true },
    level.platforms,
    BOUNDS,
    0.016,
  );
  assert.equal(player.grounded, false);
  assert.ok(player.vy < 0);

  player.vy = 20;
  stepPlayerPhysics(
    player,
    { ...NO_INPUT, jumpJustPressed: true },
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

test('camera smoothly follows player and clamps within level bounds including upper shaft', () => {
  const player = createInitialPlayer();
  const camera = { x: 0, y: 135 };

  player.x = LEVEL_WIDTH - 24;
  player.y = -150;

  for (let i = 0; i < 160; i++) {
    updateCameraFollow(camera, player, 360, 225, BOUNDS, 0.016);
  }

  assert.ok(camera.x <= LEVEL_WIDTH - 360);
  assert.ok(camera.x >= LEVEL_WIDTH - 360 - 1);
  assert.ok(camera.y >= LEVEL_MIN_Y);
  assert.ok(camera.y < 0);

  const outOfBounds = { x: -50, y: 999 };
  clampCameraToBounds(outOfBounds, 360, 225, BOUNDS);
  assert.equal(outOfBounds.x, 0);
  assert.equal(outOfBounds.y, LEVEL_HEIGHT - 225);
});

test('lava, spike, and safety-net void contact cause instant death and respawn at start when no checkpoint reached', () => {
  const level = createFacilityLevel();
  const respawn = { x: PLAYER_SPAWN_X, y: PLAYER_SPAWN_Y };

  const lavaPlayer = createInitialPlayer();
  lavaPlayer.x = level.lavaPits[0].x + 8;
  lavaPlayer.y = level.lavaPits[0].y - 4;
  const lavaResult = stepPlayerPhysics(
    lavaPlayer,
    NO_INPUT,
    level.platforms,
    BOUNDS,
    0.016,
    level.lavaPits,
    level.spikes,
    level.checkpoints,
    respawn,
  );
  assert.equal(lavaResult.died, true);
  assert.equal(lavaPlayer.x, PLAYER_SPAWN_X);
  assert.equal(lavaPlayer.y, PLAYER_SPAWN_Y);

  const spikePlayer = createInitialPlayer();
  const spikeHitbox = getSpikeHitbox(level.spikes[0]);
  spikePlayer.x = spikeHitbox.x;
  spikePlayer.y = spikeHitbox.y - 4;
  const spikeResult = stepPlayerPhysics(
    spikePlayer,
    NO_INPUT,
    level.platforms,
    BOUNDS,
    0.016,
    level.lavaPits,
    level.spikes,
    level.checkpoints,
    respawn,
  );
  assert.equal(spikeResult.died, true);
  assert.equal(spikePlayer.x, PLAYER_SPAWN_X);

  const voidPlayer = createInitialPlayer();
  voidPlayer.x = 660;
  voidPlayer.y = DEATH_VOID_Y + 2;
  const voidResult = stepPlayerPhysics(
    voidPlayer,
    NO_INPUT,
    level.platforms,
    BOUNDS,
    0.016,
    level.lavaPits,
    level.spikes,
    level.checkpoints,
    respawn,
  );
  assert.equal(voidResult.died, true);
  assert.equal(voidPlayer.x, PLAYER_SPAWN_X);
});

test('facility level includes Reactor Chasm, Service Shaft, 5 anchors, and 3 checkpoints', () => {
  const level = createFacilityLevel();
  assert.equal(level.checkpoints.length, 3);
  assert.equal(level.anchors.length, 5);

  // Reactor Chasm: 2 anchors above wide lava chasm (x=944..1280)
  const chasmPit = level.lavaPits.find((p) => p.x === 944);
  assert.ok(chasmPit && chasmPit.width >= 300);
  const chasmAnchors = level.anchors.filter(
    (a) => a.x > 944 && a.x < 1280,
  );
  assert.equal(chasmAnchors.length, 2);

  // Service Shaft: 3 anchors alternating right -> left -> right, lava bottom, top platform
  const shaftAnchors = level.anchors.filter((a) => a.x >= 1440);
  assert.equal(shaftAnchors.length, 3);
  assert.ok(shaftAnchors[0].x > 1512);
  assert.ok(shaftAnchors[1].x < 1512);
  assert.ok(shaftAnchors[2].x > 1512);
  assert.ok(level.lavaPits.some((p) => p.x >= 1440));
  assert.ok(level.platforms.some((p) => p.y < 0 && p.x >= 1440));
});

test('findAttachableAnchor requires anchor within both player range and cursor range', () => {
  const anchor = { id: 'a1', x: 200, y: 100 };
  const player = { ...createInitialPlayer(), x: 140, y: 180 }; // dist ~ 100 <= 152

  // Cursor close, player close -> attaches
  assert.equal(
    findAttachableAnchor(player, 210, 108, [anchor])?.id,
    'a1',
  );

  // Cursor too far from anchor -> null
  assert.equal(
    findAttachableAnchor(player, 200 + GRAPPLE_CURSOR_RANGE + 10, 100, [anchor]),
    null,
  );

  // Player too far from anchor -> null
  const farPlayer = {
    ...createInitialPlayer(),
    x: 200 + GRAPPLE_PLAYER_RANGE + 30,
    y: 100,
  };
  assert.equal(findAttachableAnchor(farPlayer, 200, 100, [anchor]), null);
});

test('pendulum physics constrains rope length, removes radial velocity, and preserves momentum on release', () => {
  const anchor = { id: 'swing', x: 200, y: 100 };
  const player = {
    ...createInitialPlayer(),
    x: 200 - 8 + 80, // center at (280, 160) -> dist = sqrt(80^2 + 60^2) = 100
    y: 160 - 8,
    vx: 60,
    vy: 80,
    grounded: false,
  };

  // Direct constraint check
  applyPendulumConstraint(player, anchor, 100);
  const cx = player.x + 8;
  const cy = player.y + 8;
  const dist = Math.hypot(cx - anchor.x, cy - anchor.y);
  assert.ok(Math.abs(dist - 100) < 0.001);

  // Radial component along (0.8, 0.6) must now be 0
  const radial = player.vx * ((cx - anchor.x) / dist) + player.vy * ((cy - anchor.y) / dist);
  assert.ok(Math.abs(radial) < 0.001);

  // Full step attach -> swing -> release preserves velocity momentum
  const grapple = { activeAnchorId: null as string | null, ropeLength: 0 };
  const p2 = {
    ...createInitialPlayer(),
    x: 200 - 8 + 60,
    y: 180 - 8,
    vx: 90,
    vy: 0,
    grounded: false,
  };
  const resAttach = stepPlayerPhysics(
    p2,
    {
      ...NO_INPUT,
      mouseDown: true,
      mouseJustPressed: true,
      mouseWorldX: anchor.x,
      mouseWorldY: anchor.y,
    },
    [],
    BOUNDS,
    0.016,
    [],
    [],
    [],
    undefined,
    [anchor],
    grapple,
  );
  assert.equal(resAttach.grappleAttached, true);
  assert.equal(grapple.activeAnchorId, 'swing');

  const swingingVx = p2.vx;
  const swingingVy = p2.vy;

  // Release mouse -> detaches while preserving momentum (only gravity modifies vy slightly)
  stepPlayerPhysics(
    p2,
    { ...NO_INPUT, mouseDown: false },
    [],
    BOUNDS,
    0.016,
    [],
    [],
    [],
    undefined,
    [anchor],
    grapple,
  );
  assert.equal(grapple.activeAnchorId, null);
  assert.ok(Math.abs(p2.vx - swingingVx) < 5);
  assert.ok(p2.vy > swingingVy);
});

test('all 3 checkpoints update respawn point and zone transitions emit REACTOR CHASM and SERVICE SHAFT', () => {
  const state = createInitialShellState();
  const cp2 = state.checkpoints[1];
  const cp3 = state.checkpoints[2];

  // Enter Reactor Chasm
  state.player.x = 950;
  state.player.y = 200;
  const chasmStep = stepShellState(state, 0.016, 'playing');
  assert.equal(chasmStep.enteredZone, 'REACTOR CHASM');

  // Touch Checkpoint 2
  state.player.x = cp2.x;
  state.player.y = cp2.baseY - state.player.height;
  const cp2Step = stepShellState(state, 0.016, 'playing');
  assert.equal(cp2Step.checkpointActivated, true);
  assert.equal(cp2.reached, true);
  assert.equal(state.respawnPoint.x, cp2.x - 1);

  // Enter Service Shaft & touch Checkpoint 3
  state.player.x = cp3.x;
  state.player.y = cp3.baseY - state.player.height;
  const cp3Step = stepShellState(state, 0.016, 'playing');
  assert.equal(cp3Step.enteredZone, 'SERVICE SHAFT');
  assert.equal(cp3Step.checkpointActivated, true);
  assert.equal(cp3.reached, true);
  assert.equal(state.respawnPoint.x, cp3.x - 1);
  assert.equal(state.respawnPoint.y, cp3.baseY - state.player.height);

  // Falling into shaft lava respawns at Checkpoint 3
  state.player.x = 1500;
  state.player.y = 336;
  const deathStep = stepShellState(state, 0.016, 'playing');
  assert.equal(deathStep.died, true);
  assert.equal(state.player.x, cp3.x - 1);
  assert.equal(state.player.y, cp3.baseY - state.player.height);

  assert.equal(resolveZoneName(500, 240, 'ACCESS CORRIDOR'), 'ACCESS CORRIDOR');
  assert.equal(resolveZoneName(1050, 200, 'ACCESS CORRIDOR'), 'REACTOR CHASM');
  assert.equal(resolveZoneName(1500, 120, 'REACTOR CHASM'), 'SERVICE SHAFT');
  assert.equal(resolveZoneName(1620, -132, 'SERVICE SHAFT'), 'CORE EXIT');
});

test('Core Exit section has walkway, 2 spike clusters, lava gap, exit flag, win trigger, and full run reset', () => {
  const level = createFacilityLevel();

  // Core Exit walkways at y=-116
  assert.ok(level.platforms.some((p) => p.x === 1584 && p.y === -116 && p.width === 192));
  assert.ok(level.platforms.some((p) => p.x === 1824 && p.y === -116 && p.width === 224));

  // Core Exit spikes & lava gap
  const coreSpikes = level.spikes.filter((s) => s.x >= 1584 && s.baseY === -116);
  assert.equal(coreSpikes.length, 2);
  const coreLava = level.lavaPits.find((p) => p.x === 1776 && p.y === -56);
  assert.ok(coreLava && coreLava.width === 48);

  // Exit flag at the end
  assert.equal(level.exitFlag.x, 1988);
  assert.equal(level.exitFlag.baseY, -116);

  // Simulate entering CORE EXIT, reaching exit flag -> won: true
  const state = createInitialShellState();
  state.checkpoints.forEach((cp) => {
    cp.reached = true;
  });
  state.respawnPoint = { x: 1467, y: -142 };
  state.deathCount = 4;

  state.player.x = 1600;
  state.player.y = -132;
  const zoneStep = stepShellState(state, 0.016, 'playing');
  assert.equal(zoneStep.enteredZone, 'CORE EXIT');
  assert.equal(state.currentZone, 'CORE EXIT');

  // Touch exit flag
  state.player.x = state.exitFlag.x;
  state.player.y = state.exitFlag.baseY - state.player.height;
  const winStep = stepShellState(state, 0.016, 'playing');
  assert.equal(winStep.won, true);

  // Simulation freezes while screenState is 'won'
  const frozenElapsed = state.elapsedTime;
  const frozenX = state.player.x;
  stepShellState(state, 0.016, 'won', undefined, { ...NO_INPUT, right: true });
  assert.equal(state.elapsedTime, frozenElapsed);
  assert.equal(state.player.x, frozenX);

  // Full restart resets player to beginning, clears checkpoints and death count
  const restarted = createInitialShellState();
  assert.equal(restarted.player.x, PLAYER_SPAWN_X);
  assert.equal(restarted.player.y, PLAYER_SPAWN_Y);
  assert.equal(restarted.respawnPoint.x, PLAYER_SPAWN_X);
  assert.equal(restarted.respawnPoint.y, PLAYER_SPAWN_Y);
  assert.equal(restarted.currentZone, 'ACCESS CORRIDOR');
  assert.equal(restarted.deathCount, 0);
  assert.equal(restarted.checkpoints.every((cp) => !cp.reached), true);
});

test('checkpoint activation sets marker flash timer once and decays cleanly to zero', () => {
  const state = createInitialShellState();
  const cp1 = state.checkpoints[0];
  assert.equal(cp1.activationFlashTimer ?? 0, 0);

  state.player.x = cp1.x;
  state.player.y = cp1.baseY - state.player.height;
  const firstTouch = stepShellState(state, 0.016, 'playing');
  assert.equal(firstTouch.checkpointActivated, true);
  assert.equal(cp1.activationFlashTimer, CHECKPOINT_FLASH_DURATION);

  // Decay over several frames without re-triggering on already-reached checkpoint
  for (let i = 0; i < 10; i++) {
    const step = stepShellState(state, 0.05, 'playing');
    assert.equal(step.checkpointActivated, false);
  }
  const midFlash = cp1.activationFlashTimer ?? 0;
  assert.ok(midFlash > 0 && midFlash < CHECKPOINT_FLASH_DURATION);

  for (let i = 0; i < 20; i++) {
    stepShellState(state, 0.05, 'playing');
  }
  assert.equal(cp1.activationFlashTimer, 0);
});

test('facility includes 6 off-path energy shards that collect via proximity without blocking win', () => {
  const state = createInitialShellState();
  assert.equal(state.shards.length, TOTAL_ENERGY_SHARDS);
  assert.equal(state.shards.length, 6);
  assert.equal(state.shards.every((s) => !s.collected), true);

  // Move player onto first shard (far-left corridor exploration)
  const shard0 = state.shards[0];
  state.player.x = shard0.x - state.player.width / 2;
  state.player.y = shard0.y - state.player.height / 2;
  state.player.vx = 0;
  state.player.vy = 0;
  const collectStep = stepShellState(state, 0.016, 'playing');
  assert.equal(collectStep.shardCollected, true);
  assert.equal(shard0.collected, true);
  assert.equal(state.shards.filter((s) => s.collected).length, 1);

  // Re-stepping on same spot does not double-collect
  const repeatStep = stepShellState(state, 0.016, 'playing');
  assert.equal(repeatStep.shardCollected, false);
  assert.equal(state.shards.filter((s) => s.collected).length, 1);

  // Exit flag still wins with only 1/6 shards collected (shards are optional)
  state.player.x = state.exitFlag.x;
  state.player.y = state.exitFlag.baseY - state.player.height;
  const winStep = stepShellState(state, 0.016, 'playing');
  assert.equal(winStep.won, true);

  // Fresh restart resets all 6 shards to uncollected
  const restarted = createInitialShellState();
  assert.equal(restarted.shards.filter((s) => s.collected).length, 0);
});

test('isAnchorInPlayerRange matches grapple attach range without altering attach behavior', () => {
  const anchor = { id: 'a1', x: 200, y: 100 };
  const inRangePlayer = {
    ...createInitialPlayer(),
    x: 200 - 8 + 150,
    y: 100 - 8,
  };
  assert.equal(isAnchorInPlayerRange(inRangePlayer, anchor), true);
  assert.equal(
    findAttachableAnchor(inRangePlayer, anchor.x, anchor.y, [anchor])?.id,
    'a1',
  );

  const outOfRangePlayer = {
    ...createInitialPlayer(),
    x: 200 - 8 + GRAPPLE_PLAYER_RANGE + 1,
    y: 100 - 8,
  };
  assert.equal(isAnchorInPlayerRange(outOfRangePlayer, anchor), false);
  assert.equal(
    findAttachableAnchor(outOfRangePlayer, anchor.x, anchor.y, [anchor]),
    null,
  );
});




