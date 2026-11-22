import type {
  CameraState,
  CheckpointMarker,
  EnergyShard,
  ExitFlagMarker,
  GrappleAnchor,
  GrappleState,
  LavaPitRect,
  LevelBounds,
  PlatformRect,
  PlayerBody,
  PlayerInputState,
  RespawnPoint,
  SpikeCluster,
  ZoneName,
} from './types';

export const LEVEL_WIDTH = 2064;
export const LEVEL_MIN_Y = -220;
export const LEVEL_HEIGHT = 360;
export const DEATH_VOID_Y = LEVEL_HEIGHT + 36;
export const WALL_THICKNESS = 16;
export const SPIKE_WIDTH = 7;
export const SPIKE_HEIGHT = 8;
export const DEATH_FLASH_DURATION = 0.28;
export const CHECKPOINT_FLASH_DURATION = 0.65;

export const PLAYER_SIZE = 16;
export const PLAYER_SPAWN_X = 56;
export const PLAYER_SPAWN_Y = 280 - PLAYER_SIZE; // 264

export const GRAPPLE_PLAYER_RANGE = 152;
export const GRAPPLE_CURSOR_RANGE = 44;
export const GRAPPLE_MIN_ROPE_LENGTH = 24;
export const SHARD_COLLECT_RADIUS = 14;
export const TOTAL_ENERGY_SHARDS = 6;

export const PHYSICS = {
  gravity: 980,
  maxFallSpeed: 420,
  runAccel: 920,
  airAccel: 620,
  groundFriction: 1080,
  airDrag: 160,
  maxRunSpeed: 135,
  jumpVelocity: -335,
  cameraFollowSpeed: 7.5,
} as const;

export interface FacilityLevelData {
  platforms: PlatformRect[];
  lavaPits: LavaPitRect[];
  spikes: SpikeCluster[];
  checkpoints: CheckpointMarker[];
  shards: EnergyShard[];
  exitFlag: ExitFlagMarker;
  anchors: GrappleAnchor[];
  bounds: LevelBounds;
}

