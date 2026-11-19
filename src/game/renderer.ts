import { PALETTE } from './palette';
import { WALL_THICKNESS } from './physics';
import {
  PANEL_GRID_SIZE,
  computeParallaxOffset,
  positiveModulo,
} from './shellLogic';
import type {
  GameScreenState,
  PlatformRect,
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
    state.camera.y + state.panelScrollY,
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
    state.camera.y + state.panelScrollY,
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
  const offset = computeParallaxOffset(
    state.camera.x,
    state.camera.y + state.panelScrollY,
    0.62,
    64,
    segH,
  );
  const swayX = Math.round(
    (state.bounds.width / 2 - vw / 2 - state.camera.x) * 0.28,
  );

  const leftColX = Math.round(vw * 0.12) + swayX;
  const rightColX = Math.round(vw * 0.88) - 6 + swayX;

  const drawColumn = (x: number) => {
    if (x < -10 || x > vw + 10) return;
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
  camX: number,
  camY: number,
): void {
  const lavaH = state.bounds.height - state.bounds.lavaTopY;
  const lavaY = Math.round(state.bounds.lavaTopY - camY);
  const innerX = Math.round(WALL_THICKNESS + 32 - camX);
  const innerW = state.bounds.width - (WALL_THICKNESS + 32) * 2;

  for (let px = innerX; px < innerX + innerW; px += 2) {
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = PALETTE.lavaDeep;
    ctx.fillRect(px, lavaY - 2, 1, 1);
    ctx.fillRect(px + 1, lavaY - 4, 1, 1);
  }
  ctx.globalAlpha = 1;

  const bands: Array<{ offset: number; height: number; color: string }> = [
    { offset: 0, height: 2, color: PALETTE.lavaBright },
    { offset: 2, height: 3, color: PALETTE.lavaMid },
    { offset: 5, height: 4, color: '#ff7030' },
    { offset: 9, height: Math.max(5, lavaH - 9), color: PALETTE.lavaDeep },
  ];

  for (const band of bands) {
    ctx.fillStyle = band.color;
    ctx.fillRect(innerX, lavaY + band.offset, innerW, band.height);
  }

  const phaseShift = Math.floor(state.elapsedTime * 6);
  for (let px = innerX; px < innerX + innerW; px += 5) {
    const worldPx = px + camX;
    const wave = Math.abs(worldPx + phaseShift) % 15;
    if (wave < 5) {
      ctx.fillStyle = PALETTE.lavaCore;
      ctx.fillRect(px, lavaY, Math.min(3, innerX + innerW - px), 1);
    } else if (wave < 10) {
      ctx.fillStyle = PALETTE.lavaDeep;
      ctx.fillRect(px, lavaY + 2, Math.min(2, innerX + innerW - px), 1);
    }

    if ((Math.abs(worldPx) * 7) % 23 === 0) {
      const rise = Math.floor((state.elapsedTime * 10 + worldPx) % 9);
      ctx.globalAlpha = rise < 6 ? 0.85 : 0.4;
      ctx.fillStyle = rise < 4 ? PALETTE.lavaBright : PALETTE.lavaDeep;
      ctx.fillRect(px, lavaY - 2 - rise, 1, 1);
      ctx.globalAlpha = 1;
    }
  }
}

function drawPlatformRect(
  ctx: CanvasRenderingContext2D,
  plat: PlatformRect,
  camX: number,
  camY: number,
  worldHeight: number,
): void {
  const sx = Math.round(plat.x - camX);
  const sy = Math.round(plat.y - camY);

  if (plat.kind === 'pad') {
    const centerX = Math.round(sx + plat.width / 2);
    const strutH = Math.max(0, worldHeight - (plat.y + plat.height));
    ctx.fillStyle = PALETTE.panelDark;
    ctx.fillRect(centerX - 6, sy + plat.height, 12, strutH);
    ctx.fillStyle = PALETTE.panelLight;
    ctx.fillRect(centerX - 6, sy + plat.height, 1, strutH);
    ctx.fillRect(centerX + 5, sy + plat.height, 1, strutH);
  }

  // Steel-gray deck or block body
  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(sx, sy, plat.width, plat.height);
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(sx, sy, plat.width, 3);
  ctx.fillStyle = PALETTE.panelHighlight;
  ctx.fillRect(sx + 1, sy, Math.max(1, plat.width - 2), 1);

  if (plat.kind === 'block') {
    ctx.fillStyle = PALETTE.panelLight;
    ctx.fillRect(sx, sy, 2, plat.height);
    ctx.fillRect(sx + plat.width - 2, sy, 2, plat.height);
    ctx.fillStyle = PALETTE.cyanAccent;
    ctx.fillRect(sx + 4, sy + 6, Math.max(4, plat.width - 8), 1);
  } else {
    // Terminal green & cyan bay trim accents on platforms
    ctx.fillStyle = PALETTE.terminalGreen;
    ctx.fillRect(sx + 6, sy + 5, 8, 1);
    if (plat.width >= 48) {
      ctx.fillRect(sx + plat.width - 14, sy + 5, 8, 1);
    }
    ctx.fillStyle = PALETTE.cyanAccent;
    ctx.fillRect(Math.round(sx + plat.width / 2) - 3, sy + 5, 6, 1);
  }
}

function drawShaftBayAndProps(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  camX: number,
  camY: number,
): void {
  const wallW = WALL_THICKNESS;
  const block = 12;
  const worldW = state.bounds.width;
  const worldH = state.bounds.height;

  // Left & right armored steel shaft boundary walls
  const leftScreenX = Math.round(0 - camX);
  const rightScreenX = Math.round(worldW - wallW - camX);

  for (let y = 0; y < worldH; y += block) {
    const sy = Math.round(y - camY);

    ctx.fillStyle = PALETTE.panelDark;
    ctx.fillRect(leftScreenX, sy, wallW, block - 1);
    ctx.fillStyle = PALETTE.panelLight;
    ctx.fillRect(leftScreenX + wallW - 2, sy, 2, block - 1);
    ctx.fillRect(leftScreenX, sy, wallW, 1);
    ctx.fillStyle = PALETTE.panelHighlight;
    ctx.fillRect(leftScreenX + wallW - 2, sy, 1, 1);

    ctx.fillStyle = PALETTE.panelDark;
    ctx.fillRect(rightScreenX, sy, wallW, block - 1);
    ctx.fillStyle = PALETTE.panelLight;
    ctx.fillRect(rightScreenX, sy, 2, block - 1);
    ctx.fillRect(rightScreenX, sy, wallW, 1);
    ctx.fillStyle = PALETTE.panelHighlight;
    ctx.fillRect(rightScreenX + 1, sy, 1, 1);
  }

  // Lower side spike ledges flanking the lava pit
  const ledgeY = Math.round(worldH - 16 - camY);
  const ledgeW = 32;

  const leftLedgeX = Math.round(wallW - camX);
  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(leftLedgeX, ledgeY, ledgeW, 16);
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(leftLedgeX, ledgeY, ledgeW, 2);
  drawSpikeCluster(ctx, leftLedgeX + 2, ledgeY, Math.floor((ledgeW - 4) / 7));

  const rightLedgeX = Math.round(worldW - wallW - ledgeW - camX);
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
  drawLavaFloor(ctx, state, camX, camY);

  // Render solid platforms & test blocks
  for (let i = 0; i < state.platforms.length; i++) {
    const plat = state.platforms[i];
    if (plat.kind === 'wall') continue;
    drawPlatformRect(ctx, plat, camX, camY, worldH);
  }
}

function drawPlayerSquare(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  camX: number,
  camY: number,
): void {
  const { x, y, width, height } = state.player;
  const px = Math.round(x - camX);
  const py = Math.round(y - camY);

  ctx.fillStyle = PALETTE.bgVoid;
  ctx.fillRect(px, py, width, height);

  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(px + 1, py + 1, width - 2, height - 2);

  ctx.fillStyle = PALETTE.panelHighlight;
  ctx.fillRect(px + 1, py + 1, width - 2, 2);
  ctx.fillRect(px + 1, py + 1, 2, height - 2);

  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(px + 3, py + 3, width - 6, height - 6);

  ctx.fillStyle = PALETTE.cyanAccent;
  ctx.fillRect(px + 4, py + 3, width - 8, 1);
  ctx.fillRect(px + 6, py + height - 4, width - 12, 1);

  const visorPulse = 0.78 + 0.22 * Math.sin(state.elapsedTime * 3.2);
  ctx.globalAlpha = visorPulse;
  ctx.fillStyle = PALETTE.terminalGreen;
  ctx.fillRect(px + 4, py + 6, width - 8, 3);
  ctx.globalAlpha = 1;
}

export function renderShellFrame(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  viewport: ViewportMetrics,
  screenState: GameScreenState,
): void {
  const { virtualWidth: vw, virtualHeight: vh } = viewport;
  const camX = Math.round(state.camera.x);
  const camY = Math.round(state.camera.y);

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

  // 5. Foreground world bay, test platforms, walls, lava, spikes
  drawShaftBayAndProps(ctx, state, camX, camY);

  // 6. Player square
  drawPlayerSquare(ctx, state, camX, camY);

  // 7. Subtle retro pixel scanlines
  ctx.globalAlpha = screenState === 'title' ? 0.08 : 0.05;
  ctx.fillStyle = '#000000';
  for (let sy = 0; sy < vh; sy += 2) {
    ctx.fillRect(0, sy, vw, 1);
  }
  ctx.globalAlpha = 1;
}
