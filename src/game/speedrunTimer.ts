export const BEST_TIME_STORAGE_KEY = 'grapple-shaft-best-time';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface WinTimeResult {
  currentTime: number;
  bestTime: number;
  isNewBest: boolean;
}

export function formatSpeedrunTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00.0';
  }
  const totalTenths = Math.floor(seconds * 10 + 1e-6);
  const minutes = Math.floor(totalTenths / 600);
  const remainingTenths = totalTenths % 600;
  const secs = Math.floor(remainingTenths / 10);
  const tenths = remainingTenths % 10;

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadBestTime(
  storage: StorageLike | null = getDefaultStorage(),
): number | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(BEST_TIME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveBestTime(
  seconds: number,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  if (!storage || !Number.isFinite(seconds) || seconds <= 0) {
    return;
  }
  try {
    storage.setItem(BEST_TIME_STORAGE_KEY, seconds.toFixed(3));
  } catch {
    // Ignore storage quota or private-mode errors safely
  }
}

export function updateBestTimeOnWin(
  runSeconds: number,
  storage: StorageLike | null = getDefaultStorage(),
): WinTimeResult {
  const currentTime =
    Number.isFinite(runSeconds) && runSeconds > 0 ? runSeconds : 0;
  const existingBest = loadBestTime(storage);

  if (
    currentTime > 0 &&
    (existingBest === null || currentTime < existingBest)
  ) {
    saveBestTime(currentTime, storage);
    return {
      currentTime,
      bestTime: currentTime,
      isNewBest: true,
    };
  }

  return {
    currentTime,
    bestTime: existingBest ?? currentTime,
    isNewBest: existingBest === null,
  };
}
