import { PALETTE } from './palette';
import type {
  GameScreenState,
  ShellSimulationState,
  Star,
  ViewportMetrics,
} from './types';

export const MAX_FRAME_DT = 0.05;
export const STAR_TILE_WIDTH = 360;
export const STAR_TILE_HEIGHT = 240;
export const PANEL_GRID_SIZE = 32;

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

  // Choose an integer pixel scale so every pixel stays crisp and blocky
  // across desktop (1440x900 -> scale 4 -> 360x225) and mobile (390x844 -> scale 2 -> 195x422).
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
  return {
    elapsedTime: 0,
    panelScrollY: 0,
    camera: { x: 0, y: 0 },
    player: {
      // Stationary placeholder square: zero velocity, fixed bay position
      xOffset: 0,
      yFromFloor: 0,
      size: 16,
    },
    stars: createStarfield(2026, 48, STAR_TILE_WIDTH, STAR_TILE_HEIGHT),
    starTileWidth: STAR_TILE_WIDTH,
    starTileHeight: STAR_TILE_HEIGHT,
  };
}

export function stepShellState(
  state: ShellSimulationState,
  rawDtSeconds: number,
  screenState: GameScreenState,
): void {
  if (screenState === 'paused') {
    return;
  }

  const dt = clampDeltaTime(rawDtSeconds);
  if (dt <= 0) {
    return;
  }

  state.elapsedTime += dt;

  // Faint continuous shaft descent scroll for background grid depth
  const scrollRate = screenState === 'title' ? 14 : 9;
  state.panelScrollY = (state.panelScrollY + scrollRate * dt) % 4096;

  // Gentle camera drift that drives parallax offsets between starfield, panel-grid, and foreground
  const swayAmpX = screenState === 'title' ? 22 : 12;
  const swayAmpY = screenState === 'title' ? 12 : 6;
  state.camera.x = Math.sin(state.elapsedTime * 0.42) * swayAmpX;
  state.camera.y =
    Math.cos(state.elapsedTime * 0.31) * swayAmpY + state.panelScrollY;
}
