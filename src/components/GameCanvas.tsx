import { useEffect, useRef } from 'react';
import { CrtShaderRenderer, computeCrtUniforms } from '../game/crtShader';
import { DEATH_FLASH_DURATION } from '../game/physics';
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
  runId: number;
  onZoneEnter?: (zone: ZoneName) => void;
  onCheckpointActivate?: () => void;
  onRunTimeChange?: (seconds: number) => void;
  onWin?: (finalTimeSeconds: number) => void;
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

export function GameCanvas({
  screenState,
  runId,
  onZoneEnter,
  onCheckpointActivate,
  onRunTimeChange,
  onWin,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenStateRef = useRef<GameScreenState>(screenState);
  const onZoneEnterRef = useRef(onZoneEnter);
  const onCheckpointActivateRef = useRef(onCheckpointActivate);
  const onRunTimeChangeRef = useRef(onRunTimeChange);
  const onWinRef = useRef(onWin);
  const lastEmittedTenthsRef = useRef<number>(-1);
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
    onCheckpointActivateRef.current = onCheckpointActivate;
  }, [onCheckpointActivate]);

  useEffect(() => {
    onRunTimeChangeRef.current = onRunTimeChange;
  }, [onRunTimeChange]);

  useEffect(() => {
    onWinRef.current = onWin;
  }, [onWin]);

  useEffect(() => {
    screenStateRef.current = screenState;
    heldKeysRef.current.clear();
    jumpQueuedRef.current = false;
    mouseDownRef.current = false;
    mouseJustPressedRef.current = false;
  }, [screenState]);

  useEffect(() => {
    if (runId === 0) return;
    simStateRef.current = createInitialShellState();
    lastEmittedTenthsRef.current = 0;
    onRunTimeChangeRef.current?.(0);
    heldKeysRef.current.clear();
    jumpQueuedRef.current = false;
    mouseDownRef.current = false;
    mouseJustPressedRef.current = false;
  }, [runId]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const crtRenderer = CrtShaderRenderer.create(canvas);
    const bufferCanvas = crtRenderer ? document.createElement('canvas') : canvas;
    const ctx = bufferCanvas.getContext('2d', { alpha: false });
    if (!ctx) {
      if (crtRenderer) crtRenderer.dispose();
      return;
    }

    const reducedMotionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    let viewport = computeVirtualViewport(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );

    const applyCanvasSize = (width: number, height: number) => {
      viewport = computeVirtualViewport(width, height);
      if (
        bufferCanvas.width !== viewport.virtualWidth ||
        bufferCanvas.height !== viewport.virtualHeight
      ) {
        bufferCanvas.width = viewport.virtualWidth;
        bufferCanvas.height = viewport.virtualHeight;
      }
      ctx.imageSmoothingEnabled = false;

      if (crtRenderer) {
        const displayW = Math.max(1, Math.floor(width));
        const displayH = Math.max(1, Math.floor(height));
        if (canvas.width !== displayW || canvas.height !== displayH) {
          canvas.width = displayW;
          canvas.height = displayH;
        }
        crtRenderer.resize(displayW, displayH);
      }
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
      canvas.dataset.particles = String(sim.particles.length);
      canvas.dataset.crtShader = crtRenderer ? 'webgl' : 'fallback2d';
      canvas.dataset.runTime = sim.runTimeSeconds.toFixed(2);
    };

    const drawPresentFrame = (sim: ReturnType<typeof createInitialShellState>) => {
      renderShellFrame(
        ctx,
        sim,
        viewport,
        screenStateRef.current,
        !crtRenderer,
      );
      if (crtRenderer) {
        const flashRatio =
          sim.deathFlashTimer > 0
            ? Math.min(1, sim.deathFlashTimer / DEATH_FLASH_DURATION)
            : 0;
        const uniforms = computeCrtUniforms(
          sim.elapsedTime,
          flashRatio,
          screenStateRef.current,
          viewport.virtualWidth,
          viewport.virtualHeight,
          reducedMotionQuery?.matches ?? false,
        );
        crtRenderer.render(bufferCanvas, uniforms);
      }
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

      const tenths = Math.floor(sim.runTimeSeconds * 10 + 1e-6);

      if (events.won) {
        lastEmittedTenthsRef.current = tenths;
        onRunTimeChangeRef.current?.(sim.runTimeSeconds);
        soundEngine.playVictoryFanfare();
        if (onWinRef.current) {
          onWinRef.current(sim.runTimeSeconds);
        }
      } else {
        if (
          screenStateRef.current === 'playing' &&
          tenths !== lastEmittedTenthsRef.current
        ) {
          lastEmittedTenthsRef.current = tenths;
          onRunTimeChangeRef.current?.(sim.runTimeSeconds);
        }
        if (events.died) {
          soundEngine.playDeathBlip();
        } else {
          if (events.grappleAttached) {
            soundEngine.playGrappleAttach();
          }
          if (events.checkpointActivated) {
            soundEngine.playCheckpointChime();
            onCheckpointActivateRef.current?.();
          }
        }
      }

      if (events.enteredZone && onZoneEnterRef.current) {
        onZoneEnterRef.current(events.enteredZone);
      }

      drawPresentFrame(sim);
      syncTestAttributes();

      rafId = window.requestAnimationFrame(tick);
    };

    stepShellState(
      simStateRef.current,
      0,
      screenStateRef.current,
      viewport,
    );
    drawPresentFrame(simStateRef.current);
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
      if (crtRenderer) {
        crtRenderer.dispose();
      }
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
