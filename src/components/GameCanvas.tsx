import { useEffect, useRef } from 'react';
import { renderShellFrame } from '../game/renderer';
import {
  computeVirtualViewport,
  createInitialShellState,
  stepShellState,
} from '../game/shellLogic';
import type { GameScreenState, PlayerInputState } from '../game/types';

interface GameCanvasProps {
  screenState: GameScreenState;
}

export function GameCanvas({ screenState }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenStateRef = useRef<GameScreenState>(screenState);
  const simStateRef = useRef(createInitialShellState());
  const heldKeysRef = useRef<Set<string>>(new Set());
  const jumpQueuedRef = useRef<boolean>(false);

  useEffect(() => {
    screenStateRef.current = screenState;
    // Clear held inputs across state transitions so Start Space never fires a jump
    heldKeysRef.current.clear();
    jumpQueuedRef.current = false;
  }, [screenState]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let viewport = computeVirtualViewport(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );

    const applyCanvasSize = (width: number, height: number) => {
      viewport = computeVirtualViewport(width, height);
      if (
        canvas.width !== viewport.virtualWidth ||
        canvas.height !== viewport.virtualHeight
      ) {
        canvas.width = viewport.virtualWidth;
        canvas.height = viewport.virtualHeight;
      }
      ctx.imageSmoothingEnabled = false;
    };

    applyCanvasSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          applyCanvasSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    const onKeyDown = (event: KeyboardEvent) => {
      if (screenStateRef.current !== 'playing') return;

      if (
        event.code === 'ArrowLeft' ||
        event.code === 'ArrowRight' ||
        event.code === 'ArrowUp' ||
        event.code === 'ArrowDown' ||
        event.code === 'Space'
      ) {
        event.preventDefault();
      }

      heldKeysRef.current.add(event.code);

      if (
        !event.repeat &&
        (event.code === 'Space' || event.code === 'ArrowUp')
      ) {
        jumpQueuedRef.current = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      heldKeysRef.current.delete(event.code);
    };

    const clearInputs = () => {
      heldKeysRef.current.clear();
      jumpQueuedRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);

    const syncTestAttributes = () => {
      const sim = simStateRef.current;
      canvas.dataset.playerX = String(Math.round(sim.player.x));
      canvas.dataset.playerY = String(Math.round(sim.player.y));
      canvas.dataset.playerVx = String(Math.round(sim.player.vx));
      canvas.dataset.playerVy = String(Math.round(sim.player.vy));
      canvas.dataset.grounded = String(sim.player.grounded);
      canvas.dataset.cameraX = String(Math.round(sim.camera.x));
      canvas.dataset.cameraY = String(Math.round(sim.camera.y));
    };

    let rafId = 0;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const rawDt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      const held = heldKeysRef.current;
      const input: PlayerInputState = {
        left: held.has('ArrowLeft') || held.has('KeyA'),
        right: held.has('ArrowRight') || held.has('KeyD'),
        jumpJustPressed: jumpQueuedRef.current,
      };
      jumpQueuedRef.current = false;

      stepShellState(
        simStateRef.current,
        rawDt,
        screenStateRef.current,
        viewport,
        input,
      );
      renderShellFrame(
        ctx,
        simStateRef.current,
        viewport,
        screenStateRef.current,
      );
      syncTestAttributes();

      rafId = window.requestAnimationFrame(tick);
    };

    stepShellState(
      simStateRef.current,
      0,
      screenStateRef.current,
      viewport,
    );
    renderShellFrame(ctx, simStateRef.current, viewport, screenStateRef.current);
    syncTestAttributes();
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 overflow-hidden bg-[#0a0e14]"
    >
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        aria-label="Grapple Shaft pixel-art viewport"
        className="block h-full w-full pixelated-canvas"
      />
    </div>
  );
}
