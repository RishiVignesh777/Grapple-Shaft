import type {
  CameraState,
  LevelBounds,
  PlatformRect,
  PlayerBody,
  PlayerInputState,
} from './types';

export const LEVEL_WIDTH = 560;
export const LEVEL_HEIGHT = 360;
export const WALL_THICKNESS = 16;
export const LAVA_HEIGHT = 14;
export const LAVA_TOP_Y = LEVEL_HEIGHT - LAVA_HEIGHT;

export const PLAYER_SIZE = 16;
export const PLAYER_SPAWN_X = LEVEL_WIDTH / 2 - PLAYER_SIZE / 2; // 272
export const PLAYER_SPAWN_Y = 297 - PLAYER_SIZE; // 281 (resting on central pad top y=297)

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

export function createTestPlatforms(): PlatformRect[] {
  return [
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
    // Lower side spike ledges (solid base)
    {
      x: WALL_THICKNESS,
      y: LEVEL_HEIGHT - 16,
      width: 32,
      height: 16,
      kind: 'wall',
    },
    {
      x: LEVEL_WIDTH - WALL_THICKNESS - 32,
      y: LEVEL_HEIGHT - 16,
      width: 32,
      height: 16,
      kind: 'wall',
    },
    // Central starting pad
    {
      x: 232,
      y: 297,
      width: 96,
      height: 12,
      kind: 'pad',
    },
    // Left stepping platform
    {
      x: 136,
      y: 272,
      width: 72,
      height: 12,
      kind: 'platform',
    },
    // Right stepping platform
    {
      x: 352,
      y: 272,
      width: 80,
      height: 12,
      kind: 'platform',
    },
    // Solid bulkhead block on right platform (tests horizontal side collision & step-up)
    {
      x: 408,
      y: 248,
      width: 24,
      height: 24,
      kind: 'block',
    },
    // Overhead test platform above left step (tests head-bump from left step & top-landing from upper-left)
    {
      x: 140,
      y: 214,
      width: 64,
      height: 12,
      kind: 'platform',
    },
    // Upper-left platform (tests left/up camera follow)
    {
      x: 48,
      y: 224,
      width: 76,
      height: 12,
      kind: 'platform',
    },
    // High peak platform (tests vertical camera follow & upper bounds)
    {
      x: 152,
      y: 184,
      width: 72,
      height: 12,
      kind: 'platform',
    },
    // Upper-right platform (tests right/up camera follow)
    {
      x: 444,
      y: 214,
      width: 76,
      height: 12,
      kind: 'platform',
    },
  ];
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

export function stepPlayerPhysics(
  player: PlayerBody,
  input: PlayerInputState,
  platforms: PlatformRect[],
  bounds: LevelBounds,
  dt: number,
): void {
  if (dt <= 0) return;

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

  // 6. Clamp top ceiling & respawn on bay pad if dropping into lava pit
  if (player.y < 0) {
    player.y = 0;
    if (player.vy < 0) player.vy = 0;
  }

  if (player.y + player.height > bounds.lavaTopY + 2) {
    player.x = PLAYER_SPAWN_X;
    player.y = PLAYER_SPAWN_Y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
  }
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
