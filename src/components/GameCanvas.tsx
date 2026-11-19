import { useEffect, useRef } from 'react';
import { renderShellFrame } from '../game/renderer';
import {
  computeVirtualViewport,
  createInitialShellState,
  stepShellState,
} from '../game/shellLogic';
import { soundEngine } from '../game/sound';
import type {
  GameScreenState,
  PlayerInputState,
  ViewportMetrics,
  ZoneName,
} from '../game/types';

interface GameCanvasProps {
  screenState: GameScreenState;
  onZoneEnter?: (zone: ZoneName) => void;
}

export function screenToVirtual(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport: ViewportMetrics,
): { vx: number; vy: number } {
  if (rect.width <= 0 || rect.height <= 0) {
    return { vx: -9999, vy: -9999 };
  }
  const vx = ((clientX - rect.left) / rect.width) * viewport.virtualWidth;
  const vy = ((clientY - rect.top) / rect.height) * viewport.virtualHeight;
  return { vx, vy };
}

export function GameCanvas({ screenState, onZoneEnter }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenStateRef = useRef<GameScreenState>(screenState);
  const onZoneEnterRef = useRef(onZoneEnter);
  const simStateRef = useRef(createInitialShellState());
  const heldKeysRef = useRef<Set<string>>(new Set());
  const jumpQueuedRef = useRef<boolean>(false);
  const mouseDownRef = useRef<boolean>(false);
  const mouseJustPressedRef = useRef<boolean>(false);
  const mouseClientPosRef = useRef<{ x: number; y: number }>({
    x: -9999,
    y: -9999,
  });

  useEffect(() => {
    onZoneEnterRef.current = onZoneEnter;
  }, [onZoneEnter]);

  useEffect(() => {
    screenStateRef.current = screenState;
    heldKeysRef.current.clear();
    jumpQueuedRef.current = false;
    mouseDownRef.current = false;
    mouseJustPressedRef.current = false;
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

    const onMouseMove = (event: MouseEvent) => {
      mouseClientPosRef.current = { x: event.clientX, y: event.clientY };
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (screenStateRef.current !== 'playing') return;
      // Ignore clicks on HUD buttons
      const target = event.target;
      if (target instanceof Element && target.closest('button')) {
        return;
      }
      mouseClientPosRef.current = { x: event.clientX, y: event.clientY };
      mouseDownRef.current = true;
      mouseJustPressedRef.current = true;
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) return;
      mouseDownRef.current = false;
      mouseJustPressedRef.current = false;
    };

    const clearInputs = () => {
      heldKeysRef.current.clear();
      jumpQueuedRef.current = false;
      mouseDownRef.current = false;
      mouseJustPressedRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
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
      canvas.dataset.deaths = String(sim.deathCount);
      canvas.dataset.zone = sim.currentZone;
      canvas.dataset.grappleActive = String(
        sim.grapple.activeAnchorId ?? 'none',
      );
      canvas.dataset.checkpointsReached = String(
        sim.checkpoints.filter((c) => c.reached).length,
      );
    };

    let rafId = 0;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const rawDt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      const sim = simStateRef.current;
      const rect = canvas.getBoundingClientRect();
      const { vx: mouseVirtualX, vy: mouseVirtualY } = screenToVirtual(
        mouseClientPosRef.current.x,
        mouseClientPosRef.current.y,
        rect,
        viewport,
      );

      const held = heldKeysRef.current;
      const input: PlayerInputState = {
        left: held.has('ArrowLeft') || held.has('KeyA'),
        right: held.has('ArrowRight') || held.has('KeyD'),
        jumpJustPressed: jumpQueuedRef.current,
        mouseDown: mouseDownRef.current,
        mouseJustPressed: mouseJustPressedRef.current,
        mouseWorldX: mouseVirtualX + sim.camera.x,
        mouseWorldY: mouseVirtualY + sim.camera.y,
      };
      jumpQueuedRef.current = false;
      mouseJustPressedRef.current = false;

      const events = stepShellState(
        sim,
        rawDt,
        screenStateRef.current,
        viewport,
        input,
      );

      if (events.died) {
        soundEngine.playDeathBlip();
      } else {
        if (events.grappleAttached) {
          soundEngine.playGrappleAttach();
        }
        if (events.checkpointActivated) {
          soundEngine.playCheckpointChime();
        }
      }

      if (events.enteredZone && onZoneEnterRef.current) {
        onZoneEnterRef.current(events.enteredZone);
      }

      renderShellFrame(ctx, sim, viewport, screenStateRef.current);
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
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
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
