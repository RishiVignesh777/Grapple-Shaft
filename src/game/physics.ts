import type {
  CameraState,
  CheckpointMarker,
  LavaPitRect,
  LevelBounds,
  PlatformRect,
  PlayerBody,
  PlayerInputState,
  RespawnPoint,
  SpikeCluster,
} from './types';

export const LEVEL_WIDTH = 960;
export const LEVEL_HEIGHT = 360;
export const DEATH_VOID_Y = LEVEL_HEIGHT + 36;
export const WALL_THICKNESS = 16;
export const SPIKE_WIDTH = 7;
export const SPIKE_HEIGHT = 8;
export const DEATH_FLASH_DURATION = 0.28;

export const PLAYER_SIZE = 16;
export const PLAYER_SPAWN_X = 56;
export const PLAYER_SPAWN_Y = 280 - PLAYER_SIZE; // 264 (resting on entry walkway top y=280)

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

export interface AccessCorridorLevel {
  platforms: PlatformRect[];
  lavaPits: LavaPitRect[];
  spikes: SpikeCluster[];
  checkpoint: CheckpointMarker;
  bounds: LevelBounds;
}

export function createAccessCorridorLevel(): AccessCorridorLevel {
  const platforms: PlatformRect[] = [
    // Solid left & right shaft boundary walls
    {
      x: 0,
      y: 0,
      width: WALL_THICKNESS,
      height: LEVEL_HEIGHT,
      kind: 'wall',
    },
    {
      x: LEVEL_WIDTH - WALL_THICKNESS,
      y: 0,
      width: WALL_THICKNESS,
      height: LEVEL_HEIGHT,
      kind: 'wall',
    },
    // Section 1: Entry Bay walkway
    {
      x: WALL_THICKNESS,
      y: 280,
      width: 168,
      height: 80,
      kind: 'pad',
    },
    // Section 2: Walkway after first lava gap (contains first spike obstacle)
    {
      x: 232,
      y: 272,
      width: 176,
      height: 88,
      kind: 'platform',
    },
    // Section 3: Elevated Mid-Deck after second lava gap (contains second spike obstacle)
    {
      x: 460,
      y: 256,
      width: 184,
      height: 104,
      kind: 'platform',
    },
    // Section 4: Checkpoint Bay near end of Access Corridor (over open safety-net gap)
    {
      x: 692,
      y: 248,
      width: LEVEL_WIDTH - WALL_THICKNESS - 692,
      height: 112,
      kind: 'platform',
    },
  ];

  const lavaPits: LavaPitRect[] = [
    // Lava Pit 1 (between Entry Bay 184 and Walkway 2 at 232)
    {
      x: 184,
      y: 336,
      width: 48,
      height: 24,
    },
    // Lava Pit 2 (between Walkway 2 at 408 and Mid-Deck at 460)
    {
      x: 408,
      y: 336,
      width: 52,
      height: 24,
    },
  ];

  const spikes: SpikeCluster[] = [
    // Spike obstacle 1 on Walkway 2
    {
      x: 308,
      baseY: 272,
      count: 3,
    },
    // Spike obstacle 2 on Mid-Deck
    {
      x: 540,
      baseY: 256,
      count: 3,
    },
    // Spike obstacle 3 past the checkpoint marker (allows quick checkpoint respawn test)
    {
      x: 884,
      baseY: 248,
      count: 2,
    },
  ];

  const checkpoint: CheckpointMarker = {
    x: 816,
    baseY: 248,
    width: 14,
    height: 26,
    reached: false,
  };

  return {
    platforms,
    lavaPits,
    spikes,
    checkpoint,
    bounds: {
      width: LEVEL_WIDTH,
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

  // Resolve along whichever axis has the smaller overlap
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
  // Slightly inset horizontally & from the pixel tip so visual grazes feel fair
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
  checkpoint?: CheckpointMarker,
  respawnPoint: RespawnPoint = { x: PLAYER_SPAWN_X, y: PLAYER_SPAWN_Y },
): { died: boolean; checkpointActivated: boolean } {
  if (dt <= 0) {
    return { died: false, checkpointActivated: false };
  }

  // 1. Horizontal acceleration / friction & speed cap
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

  // 2. Single jump (only when grounded)
  if (input.jumpJustPressed && player.grounded) {
    player.vy = PHYSICS.jumpVelocity;
    player.grounded = false;
  }

  // 3. Gravity
  player.vy = Math.min(PHYSICS.maxFallSpeed, player.vy + PHYSICS.gravity * dt);

  // 4. Integrate position
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // 5. AABB collision against solid platforms (resolve smaller overlap axis)
  player.grounded = false;
  for (let i = 0; i < platforms.length; i++) {
    resolveAabbCollision(player, platforms[i]);
  }

  // 6. Clamp top ceiling
  if (player.y < 0) {
    player.y = 0;
    if (player.vy < 0) player.vy = 0;
  }

  // 7. Checkpoint activation check (before hazard checks if standing safely on bay)
  let checkpointActivated = false;
  if (checkpoint && !checkpoint.reached) {
    if (rectsOverlap(player, getCheckpointHitbox(checkpoint))) {
      checkpoint.reached = true;
      respawnPoint.x = checkpoint.x - 1;
      respawnPoint.y = checkpoint.baseY - player.height;
      checkpointActivated = true;
    }
  }

  // 8. Instant death hazards: lava pits, spike obstacles, or safety-net void fall
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
    respawnPlayerAt(player, respawnPoint);
  }

  return { died, checkpointActivated };
}

export function clampCameraToBounds(
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
  bounds: LevelBounds,
): void {
  const maxCamX = Math.max(0, bounds.width - viewportWidth);
  const maxCamY = Math.max(0, bounds.height - viewportHeight);

  if (bounds.width <= viewportWidth) {
    camera.x = (bounds.width - viewportWidth) / 2;
  } else {
    camera.x = Math.max(0, Math.min(maxCamX, camera.x));
  }

  if (bounds.height <= viewportHeight) {
    camera.y = (bounds.height - viewportHeight) / 2;
  } else {
    camera.y = Math.max(0, Math.min(maxCamY, camera.y));
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
