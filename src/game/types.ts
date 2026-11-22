export type GameScreenState = 'title' | 'playing' | 'paused' | 'won';

export type GameStateAction =
  | 'START'
  | 'PAUSE'
  | 'RESUME'
  | 'TOGGLE_PAUSE'
  | 'WIN'
  | 'RESTART_RUN'
  | 'RETURN_TITLE';

export type ZoneName =
  | 'ACCESS CORRIDOR'
  | 'REACTOR CHASM'
  | 'SERVICE SHAFT'
  | 'CORE EXIT';

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
  activationFlashTimer?: number;
}

export interface ExitFlagMarker {
  x: number;
  baseY: number;
  width: number;
  height: number;
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

export interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: 1 | 2;
  color: string;
  gravityScale: number;
}

export interface StepEvents {
  died: boolean;
  landed: boolean;
  checkpointActivated: boolean;
  grappleAttached: boolean;
  enteredZone: ZoneName | null;
  won: boolean;
}

export interface ShellSimulationState {
  elapsedTime: number;
  runTimeSeconds: number;
  panelScrollY: number;
  camera: CameraState;
  player: PlayerBody;
  platforms: PlatformRect[];
  lavaPits: LavaPitRect[];
  spikes: SpikeCluster[];
  checkpoints: CheckpointMarker[];
  exitFlag: ExitFlagMarker;
  anchors: GrappleAnchor[];
  grapple: GrappleState;
  hoveredAnchorId: string | null;
  currentZone: ZoneName;
  respawnPoint: RespawnPoint;
  deathFlashTimer: number;
  deathCount: number;
  particles: SparkParticle[];
  grappleSparkTimer: number;
  particleSeed: number;
  bounds: LevelBounds;
  stars: Star[];
  starTileWidth: number;
  starTileHeight: number;
  cameraInitialized: boolean;
}
