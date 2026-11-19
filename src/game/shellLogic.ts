import { PALETTE } from './palette';
import {
  LAVA_TOP_Y,
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
  computeTargetCamera,
  createInitialPlayer,
  createTestPlatforms,
  stepPlayerPhysics,
  updateCameraFollow,
} from './physics';
import type {
  GameScreenState,
  PlayerInputState,
  ShellSimulationState,
  Star,
  ViewportMetrics,
} from './types';

export const MAX_FRAME_DT = 0.05;
export const STAR_TILE_WIDTH = 360;
export const STAR_TILE_HEIGHT = 240;
export const PANEL_GRID_SIZE = 32;

const EMPTY_INPUT: PlayerInputState = {
  left: false,
  right: false,
  jumpJustPressed: false,
};

export function clampDeltaTime(rawDtSeconds: number): number {
  if (!Number.isFinite(rawDtSeconds) || rawDtSeconds <= 0) {
    return 0;
  }
  return Math.min(rawDtSeconds, MAX_FRAME_DT);
}

export function computeVirtualViewport(
  cssWidth: number,
  cssHeight: number,
): ViewportMetrics {
  const safeW = Math.max(1, Math.floor(cssWidth));
  const safeH = Math.max(1, Math.floor(cssHeight));

  const rawScale = Math.min(safeW / 320, safeH / 180);
  const pixelScale = Math.max(2, Math.min(5, Math.floor(rawScale) || 2));

  return {
    cssWidth: safeW,
    cssHeight: safeH,
    virtualWidth: Math.max(160, Math.ceil(safeW / pixelScale)),
    virtualHeight: Math.max(120, Math.ceil(safeH / pixelScale)),
    pixelScale,
  };
}

function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStarfield(
  seed = 4096,
  count = 44,
  tileWidth = STAR_TILE_WIDTH,
  tileHeight = STAR_TILE_HEIGHT,
): Star[] {
  const rand = createMulberry32(seed);
  const stars: Star[] = [];

  for (let i = 0; i < count; i++) {
    const roll = rand();
    let color: string = PALETTE.starMuted;
    if (roll > 0.86) {
      color = PALETTE.cyanAccent;
    } else if (roll > 0.58) {
      color = PALETTE.starCool;
    } else if (roll > 0.48) {
      color = PALETTE.starBright;
    }

    stars.push({
      x: Math.floor(rand() * tileWidth),
      y: Math.floor(rand() * tileHeight),
      size: rand() > 0.84 ? 2 : 1,
      color,
      phase: rand() * Math.PI * 2,
      twinkleSpeed: 0.9 + rand() * 2.1,
    });
  }

  return stars;
}

export function positiveModulo(value: number, modulus: number): number {
  if (modulus <= 0) return 0;
  return ((value % modulus) + modulus) % modulus;
}

export function computeParallaxOffset(
  cameraX: number,
  cameraY: number,
  factor: number,
  wrapWidth: number,
  wrapHeight: number,
): { x: number; y: number } {
  return {
    x: positiveModulo(cameraX * factor, wrapWidth),
    y: positiveModulo(cameraY * factor, wrapHeight),
  };
}

export function createInitialShellState(): ShellSimulationState {
  const player = createInitialPlayer();
  const bounds = {
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    lavaTopY: LAVA_TOP_Y,
  };
  return {
    elapsedTime: 0,
    panelScrollY: 0,
    camera: {
      x: (LEVEL_WIDTH - 360) / 2,
      y: LEVEL_HEIGHT - 225,
    },
    player,
    platforms: createTestPlatforms(),
    bounds,
    stars: createStarfield(2026, 48, STAR_TILE_WIDTH, STAR_TILE_HEIGHT),
    starTileWidth: STAR_TILE_WIDTH,
    starTileHeight: STAR_TILE_HEIGHT,
    cameraInitialized: false,
  };
}

export function stepShellState(
  state: ShellSimulationState,
  rawDtSeconds: number,
  screenState: GameScreenState,
  viewport?: ViewportMetrics,
  input: PlayerInputState = EMPTY_INPUT,
): void {
  if (screenState === 'paused') {
    return;
  }

  const vw = viewport?.virtualWidth ?? 360;
  const vh = viewport?.virtualHeight ?? 225;

  if (!state.cameraInitialized) {
    const initialCam = computeTargetCamera(state.player, vw, vh, state.bounds);
    state.camera.x = initialCam.x;
    state.camera.y = initialCam.y;
    state.cameraInitialized = true;
  }

  const dt = clampDeltaTime(rawDtSeconds);
  if (dt <= 0) {
    return;
  }

  state.elapsedTime += dt;

  if (screenState === 'title') {
    // Keep title screen's gentle scenic background scroll with stationary player
    state.panelScrollY = (state.panelScrollY + 14 * dt) % 4096;
    const baseCam = computeTargetCamera(state.player, vw, vh, state.bounds);
    state.camera.x = baseCam.x + Math.sin(state.elapsedTime * 0.42) * 14;
    state.camera.y = baseCam.y;
    return;
  }

  // Playing state: subtle ambient panel drift + real platformer physics & clamped smooth camera
  state.panelScrollY = (state.panelScrollY + 6 * dt) % 4096;
  stepPlayerPhysics(state.player, input, state.platforms, state.bounds, dt);
  updateCameraFollow(state.camera, state.player, vw, vh, state.bounds, dt);
}