export function createFacilityLevel(): FacilityLevelData {
  const platforms: PlatformRect[] = [
    // --- SECTION 1: ACCESS CORRIDOR (unchanged) ---
    {
      x: 0,
      y: LEVEL_MIN_Y,
      width: WALL_THICKNESS,
      height: LEVEL_HEIGHT - LEVEL_MIN_Y,
      kind: 'wall',
    },
    {
      x: WALL_THICKNESS,
      y: 280,
      width: 168,
      height: 80,
      kind: 'pad',
    },
    {
      x: 232,
      y: 272,
      width: 176,
      height: 88,
      kind: 'platform',
    },
    {
      x: 460,
      y: 256,
      width: 184,
      height: 104,
      kind: 'platform',
    },
    {
      x: 692,
      y: 248,
      width: 252,
      height: 112,
      kind: 'platform',
    },

    // --- SECTION 2 & 3: REACTOR CHASM & SERVICE SHAFT (unchanged) ---
    {
      x: 1280,
      y: 248,
      width: 176,
      height: 112,
      kind: 'platform',
    },
    {
      x: 1424,
      y: LEVEL_MIN_Y,
      width: WALL_THICKNESS,
      height: 176 - LEVEL_MIN_Y,
      kind: 'wall',
    },
    // Service Shaft right wall up to top-exit threshold (-116)
    {
      x: 1584,
      y: -116,
      width: WALL_THICKNESS,
      height: LEVEL_HEIGHT - -116,
      kind: 'wall',
    },
    // Service Shaft ceiling cap
    {
      x: 1424,
      y: LEVEL_MIN_Y,
      width: 176,
      height: 16,
      kind: 'wall',
    },
    // Top platform of Service Shaft
    {
      x: 1440,
      y: -116,
      width: 76,
      height: 14,
      kind: 'platform',
    },

    // --- SECTION 4: CORE EXIT ---
    // Core Exit Walkway 1 (after Service Shaft top gap x=1516..1584)
    {
      x: 1584,
      y: -116,
      width: 192,
      height: 52,
      kind: 'platform',
    },
    // Recessed lava basin walls & floor under Core Exit Lava Gap (x=1776..1824)
    {
      x: 1760,
      y: -64,
      width: 16,
      height: 32,
      kind: 'wall',
    },
    {
      x: 1824,
      y: -64,
      width: 16,
      height: 32,
      kind: 'wall',
    },
    {
      x: 1760,
      y: -32,
      width: 80,
      height: 12,
      kind: 'wall',
    },
    // Core Exit Final Walkway leading to exit flag
    {
      x: 1824,
      y: -116,
      width: 224,
      height: 52,
      kind: 'platform',
    },
    // Far right boundary wall
    {
      x: LEVEL_WIDTH - WALL_THICKNESS,
      y: LEVEL_MIN_Y,
      width: WALL_THICKNESS,
      height: LEVEL_HEIGHT - LEVEL_MIN_Y,
      kind: 'wall',
    },
  ];

  const lavaPits: LavaPitRect[] = [
    // Access Corridor Lava Pit 1 & 2
    { x: 184, y: 336, width: 48, height: 24 },
    { x: 408, y: 336, width: 52, height: 24 },
    // Reactor Chasm wide lava pit
    { x: 944, y: 336, width: 336, height: 24 },
    // Service Shaft bottom lava pool
    { x: 1456, y: 336, width: 128, height: 24 },
    // Core Exit Lava Gap (x=1776..1824)
    { x: 1776, y: -56, width: 48, height: 24 },
  ];

  const spikes: SpikeCluster[] = [
    // Access Corridor Spikes
    { x: 308, baseY: 272, count: 3 },
    { x: 540, baseY: 256, count: 3 },
    { x: 884, baseY: 248, count: 2 },
    // Core Exit Spikes
    { x: 1668, baseY: -116, count: 3 },
    { x: 1896, baseY: -116, count: 3 },
  ];

  const checkpoints: CheckpointMarker[] = [
    {
      id: 'cp-corridor',
      x: 816,
      baseY: 248,
      width: 14,
      height: 26,
      reached: false,
      activationFlashTimer: 0,
    },
    {
      id: 'cp-chasm',
      x: 1344,
      baseY: 248,
      width: 14,
      height: 26,
      reached: false,
      activationFlashTimer: 0,
    },
    {
      id: 'cp-shaft-top',
      x: 1468,
      baseY: -116,
      width: 14,
      height: 26,
      reached: false,
      activationFlashTimer: 0,
    },
  ];

  const exitFlag: ExitFlagMarker = {
    x: 1988,
    baseY: -116,
    width: 18,
    height: 32,
  };

  const anchors: GrappleAnchor[] = [
    { id: 'chasm-1', x: 1036, y: 166 },
    { id: 'chasm-2', x: 1192, y: 166 },
    { id: 'shaft-1', x: 1556, y: 166 },
    { id: 'shaft-2', x: 1464, y: 66 },
    { id: 'shaft-3', x: 1556, y: -34 },
  ];

  const shards: EnergyShard[] = [
    // 1. Access Corridor far-left exploration behind spawn
    { id: 'shard-corridor-left', x: 34, y: 218, collected: false },
    // 2. Access Corridor chasm-brink lip past the third spike cluster
    { id: 'shard-corridor-brink', x: 926, y: 224, collected: false },
    // 3. Reactor Chasm daring low swing over the lava pit between anchors
    { id: 'shard-chasm-low', x: 1114, y: 282, collected: false },
    // 4. Service Shaft off-path outward swing against right wall
    { id: 'shard-shaft-mid', x: 1564, y: 58, collected: false },
    // 5. Service Shaft high ceiling alcove above Checkpoint 3
    { id: 'shard-shaft-top', x: 1492, y: -176, collected: false },
    // 6. Core Exit high peak jump arc over the final lava pit
    { id: 'shard-core-gap', x: 1800, y: -172, collected: false },
  ];

  return {
    platforms,
    lavaPits,
    spikes,
    checkpoints,
    shards,
    exitFlag,
    anchors,
    bounds: {
      minX: 0,
      width: LEVEL_WIDTH,
      minY: LEVEL_MIN_Y,
      height: LEVEL_HEIGHT,
      deathVoidY: DEATH_VOID_Y,
    },
  };
}

export function createInitialPlayer(): PlayerBody {
  return {
    x: PLAYER_SPAWN_X,
    y: PLAYER_SPAWN_Y,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: 1,
  };
}

export type CollisionAxis = 'none' | 'top' | 'bottom' | 'left' | 'right';

