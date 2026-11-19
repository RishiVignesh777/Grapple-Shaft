import { PALETTE } from './palette';
import { DEATH_FLASH_DURATION, SPIKE_WIDTH, WALL_THICKNESS } from './physics';
import {
  PANEL_GRID_SIZE,
  computeParallaxOffset,
  positiveModulo,
} from './shellLogic';
import type {
  CheckpointMarker,
  GameScreenState,
  LavaPitRect,
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

      ctx.globalAlpha = 0.24;
      ctx.fillStyle = PALETTE.panelDark;
      ctx.fillRect(ix + 1, iy + 1, PANEL_GRID_SIZE - 2, PANEL_GRID_SIZE - 2);

      ctx.globalAlpha = 0.26;
      ctx.fillStyle = PALETTE.panelLight;
      ctx.fillRect(ix + 1, iy + 1, PANEL_GRID_SIZE - 2, 1);
      ctx.fillRect(ix + 1, iy + 1, 1, PANEL_GRID_SIZE - 2);

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
    (state.bounds.width / 2 - vw / 2 - state.camera.x) * 0.22,
  );

  const leftColX = Math.round(vw * 0.14) + swayX;
  const rightColX = Math.round(vw * 0.86) - 6 + swayX;

  const drawColumn = (x: number) => {
    const wrappedX = positiveModulo(x, vw + 80) - 40;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = PALETTE.panelDark;
    ctx.fillRect(wrappedX, 0, 6, vh);
    ctx.fillStyle = PALETTE.panelLight;
    ctx.fillRect(wrappedX + 1, 0, 1, vh);

    for (let y = -Math.round(offset.y); y < vh; y += segH) {
      ctx.fillStyle = PALETTE.panelLight;
      ctx.fillRect(wrappedX - 1, y, 8, 3);
      ctx.fillStyle = PALETTE.cyanDim;
      ctx.fillRect(wrappedX + 2, y + 8, 2, 2);
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
  const spikeW = SPIKE_WIDTH;
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

function drawLavaPit(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  pit: LavaPitRect,
  camX: number,
  camY: number,
): void {
  const sx = Math.round(pit.x - camX);
  const sy = Math.round(pit.y - camY);
  const w = pit.width;
  const h = pit.height;

  // Dithered pixel heat glow above the pit
  for (let px = sx; px < sx + w; px += 2) {
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = PALETTE.lavaDeep;
    ctx.fillRect(px, sy - 2, 1, 1);
    ctx.fillRect(px + 1, sy - 4, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Stepped pixel-art orange-red lava (#ffb347 -> #ff5a2b)
  const bands: Array<{ offset: number; height: number; color: string }> = [
    { offset: 0, height: 2, color: PALETTE.lavaBright },
    { offset: 2, height: 3, color: PALETTE.lavaMid },
    { offset: 5, height: 4, color: '#ff7030' },
    { offset: 9, height: Math.max(4, h - 9), color: PALETTE.lavaDeep },
  ];

  for (const band of bands) {
    ctx.fillStyle = band.color;
    ctx.fillRect(sx, sy + band.offset, w, band.height);
  }

  const phaseShift = Math.floor(state.elapsedTime * 6);
  for (let px = sx; px < sx + w; px += 5) {
    const worldPx = px + camX;
    const wave = Math.abs(worldPx + phaseShift) % 15;
    if (wave < 5) {
      ctx.fillStyle = PALETTE.lavaCore;
      ctx.fillRect(px, sy, Math.min(3, sx + w - px), 1);
    } else if (wave < 10) {
      ctx.fillStyle = PALETTE.lavaDeep;
      ctx.fillRect(px, sy + 2, Math.min(2, sx + w - px), 1);
    }

    if ((Math.abs(worldPx) * 7) % 23 === 0) {
      const rise = Math.floor((state.elapsedTime * 10 + worldPx) % 9);
      ctx.globalAlpha = rise < 6 ? 0.85 : 0.4;
      ctx.fillStyle = rise < 4 ? PALETTE.lavaBright : PALETTE.lavaDeep;
      ctx.fillRect(px, sy - 2 - rise, 1, 1);
      ctx.globalAlpha = 1;
    }
  }
}

function drawPlatformRect(
  ctx: CanvasRenderingContext2D,
  plat: PlatformRect,
  camX: number,
  camY: number,
): void {
  const sx = Math.round(plat.x - camX);
  const sy = Math.round(plat.y - camY);

  // Steel-gray walkway body
  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(sx, sy, plat.width, plat.height);

  // Subtle internal panel ribbing for deep walkway bases
  if (plat.height >= 24) {
    ctx.fillStyle = '#141f2c';
    for (let bx = 16; bx < plat.width - 8; bx += 24) {
      ctx.fillRect(sx + bx, sy + 12, 1, plat.height - 12);
    }
    ctx.fillStyle = PALETTE.panelLight;
    ctx.fillRect(sx, sy, 2, plat.height);
    ctx.fillRect(sx + plat.width - 2, sy, 2, plat.height);
  }

  // Top steel deck bevel
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(sx, sy, plat.width, 3);
  ctx.fillStyle = PALETTE.panelHighlight;
  ctx.fillRect(sx + 1, sy, Math.max(1, plat.width - 2), 1);

  // Terminal green & cyan bay trim accents along top deck
  ctx.fillStyle = PALETTE.terminalGreen;
  ctx.fillRect(sx + 6, sy + 6, 8, 1);
  if (plat.width >= 48) {
    ctx.fillRect(sx + plat.width - 14, sy + 6, 8, 1);
  }
  ctx.fillStyle = PALETTE.cyanAccent;
  ctx.fillRect(Math.round(sx + plat.width / 2) - 3, sy + 6, 6, 1);
}

function drawCheckpointMarker(
  ctx: CanvasRenderingContext2D,
  state: ShellSimulationState,
  checkpoint: CheckpointMarker,
  camX: number,
  camY: number,
): void {
  const sx = Math.round(checkpoint.x - camX);
  const baseY = Math.round(checkpoint.baseY - camY);
  const topY = baseY - checkpoint.height;

  // Steel plinth base
  ctx.fillStyle = PALETTE.bgVoid;
  ctx.fillRect(sx + 1, baseY - 5, checkpoint.width - 2, 5);
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(sx + 2, baseY - 4, checkpoint.width - 4, 4);
  ctx.fillStyle = PALETTE.panelHighlight;
  ctx.fillRect(sx + 2, baseY - 4, checkpoint.width - 4, 1);

  // Vertical beacon mast
  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(sx + 5, topY + 6, 4, checkpoint.height - 10);
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(sx + 6, topY + 6, 2, checkpoint.height - 10);

  // Beacon head
  ctx.fillStyle = PALETTE.panelLight;
  ctx.fillRect(sx + 3, topY, 8, 7);
  ctx.fillStyle = PALETTE.panelDark;
  ctx.fillRect(sx + 4, topY + 1, 6, 5);

  const pulse = 0.68 + 0.32 * Math.sin(state.elapsedTime * 5);
  ctx.globalAlpha = checkpoint.reached ? 1 : pulse;
  ctx.fillStyle = checkpoint.reached
    ? PALETTE.terminalGreen
    : PALETTE.cyanAccent;
  ctx.fillRect(sx + 5, topY + 2, 4, 3);

  // Active holographic flag banner when checkpoint is reached
  if (checkpoint.reached) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = PALETTE.terminalGreen;
    ctx.fillRect(sx + 9, topY + 1, 5, 2);
    ctx.fillRect(sx + 9, topY + 4, 4, 1);
  }
  ctx.globalAlpha = 1;
}

function drawCorridorWorld(
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

  // Lava pits
  for (let i = 0; i < state.lavaPits.length; i++) {
    drawLavaPit(ctx, state, state.lavaPits[i], camX, camY);
  }

  // Solid corridor walkways
  for (let i = 0; i < state.platforms.length; i++) {
    const plat = state.platforms[i];
    if (plat.kind === 'wall') continue;
    drawPlatformRect(ctx, plat, camX, camY);
  }

  // Walkway spike hazards
  for (let i = 0; i < state.spikes.length; i++) {
    const cluster = state.spikes[i];
    drawSpikeCluster(
      ctx,
      cluster.x - camX,
      cluster.baseY - camY,
      cluster.count,
    );
  }

  // Checkpoint beacon
  drawCheckpointMarker(ctx, state, state.checkpoint, camX, camY);
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

  ctx.imageSmoothingEnabled = false;

  // 1. Near-black sci-fi background (#0a0e14)
  ctx.fillStyle = PALETTE.bgVoid;
  ctx.fillRect(0, 0, vw, vh);

  // 2. Parallax sparse starfield
  drawPixelStarfield(ctx, state, vw, vh);

  // 3. Parallax faint scrolling steel panel-grid
  drawParallaxPanelGrid(ctx, state, vw, vh);

  // 4. Midground facility struts
  drawMidgroundStruts(ctx, state, vw, vh);

  // 5. Access Corridor platforms, lava pits, spikes, checkpoint
  drawCorridorWorld(ctx, state, camX, camY);

  // 6. Player square
  drawPlayerSquare(ctx, state, camX, camY);

  // 7. Subtle retro pixel scanlines
  ctx.globalAlpha = screenState === 'title' ? 0.08 : 0.05;
  ctx.fillStyle = '#000000';
  for (let sy = 0; sy < vh; sy += 2) {
    ctx.fillRect(0, sy, vw, 1);
  }
  ctx.globalAlpha = 1;

  // 8. Brief red full-screen flash on death
  if (state.deathFlashTimer > 0) {
    const flashRatio = Math.min(1, state.deathFlashTimer / DEATH_FLASH_DURATION);
    ctx.globalAlpha = 0.55 * flashRatio;
    ctx.fillStyle = PALETTE.spikeTipRed;
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalAlpha = 1;
  }
}
