export type GameScreenState = 'title' | 'playing' | 'paused';

export type GameStateAction =
  | 'START'
  | 'PAUSE'
  | 'RESUME'
  | 'TOGGLE_PAUSE'
  | 'RETURN_TITLE';

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
}

export interface LevelBounds {
  width: number;
  height: number;
  lavaTopY: number;
}

export interface ViewportMetrics {
  cssWidth: number;
  cssHeight: number;
  virtualWidth: number;
  virtualHeight: number;
  pixelScale: number;
}

export interface ShellSimulationState {
  elapsedTime: number;
  panelScrollY: number;
  camera: CameraState;
  player: PlayerBody;
  platforms: PlatformRect[];
  bounds: LevelBounds;
  stars: Star[];
  starTileWidth: number;
  starTileHeight: number;
  cameraInitialized: boolean;
}