export function resolveAabbCollision(
  player: PlayerBody,
  rect: PlatformRect,
): CollisionAxis {
  const aCenterX = player.x + player.width / 2;
  const aCenterY = player.y + player.height / 2;
  const bCenterX = rect.x + rect.width / 2;
  const bCenterY = rect.y + rect.height / 2;

  const halfWidths = player.width / 2 + rect.width / 2;
  const halfHeights = player.height / 2 + rect.height / 2;

  const dx = aCenterX - bCenterX;
  const dy = aCenterY - bCenterY;

  const overlapX = halfWidths - Math.abs(dx);
  const overlapY = halfHeights - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) {
    return 'none';
  }

  if (overlapY <= overlapX) {
    if (dy < 0) {
      player.y -= overlapY;
      if (player.vy >= 0) {
        player.vy = 0;
        player.grounded = true;
      }
      return 'top';
    } else {
      player.y += overlapY;
      if (player.vy < 0) {
        player.vy = 0;
      }
      return 'bottom';
    }
  } else {
    if (dx < 0) {
      player.x -= overlapX;
      if (player.vx > 0) {
        player.vx = 0;
      }
      return 'left';
    } else {
      player.x += overlapX;
      if (player.vx < 0) {
        player.vx = 0;
      }
      return 'right';
    }
  }
}

export interface SimpleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectsOverlap(a: SimpleRect, b: SimpleRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function getSpikeHitbox(cluster: SpikeCluster): SimpleRect {
  const totalWidth = cluster.count * SPIKE_WIDTH;
  return {
    x: cluster.x + 2,
    y: cluster.baseY - SPIKE_HEIGHT + 2,
    width: Math.max(2, totalWidth - 4),
    height: SPIKE_HEIGHT - 2,
  };
}

export function getCheckpointHitbox(checkpoint: CheckpointMarker): SimpleRect {
  return {
    x: checkpoint.x,
    y: checkpoint.baseY - checkpoint.height,
    width: checkpoint.width,
    height: checkpoint.height,
  };
}

export function getExitFlagHitbox(flag: ExitFlagMarker): SimpleRect {
  return {
    x: flag.x,
    y: flag.baseY - flag.height,
    width: flag.width,
    height: flag.height,
  };
}

export function findAttachableAnchor(
  player: PlayerBody,
  mouseWorldX: number,
  mouseWorldY: number,
  anchors: GrappleAnchor[],
  playerRange = GRAPPLE_PLAYER_RANGE,
  cursorRange = GRAPPLE_CURSOR_RANGE,
): GrappleAnchor | null {
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;

  let best: GrappleAnchor | null = null;
  let bestCursorDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    const cursorDist = Math.hypot(mouseWorldX - anchor.x, mouseWorldY - anchor.y);
    if (cursorDist > cursorRange) continue;

    const playerDist = Math.hypot(px - anchor.x, py - anchor.y);
    if (playerDist > playerRange) continue;

    if (cursorDist < bestCursorDist) {
      bestCursorDist = cursorDist;
      best = anchor;
    }
  }

  return best;
}

export function applyPendulumConstraint(
  player: PlayerBody,
  anchor: GrappleAnchor,
  ropeLength: number,
): void {
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;

  const dx = px - anchor.x;
  const dy = py - anchor.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= 0.0001) {
    return;
  }

  const nx = dx / dist;
  const ny = dy / dist;

  const constrainedPx = anchor.x + nx * ropeLength;
  const constrainedPy = anchor.y + ny * ropeLength;
  player.x = constrainedPx - player.width / 2;
  player.y = constrainedPy - player.height / 2;

  const radialVel = player.vx * nx + player.vy * ny;
  player.vx -= radialVel * nx;
  player.vy -= radialVel * ny;
}

export function resolveZoneName(
  playerX: number,
  playerY: number,
  currentZone: ZoneName,
): ZoneName {
  if (playerX >= 1580 && playerY <= -60) {
    return 'CORE EXIT';
  }
  if (currentZone === 'CORE EXIT') {
    if (playerX < 1550) return 'SERVICE SHAFT';
    return 'CORE EXIT';
  }
  if (currentZone === 'ACCESS CORRIDOR') {
    if (playerX >= 1432) return 'SERVICE SHAFT';
    if (playerX >= 930) return 'REACTOR CHASM';
    return 'ACCESS CORRIDOR';
  }
  if (currentZone === 'REACTOR CHASM') {
    if (playerX >= 1432) return 'SERVICE SHAFT';
    if (playerX < 900) return 'ACCESS CORRIDOR';
    return 'REACTOR CHASM';
  }
  // SERVICE SHAFT
  if (playerX < 1400) {
    return playerX < 900 ? 'ACCESS CORRIDOR' : 'REACTOR CHASM';
  }
  return 'SERVICE SHAFT';
}

