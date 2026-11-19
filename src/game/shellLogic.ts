import { PALETTE } from './palette';
import {
  DEATH_FLASH_DURATION,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Y,
  computeTargetCamera,
  createFacilityLevel,
  createInitialPlayer,
  findAttachableAnchor,
  resolveZoneName,
  stepPlayerPhysics,
  updateCameraFollow,
} from './physics';
import type {
  GameScreenState,
  PlayerInputState,
  ShellSimulationState,
  Star,
  StepEvents,
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
  mouseDown: false,
  mouseJustPressed: false,
  mouseWorldX: -9999,
  mouseWorldY: -9999,
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
  const level = createFacilityLevel();

  return {
    elapsedTime: 0,
    panelScrollY: 0,
    camera: {
      x: 0,
      y: level.bounds.height - 225,
    },
    player,
    platforms: level.platforms,
    lavaPits: level.lavaPits,
    spikes: level.spikes,
    checkpoints: level.checkpoints,
    exitFlag: level.exitFlag,
    anchors: level.anchors,
    grapple: {
      activeAnchorId: null,
      ropeLength: 0,
    },
    hoveredAnchorId: null,
    currentZone: 'ACCESS CORRIDOR',
    respawnPoint: {
      x: PLAYER_SPAWN_X,
      y: PLAYER_SPAWN_Y,
    },
    deathFlashTimer: 0,
    deathCount: 0,
    bounds: level.bounds,
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
): StepEvents {
  const noEvents: StepEvents = {
    died: false,
    checkpointActivated: false,
    grappleAttached: false,
    enteredZone: null,
    won: false,
  };
  if (screenState === 'paused' || screenState === 'won') {
    state.grapple.activeAnchorId = null;
    state.hoveredAnchorId = null;
    return noEvents;
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
    return noEvents;
  }

  state.elapsedTime += dt;

  if (screenState === 'title') {
    state.panelScrollY = (state.panelScrollY + 14 * dt) % 4096;
    const baseCam = computeTargetCamera(state.player, vw, vh, state.bounds);
    state.camera.x = Math.max(
      0,
      baseCam.x + (1 + Math.sin(state.elapsedTime * 0.42)) * 8,
    );
    state.camera.y = baseCam.y;
    state.hoveredAnchorId = null;
    return noEvents;
  }

  state.panelScrollY = (state.panelScrollY + 6 * dt) % 4096;

  if (state.deathFlashTimer > 0) {
    state.deathFlashTimer = Math.max(0, state.deathFlashTimer - dt);
  }

  const events = stepPlayerPhysics(
    state.player,
    input,
    state.platforms,
    state.bounds,
    dt,
    state.lavaPits,
    state.spikes,
    state.checkpoints,
    state.respawnPoint,
    state.anchors,
    state.grapple,
    state.exitFlag,
  );

  if (state.grapple.activeAnchorId === null) {
    const candidate = findAttachableAnchor(
      state.player,
      input.mouseWorldX,
      input.mouseWorldY,
      state.anchors,
    );
    state.hoveredAnchorId = candidate ? candidate.id : null;
  } else {
    state.hoveredAnchorId = state.grapple.activeAnchorId;
  }

  const nextZone = resolveZoneName(
    state.player.x,
    state.player.y,
    state.currentZone,
  );
  let enteredZone: StepEvents['enteredZone'] = null;
  if (nextZone !== state.currentZone) {
    state.currentZone = nextZone;
    enteredZone = nextZone;
  }

  if (events.died) {
    state.deathCount += 1;
    state.deathFlashTimer = DEATH_FLASH_DURATION;
    const respawnCam = computeTargetCamera(state.player, vw, vh, state.bounds);
    state.camera.x = respawnCam.x;
    state.camera.y = respawnCam.y;
  } else {
    updateCameraFollow(state.camera, state.player, vw, vh, state.bounds, dt);
  }

  return {
    died: events.died,
    checkpointActivated: events.checkpointActivated,
    grappleAttached: events.grappleAttached,
    enteredZone,
    won: events.won,
  };
}
