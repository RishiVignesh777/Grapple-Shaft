import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BEST_TIME_STORAGE_KEY,
  formatSpeedrunTime,
  loadBestTime,
  saveBestTime,
  updateBestTimeOnWin,
  type StorageLike,
} from './speedrunTimer';

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

test('formatSpeedrunTime renders mm:ss.t cleanly without minute overflow', () => {
  assert.equal(formatSpeedrunTime(0), '00:00.0');
  assert.equal(formatSpeedrunTime(-5), '00:00.0');
  assert.equal(formatSpeedrunTime(Number.NaN), '00:00.0');
  assert.equal(formatSpeedrunTime(0.09), '00:00.0');
  assert.equal(formatSpeedrunTime(0.1), '00:00.1');
  assert.equal(formatSpeedrunTime(59.95), '00:59.9');
  assert.equal(formatSpeedrunTime(60), '01:00.0');
  assert.equal(formatSpeedrunTime(102.34), '01:42.3');
  assert.equal(formatSpeedrunTime(98.9), '01:38.9');
  assert.equal(formatSpeedrunTime(605.7), '10:05.7');
});

test('loadBestTime and saveBestTime persist valid positive completion times', () => {
  const storage = new MemoryStorage();
  assert.equal(loadBestTime(storage), null);

  storage.setItem(BEST_TIME_STORAGE_KEY, 'not-a-number');
  assert.equal(loadBestTime(storage), null);

  storage.setItem(BEST_TIME_STORAGE_KEY, '-12');
  assert.equal(loadBestTime(storage), null);

  saveBestTime(102.3456, storage);
  assert.equal(loadBestTime(storage), 102.346);
});

test('updateBestTimeOnWin keeps only the lowest completion time', () => {
  const storage = new MemoryStorage();

  const first = updateBestTimeOnWin(102.3, storage);
  assert.deepEqual(first, {
    currentTime: 102.3,
    bestTime: 102.3,
    isNewBest: true,
  });

  const slower = updateBestTimeOnWin(115.8, storage);
  assert.deepEqual(slower, {
    currentTime: 115.8,
    bestTime: 102.3,
    isNewBest: false,
  });
  assert.equal(loadBestTime(storage), 102.3);

  const faster = updateBestTimeOnWin(98.9, storage);
  assert.deepEqual(faster, {
    currentTime: 98.9,
    bestTime: 98.9,
    isNewBest: true,
  });
  assert.equal(loadBestTime(storage), 98.9);
});

test('storage helpers handle throwing storage implementations safely', () => {
  const throwingStorage: StorageLike = {
    getItem() {
      throw new Error('Blocked');
    },
    setItem() {
      throw new Error('Blocked');
    },
  };

  assert.equal(loadBestTime(throwingStorage), null);
  assert.doesNotThrow(() => saveBestTime(42.5, throwingStorage));
  const result = updateBestTimeOnWin(42.5, throwingStorage);
  assert.equal(result.currentTime, 42.5);
  assert.equal(result.bestTime, 42.5);
});
