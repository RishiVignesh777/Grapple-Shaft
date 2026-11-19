import { useEffect, useRef } from 'react';
import { renderShellFrame } from '../game/renderer';
import {
  computeVirtualViewport,
  createInitialShellState,
  stepShellState,
} from '../game/shellLogic';
import type { GameScreenState } from '../game/types';

interface GameCanvasProps {
  screenState: GameScreenState;
}

export function GameCanvas({ screenState }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenStateRef = useRef<GameScreenState>(screenState);
  const simStateRef = useRef(createInitialShellState());

  useEffect(() => {
    screenStateRef.current = screenState;
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

    let rafId = 0;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const rawDt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      stepShellState(simStateRef.current, rawDt, screenStateRef.current);
      renderShellFrame(ctx, simStateRef.current, viewport, screenStateRef.current);

      rafId = window.requestAnimationFrame(tick);
    };

    // Draw initial frame synchronously so first paint is never blank
    renderShellFrame(ctx, simStateRef.current, viewport, screenStateRef.current);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
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
