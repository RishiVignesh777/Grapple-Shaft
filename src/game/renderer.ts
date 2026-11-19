import { PALETTE } from './palette';
import {
  PANEL_GRID_SIZE,
  computeParallaxOffset,
  positiveModulo,
} from './shellLogic';
import type {
  GameScreenState,
  ShellSimulationState,
  ViewportMetrics,
} from './types';

function drawPixelStarfield(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  vw: number,
  vh: number,
): void {
  const offset = computeParallaxOffset(
    state.camera.x,
    state.camera.y,
    0.14,
    state.starTileWidth,
    state.starTileHeight,
  );

  for (let i = 0; i < state.stars.length; i++) {
    const star = state.stars[i];
    const baseX = positiveModulo(star.x - offset.x, state.starTileWidth);
    const baseY = positiveModulo(star.y - offset.y, state.starTileHeight);

    const wave = Math.sin(state.elapsedTime * star.twinkleSpeed + star.phase);
    const alpha = wave > 0.4 ? 0.95 : wave > -0.25 ? 0.6 : 0.3;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.color;

    for (let tx = baseX; tx < vw; tx += state.starTileWidth) {
      for (let ty = baseY; ty < vh; ty += state.starTileHeight) {
        ctx.fillRect(Math.round(tx), Math.round(ty), star.size, star.size);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawParallaxPanelGrid(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  vw: number,
  vh: number,
): void {
  const tilePeriod = PANEL_GRID_SIZE * 2;
  const offset = computeParallaxOffset(
    state.camera.x,
    state.camera.y,
    0.38,
    tilePeriod,
    tilePeriod,
  );

  const startX = -Math.round(offset.x);
  const startY = -Math.round(offset.y);

  for (let gx = startX; gx < vw + tilePeriod; gx += PANEL_GRID_SIZE) {
    for (let gy = startY; gy < vh + tilePeriod; gy += PANEL_GRID_SIZE) {
      const ix = Math.round(gx);
      const iy = Math.round(gy);

      // Faint inner steel-gray bulkhead panel fill
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = PALETTE.panelDark;
      ctx.fillRect(ix + 1, iy + 1, PANEL_GRID_SIZE - 2, PANEL_GRID_SIZE - 2);

      // Subtle bevel top & left seam
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = PALETTE.panelLight;
      ctx.fillRect(ix + 1, iy + 1, PANEL_GRID_SIZE - 2, 1);
      ctx.fillRect(ix + 1, iy + 1, 1, PANEL_GRID_SIZE - 2);

      // Corner rivets
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = PALETTE.panelLight;
      ctx.fillRect(ix + 3, iy + 3, 1, 1);
      ctx.fillRect(ix + PANEL_GRID_SIZE - 4, iy + 3, 1, 1);
      ctx.fillRect(ix + 3, iy + PANEL_GRID_SIZE - 4, 1, 1);
      ctx.fillRect(
        ix + PANEL_GRID_SIZE - 4,
        iy + PANEL_GRID_SIZE - 4,
        1,
        1,
      );

      // Sparse accent node LED on alternating intersections
      const cellIndex =
        Math.round((gx - startX) / PANEL_GRID_SIZE) +
        Math.round((gy - startY) / PANEL_GRID_SIZE);
      if (positiveModulo(cellIndex, 5) === 0) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle =
          positiveModulo(cellIndex, 2) === 0
            ? PALETTE.cyanAccent
            : PALETTE.terminalGreen;
        ctx.fillRect(ix + 5, iy + 5, 1, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawMidgroundStruts(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  vw: number,
  vh: number,
): void {
  const segH = 48;
  const offset = computeParallaxOffset(state.camera.x, state.camera.y, 0.62, 64, segH);
  const swayX = Math.round(-state.camera.x * 0.22);

  const leftColX = Math.max(8, Math.round(vw * 0.11) + swayX);
  const rightColX = Math.min(vw - 14, Math.round(vw * 0.89) - 6 + swayX);

  const drawColumn = (x: number) => {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = PALETTE.panelDark;
    ctx.fillRect(x, 0, 6, vh);
    ctx.fillStyle = PALETTE.panelLight;
    ctx.fillRect(x + 1, 0, 1, vh);

    for (let y = -Math.round(offset.y); y < vh; y += segH) {
      ctx.fillStyle = PALETTE.panelLight;
      ctx.fillRect(x - 1, y, 8, 3);
      ctx.fillStyle = PALETTE.cyanDim;
      ctx.fillRect(x + 2, y + 8, 2, 2);
    }
  };

  drawColumn(leftColX);
  drawColumn(rightColX);
  ctx.globalAlpha = 1;
}

function drawSpikeCluster(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  count: number,
): void {
  const spikeW = 7;
  const spikeH = 8;

  for (let i = 0; i < count; i++) {
    const sx = Math.round(x + i * spikeW);
    const sy = Math.round(baseY);

    // Tapered pixel triangle: widths 7, 7, 5, 5, 3, 3, 1, 1
    for (let row = 0; row < spikeH; row++) {
      const y = sy - 1 - row;
      const halfInset = Math.floor(row / 2);
      const rowW = Math.max(1, spikeW - halfInset * 2);
      const rowX = sx + halfInset;

      const isTip = row >= spikeH - 3;
      if (isTip) {
        ctx.fillStyle =
          row >= spikeH - 2 ? PALETTE.spikeTipBright : PALETTE.spikeTipRed;
        ctx.fillRect(rowX, y, rowW, 1);
      } else {
        ctx.fillStyle = PALETTE.spikeBody;
        ctx.fillRect(rowX, y, rowW, 1);
        ctx.fillStyle = PALETTE.spikeHighlight;
        ctx.fillRect(rowX, y, 1, 1);
        if (rowW > 2) {
          ctx.fillStyle = PALETTE.spikeShade;
          ctx.fillRect(rowX + rowW - 1, y, 1, 1);
        }
      }
    }
  }
}

function drawLavaFloor(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  vw: number,
  vh: number,
  wallW: number,
): void {
  const lavaH = 14;
  const lavaY = vh - lavaH;
  const innerX = wallW;
  const innerW = Math.max(16, vw - wallW * 2);

  // Subtle dithered pixel glow band above lava
  for (let px = innerX; px < innerX + innerW; px += 2) {
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = PALETTE.lavaDeep;
    ctx.fillRect(px, lavaY - 2, 1, 1);
    ctx.fillRect(px + 1, lavaY - 4, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Stepped pixel-art orange-red lava (#ffb347 -> #ff5a2b)
  const bands: Array<{ offset: number; height: number; color: string }> = [
    { offset: 0, height: 2, color: PALETTE.lavaBright },
    { offset: 2, height: 3, color: PALETTE.lavaMid },
    { offset: 5, height: 4, color: '#ff7030' },
    { offset: 9, height: 5, color: PALETTE.lavaDeep },
  ];

  for (const band of bands) {
    ctx.fillStyle = band.color;
    ctx.fillRect(innerX, lavaY + band.offset, innerW, band.height);
  }

  // Animated blocky crust ripples & rising pixel embers
  const phaseShift = Math.floor(state.elapsedTime * 6);
  for (let px = innerX; px < innerX + innerW; px += 5) {
    const wave = (px + phaseShift) % 15;
    if (wave < 5) {
      ctx.fillStyle = PALETTE.lavaCore;
      ctx.fillRect(px, lavaY, Math.min(3, innerX + innerW - px), 1);
    } else if (wave < 10) {
      ctx.fillStyle = PALETTE.lavaDeep;
      ctx.fillRect(px, lavaY + 2, Math.min(2, innerX + innerW - px), 1);
    }

    // Occasional 1x1 pixel ember rising above the crust
    if ((px * 7) % 23 === 0) {
      const rise = Math.floor((state.elapsedTime * 10 + px) % 9);
      ctx.globalAlpha = rise < 6 ? 0.85 : 0.4;
      ctx.fillStyle = rise < 4 ? PALETTE.lavaBright : PALETTE.lavaDeep;
      ctx.fillRect(px, lavaY - 2 - rise, 1, 1);
      ctx.globalAlpha = 1;
    }
  }
}

function drawShaftBayAndProps(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  vw: number,
  vh: number,
): { padTopY: number; centerX: number } {
  const wallW = Math.max(12, Math.min(24, Math.round(vw * 0.06)));
  const block = 12;

  // Side armored steel walls (#1b2838 / #2c4560)
  for (let y = 0; y < vh; y += block) {
    // Left wall block
    ctx.fillStyle = PALETTE.panelDark;
    ctx.fillRect(0, y, wallW, block - 1);
    ctx.fillStyle = PALETTE.panelLight;
    ctx.fillRect(wallW - 2, y, 2, block - 1);
    ctx.fillRect(0, y, wallW, 1);
    ctx.fillStyle = PALETTE.panelHighlight;
    ctx.fillRect(wallW - 2, y, 1, 1);

    // Right wall block
    const rx = vw - wallW;
    ctx.fillStyle = PALETTE.panelDark;
    ctx.fillRect(rx, y, wallW, block - 1);
    ctx.fillStyle = PALETTE.panelLight;
    ctx.fillRect(rx, y, 2, block - 1);
    ctx.fillRect(rx, y, wallW, 1);
    ctx.fillStyle = PALETTE.panelHighlight;
    ctx.fillRect(rx + 1, y, 1, 1);
  }

  // Lower side spike ledges flanking the lava pit
  const ledgeY = vh - 16;
  const ledgeW = Math.min(32, Math.max(18, Math.round(vw * 0.09)));

  // Left spike ledge
  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(wallW, ledgeY, ledgeW, 16);
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(wallW, ledgeY, ledgeW, 2);
  drawSpikeCluster(ctx, wallW + 2, ledgeY, Math.floor((ledgeW - 4) / 7));

  // Right spike ledge
  const rightLedgeX = vw - wallW - ledgeW;
  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(rightLedgeX, ledgeY, ledgeW, 16);
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(rightLedgeX, ledgeY, ledgeW, 2);
  drawSpikeCluster(
    ctx,
    rightLedgeX + 2,
    ledgeY,
    Math.floor((ledgeW - 4) / 7),
  );

  // Bottom lava pool between the side ledges
  drawLavaFloor(ctx, state, vw, vh, wallW + ledgeW);

  // Central static steel bay platform for the stationary placeholder player
  const centerX = Math.round(vw / 2);
  const padW = Math.min(96, Math.max(56, Math.round(vw * 0.24)));
  const padH = 12;
  const padX = Math.round(centerX - padW / 2);
  const padTopY = Math.round(vh * 0.72);

  // Support column under pad (subtle steel strut to bottom)
  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(centerX - 6, padTopY + padH, 12, vh - (padTopY + padH));
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(centerX - 6, padTopY + padH, 1, vh - (padTopY + padH));
  ctx.fillRect(centerX + 5, padTopY + padH, 1, vh - (padTopY + padH));

  // Platform deck blocks
  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(padX, padTopY, padW, padH);
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(padX, padTopY, padW, 3);
  ctx.fillStyle = PALETTE.panelHighlight;
  ctx.fillRect(padX + 1, padTopY, padW - 2, 1);

  // Terminal green & cyan bay trim accents on platform
  ctx.fillStyle = PALETTE.terminalGreen;
  ctx.fillRect(padX + 6, padTopY + 5, 8, 1);
  ctx.fillRect(padX + padW - 14, padTopY + 5, 8, 1);
  ctx.fillStyle = PALETTE.cyanAccent;
  ctx.fillRect(centerX - 3, padTopY + 5, 6, 1);

  return { padTopY, centerX };
}

function drawPlaceholderPlayer(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  centerX: number,
  padTopY: number,
): void {
  const { size, xOffset, yFromFloor } = state.player;
  // Stationary placeholder square resting squarely on the platform
  const px = Math.round(centerX - size / 2 + xOffset);
  const py = Math.round(padTopY - size - yFromFloor);

  // Crisp 1px dark chassis outline
  ctx.fillStyle = PALETTE.bgVoid;
  ctx.fillRect(px, py, size, size);

  // Steel-gray square body
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

  // Top & left pixel bevel highlight
  ctx.fillStyle = PALETTE.panelHighlight;
  ctx.fillRect(px + 1, py + 1, size - 2, 2);
  ctx.fillRect(px + 1, py + 1, 2, size - 2);

  // Inner dark core plate
  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(px + 3, py + 3, size - 6, size - 6);

  // Cyan accent trim at top/bottom core
  ctx.fillStyle = PALETTE.cyanAccent;
  ctx.fillRect(px + 4, py + 3, size - 8, 1);
  ctx.fillRect(px + 6, py + size - 4, size - 12, 1);

  // Terminal green glowing visor slit (subtle idle pulse, zero position change)
  const visorPulse = 0.78 + 0.22 * Math.sin(state.elapsedTime * 3.2);
  ctx.globalAlpha = visorPulse;
  ctx.fillStyle = PALETTE.terminalGreen;
  ctx.fillRect(px + 4, py + 6, size - 8, 3);
  ctx.globalAlpha = 1;
}

export function renderShellFrame(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  viewport: ViewportMetrics,
  screenState: GameScreenState,
): void {
  const { virtualWidth: vw, virtualHeight: vh } = viewport;

  // Enforce blocky, pixelated rendering on every frame
  ctx.imageSmoothingEnabled = false;

  // 1. Near-black sci-fi background (#0a0e14)
  ctx.fillStyle = PALETTE.bgVoid;
  ctx.fillRect(0, 0, vw, vh);

  // 2. Parallax sparse starfield
  drawPixelStarfield(ctx, state, vw, vh);

  // 3. Parallax faint scrolling steel panel-grid
  drawParallaxPanelGrid(ctx, state, vw, vh);

  // 4. Midground facility struts for deeper parallax separation
  drawMidgroundStruts(ctx, state, vw, vh);

  // 5. Foreground shaft bay + palette elements (steel walls, lava, spikes)
  const { padTopY, centerX } = drawShaftBayAndProps(ctx, state, vw, vh);

  // 6. Placeholder player square (stationary, no physics/movement yet)
  drawPlaceholderPlayer(ctx, state, centerX, padTopY);

  // 7. Subtle retro pixel scanlines (light 5% pass so palette stays punchy)
  ctx.globalAlpha = screenState === 'title' ? 0.08 : 0.05;
  ctx.fillStyle = '#000000';
  for (let sy = 0; sy < vh; sy += 2) {
    ctx.fillRect(0, sy, vw, 1);
  }
  ctx.globalAlpha = 1;
}