export function respawnPlayerAt(
  player: PlayerBody,
  respawnPoint: RespawnPoint,
): void {
  player.x = respawnPoint.x;
  player.y = respawnPoint.y;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
}

export function stepPlayerPhysics(
  player: PlayerBody,
  input: PlayerInputState,
  platforms: PlatformRect[],
  bounds: LevelBounds,
  dt: number,
  lavaPits: LavaPitRect[] = [],
  spikes: SpikeCluster[] = [],
  checkpoints: CheckpointMarker[] = [],
  respawnPoint: RespawnPoint = { x: PLAYER_SPAWN_X, y: PLAYER_SPAWN_Y },
  anchors: GrappleAnchor[] = [],
  grapple: GrappleState = { activeAnchorId: null, ropeLength: 0 },
  exitFlag?: ExitFlagMarker,
  shards: EnergyShard[] = [],
): {
  died: boolean;
  landed: boolean;
  landingSpeed: number;
  checkpointActivated: boolean;
  shardCollected: boolean;
  collectedShardX: number;
  collectedShardY: number;
  grappleAttached: boolean;
  won: boolean;
} {
  if (dt <= 0) {
    return {
      died: false,
      landed: false,
      landingSpeed: 0,
      checkpointActivated: false,
      shardCollected: false,
      collectedShardX: 0,
      collectedShardY: 0,
      grappleAttached: false,
      won: false,
    };
  }

  let grappleAttached = false;

  if (!input.mouseDown) {
    grapple.activeAnchorId = null;
  } else if (input.mouseJustPressed && grapple.activeAnchorId === null) {
    const target = findAttachableAnchor(
      player,
      input.mouseWorldX,
      input.mouseWorldY,
      anchors,
    );
    if (target) {
      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;
      const dist = Math.hypot(px - target.x, py - target.y);
      grapple.activeAnchorId = target.id;
      grapple.ropeLength = Math.max(
        GRAPPLE_MIN_ROPE_LENGTH,
        Math.min(GRAPPLE_PLAYER_RANGE, dist),
      );
      grappleAttached = true;
    }
  }

  const activeAnchor =
    grapple.activeAnchorId !== null
      ? anchors.find((a) => a.id === grapple.activeAnchorId) ?? null
      : null;

  if (activeAnchor) {
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) {
      player.facing = moveDir > 0 ? 1 : -1;
      player.vx += moveDir * PHYSICS.airAccel * 0.55 * dt;
    }

    player.vy = Math.min(PHYSICS.maxFallSpeed, player.vy + PHYSICS.gravity * dt);
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    applyPendulumConstraint(player, activeAnchor, grapple.ropeLength);
  } else {
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) {
      player.facing = moveDir > 0 ? 1 : -1;
      const accel = player.grounded ? PHYSICS.runAccel : PHYSICS.airAccel;
      player.vx += moveDir * accel * dt;
      if (player.vx > PHYSICS.maxRunSpeed) {
        player.vx = PHYSICS.maxRunSpeed;
      } else if (player.vx < -PHYSICS.maxRunSpeed) {
        player.vx = -PHYSICS.maxRunSpeed;
      }
    } else {
      const decel = player.grounded ? PHYSICS.groundFriction : PHYSICS.airDrag;
      if (Math.abs(player.vx) <= decel * dt) {
        player.vx = 0;
      } else {
        player.vx -= Math.sign(player.vx) * decel * dt;
      }
    }

    if (input.jumpJustPressed && player.grounded) {
      player.vy = PHYSICS.jumpVelocity;
      player.grounded = false;
    }

    player.vy = Math.min(PHYSICS.maxFallSpeed, player.vy + PHYSICS.gravity * dt);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  }

  const wasGrounded = player.grounded;
  const preCollisionVy = player.vy;
  player.grounded = false;
  for (let i = 0; i < platforms.length; i++) {
    resolveAabbCollision(player, platforms[i]);
  }
  const landed = !wasGrounded && player.grounded && preCollisionVy > 45;
  const landingSpeed = landed ? preCollisionVy : 0;

  if (player.y < bounds.minY) {
    player.y = bounds.minY;
    if (player.vy < 0) player.vy = 0;
  }

  let checkpointActivated = false;
  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i];
    if (cp.activationFlashTimer && cp.activationFlashTimer > 0) {
      cp.activationFlashTimer = Math.max(0, cp.activationFlashTimer - dt);
    }
    if (!cp.reached && rectsOverlap(player, getCheckpointHitbox(cp))) {
      cp.reached = true;
      cp.activationFlashTimer = CHECKPOINT_FLASH_DURATION;
      respawnPoint.x = cp.x - 1;
      respawnPoint.y = cp.baseY - player.height;
      checkpointActivated = true;
    }
  }

  let died = player.y > bounds.deathVoidY;

  if (!died) {
    for (let i = 0; i < lavaPits.length; i++) {
      if (rectsOverlap(player, lavaPits[i])) {
        died = true;
        break;
      }
    }
  }

  if (!died) {
    for (let i = 0; i < spikes.length; i++) {
      if (rectsOverlap(player, getSpikeHitbox(spikes[i]))) {
        died = true;
        break;
      }
    }
  }

  if (died) {
    grapple.activeAnchorId = null;
    respawnPlayerAt(player, respawnPoint);
    return {
      died: true,
      landed: false,
      landingSpeed: 0,
      checkpointActivated,
      shardCollected: false,
      collectedShardX: 0,
      collectedShardY: 0,
      grappleAttached,
      won: false,
    };
  }

  let shardCollected = false;
  let collectedShardX = 0;
  let collectedShardY = 0;
  if (shards.length > 0) {
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      if (!shard.collected) {
        const dist = Math.hypot(px - shard.x, py - shard.y);
        if (dist <= SHARD_COLLECT_RADIUS) {
          shard.collected = true;
          shardCollected = true;
          collectedShardX = shard.x;
          collectedShardY = shard.y;
        }
      }
    }
  }

  const won =
    exitFlag !== undefined && rectsOverlap(player, getExitFlagHitbox(exitFlag));
  if (won) {
    grapple.activeAnchorId = null;
  }

  return {
    died: false,
    landed,
    landingSpeed,
    checkpointActivated,
    shardCollected,
    collectedShardX,
    collectedShardY,
    grappleAttached,
    won,
  };
}

