export type GameScreenState = 'title' | 'playing' | 'paused';

export type GameStateAction =
  | 'START'
  | 'PAUSE'
  | 'RESUME'
  | 'TOGGLE_PAUSE'
  | 'RETURN_TITLE';

export type ZoneName = 'ACCESS CORRIDOR' | 'REACTOR CHASM' | 'SERVICE SHAFT';

export interface CameraState {
  x: number;
  y: number;
}

export interface Star {
  x: number;
  y: number;
  size: 1 | 2;
  color: string;
  phase: number;
  twinkleSpeed: number;
}

export interface PlatformRect {
  x: number;
  y: number;
  width: number;
  height: number;
  kind?: 'pad' | 'wall' | 'platform' | 'block';
}

export interface SpikeCluster {
  x: number;
  baseY: number;
  count: number;
}

export interface LavaPitRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CheckpointMarker {
  id: string;
  x: number;
  baseY: number;
  width: number;
  height: number;
  reached: boolean;
}

export interface GrappleAnchor {
  id: string;
  x: number;
  y: number;
}

export interface GrappleState {
  activeAnchorId: string | null;
  ropeLength: number;
}

export interface RespawnPoint {
  x: number;
  y: number;
}

export interface PlayerBody {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: 1 | -1;
}

export interface PlayerInputState {
  left: boolean;
  right: boolean;
  jumpJustPressed: boolean;
  mouseDown: boolean;
  mouseJustPressed: boolean;
  mouseWorldX: number;
  mouseWorldY: number;
}

export interface LevelBounds {
  minX: number;
  width: number;
  minY: number;
  height: number;
  deathVoidY: number;
}

export interface ViewportMetrics {
  cssWidth: number;
  cssHeight: number;
  virtualWidth: number;
  virtualHeight: number;
  pixelScale: number;
}

export interface StepEvents {
  died: boolean;
  checkpointActivated: boolean;
  grappleAttached: boolean;
  enteredZone: ZoneName | null;
}

export interface ShellSimulationState {
  elapsedTime: number;
  panelScrollY: number;
  camera: CameraState;
  player: PlayerBody;
  platforms: PlatformRect[];
  lavaPits: LavaPitRect[];
  spikes: SpikeCluster[];
  checkpoints: CheckpointMarker[];
  anchors: GrappleAnchor[];
  grapple: GrappleState;
  hoveredAnchorId: string | null;
  currentZone: ZoneName;
  respawnPoint: RespawnPoint;
  deathFlashTimer: number;
  deathCount: number;
  bounds: LevelBounds;
  stars: Star[];
  starTileWidth: number;
  starTileHeight: number;
  cameraInitialized: boolean;
}
