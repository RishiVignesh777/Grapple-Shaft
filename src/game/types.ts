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

export interface PlayerPlaceholder {
  /** Normalized horizontal offset relative to shaft center (0 = center) */
  xOffset: number;
  /** Vertical offset above the placeholder bay floor in virtual pixels */
  yFromFloor: number;
  size: number;
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
  player: PlayerPlaceholder;
  stars: Star[];
  starTileWidth: number;
  starTileHeight: number;
}