export function clampCameraToBounds(
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
  bounds: LevelBounds,
): void {
  const maxCamX = Math.max(bounds.minX, bounds.width - viewportWidth);
  const maxCamY = Math.max(bounds.minY, bounds.height - viewportHeight);

  if (bounds.width - bounds.minX <= viewportWidth) {
    camera.x = bounds.minX + (bounds.width - bounds.minX - viewportWidth) / 2;
  } else {
    camera.x = Math.max(bounds.minX, Math.min(maxCamX, camera.x));
  }

  if (bounds.height - bounds.minY <= viewportHeight) {
    camera.y = bounds.minY + (bounds.height - bounds.minY - viewportHeight) / 2;
  } else {
    camera.y = Math.max(bounds.minY, Math.min(maxCamY, camera.y));
  }
}

export function computeTargetCamera(
  player: PlayerBody,
  viewportWidth: number,
  viewportHeight: number,
  bounds: LevelBounds,
): CameraState {
  const target: CameraState = {
    x: player.x + player.width / 2 - viewportWidth / 2,
    y: player.y + player.height / 2 - viewportHeight * 0.62,
  };
  clampCameraToBounds(target, viewportWidth, viewportHeight, bounds);
  return target;
}

export function updateCameraFollow(
  camera: CameraState,
  player: PlayerBody,
  viewportWidth: number,
  viewportHeight: number,
  bounds: LevelBounds,
  dt: number,
): void {
  const target = computeTargetCamera(
    player,
    viewportWidth,
    viewportHeight,
    bounds,
  );
  if (dt <= 0) {
    camera.x = target.x;
    camera.y = target.y;
    return;
  }

  const alpha = 1 - Math.exp(-PHYSICS.cameraFollowSpeed * dt);
  camera.x += (target.x - camera.x) * alpha;
  camera.y += (target.y - camera.y) * alpha;
  clampCameraToBounds(camera, viewportWidth, viewportHeight, bounds);
}
