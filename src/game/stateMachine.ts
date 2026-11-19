import type { GameScreenState, GameStateAction } from './types';

export function resolveInitialScreenState(search: string): GameScreenState {
  try {
    const params = new URLSearchParams(search);
    if (params.get('autostart') === '1') {
      return 'playing';
    }
  } catch {
    // Ignore malformed query string
  }
  return 'title';
}

export function transitionGameState(
  current: GameScreenState,
  action: GameStateAction,
): GameScreenState {
  switch (action) {
    case 'START':
      return 'playing';
    case 'PAUSE':
      return current === 'playing' ? 'paused' : current;
    case 'RESUME':
      return current === 'paused' ? 'playing' : current;
    case 'TOGGLE_PAUSE':
      if (current === 'playing') return 'paused';
      if (current === 'paused') return 'playing';
      return current;
    case 'RETURN_TITLE':
      return 'title';
    default:
      return current;
  }
}
