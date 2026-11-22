import { PALETTE } from './palette';
import type { SparkParticle } from './types';

export const MAX_PARTICLES = 120;
export const PARTICLE_GRAVITY = 360;
export const PARTICLE_DRAG = 1.8;

const LANDING_COLORS = [
  PALETTE.lavaBright,
  PALETTE.cyanAccent,
  PALETTE.starBright,
  PALETTE.panelHighlight,
] as const;

const GRAPPLE_COLORS = [
  PALETTE.terminalGreen,
  PALETTE.cyanAccent,
  '#b6ffd7',
  PALETTE.starBright,
] as const;

function nextRand(seedRef: { value: number }): number {
  let s = (seedRef.value + 0x6d2b79f5) | 0;
  seedRef.value = s;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pushParticle(
  particles: SparkParticle[],
  particle: SparkParticle,
): void {
  if (particles.length >= MAX_PARTICLES) {
    particles.shift();
  }
  particles.push(particle);
}

export function spawnLandingSparks(
  particles: SparkParticle[],
  footCenterX: number,
  footY: number,
  impactSpeed: number,
  seed = 1,
): number {
  const seedRef = { value: seed | 0 };
  const intensity = Math.min(1.6, Math.max(0.7, impactSpeed / 260));
  const count = Math.round(7 * intensity);

  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const spread = 0.25 + nextRand(seedRef) * 0.75;
    const speedX = side * (36 + spread * 78) * Math.min(1.3, intensity);
    const speedY = -(32 + nextRand(seedRef) * 76) * Math.min(1.25, intensity);
    const maxLife = 0.16 + nextRand(seedRef) * 0.18;
    const color =
      LANDING_COLORS[
        Math.floor(nextRand(seedRef) * LANDING_COLORS.length)
      ] ?? PALETTE.cyanAccent;

    pushParticle(particles, {
      x: footCenterX + side * (2 + nextRand(seedRef) * 4),
      y: footY - 1 - nextRand(seedRef) * 2,
      vx: speedX,
      vy: speedY,
      life: maxLife,
      maxLife,
      size: nextRand(seedRef) > 0.65 ? 2 : 1,
      color,
      gravityScale: 1,
    });
  }

  return seedRef.value;
}

export function spawnGrappleSparks(
  particles: SparkParticle[],
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  seed = 1,
  countPerPoint = 6,
): number {
  const seedRef = { value: seed | 0 };

  const dx = targetX - originX;
  const dy = targetY - originY;
  const dist = Math.hypot(dx, dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;

  // Nozzle sparks at the player's grapple emitter directed along tether
  for (let i = 0; i < countPerPoint; i++) {
    const jitterAngle = (nextRand(seedRef) - 0.5) * 1.4;
    const cos = Math.cos(jitterAngle);
    const sin = Math.sin(jitterAngle);
    const rx = dirX * cos - dirY * sin;
    const ry = dirX * sin + dirY * cos;
    const speed = 55 + nextRand(seedRef) * 85;
    const maxLife = 0.14 + nextRand(seedRef) * 0.16;
    const color =
      GRAPPLE_COLORS[
        Math.floor(nextRand(seedRef) * GRAPPLE_COLORS.length)
      ] ?? PALETTE.terminalGreen;

    pushParticle(particles, {
      x: originX,
      y: originY,
      vx: rx * speed,
      vy: ry * speed,
      life: maxLife,
      maxLife,
      size: nextRand(seedRef) > 0.55 ? 2 : 1,
      color,
      gravityScale: 0.45,
    });
  }

  // Radial anchor clamp sparks at the node
  for (let i = 0; i < countPerPoint; i++) {
    const angle =
      (i / countPerPoint) * Math.PI * 2 + (nextRand(seedRef) - 0.5) * 0.5;
    const speed = 38 + nextRand(seedRef) * 72;
    const maxLife = 0.16 + nextRand(seedRef) * 0.18;
    const color =
      GRAPPLE_COLORS[
        Math.floor(nextRand(seedRef) * GRAPPLE_COLORS.length)
      ] ?? PALETTE.cyanAccent;

    pushParticle(particles, {
      x: targetX,
      y: targetY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      size: nextRand(seedRef) > 0.6 ? 2 : 1,
      color,
      gravityScale: 0.35,
    });
  }

  return seedRef.value;
}

export function spawnGrappleTrailSpark(
  particles: SparkParticle[],
  x: number,
  y: number,
  seed = 1,
): number {
  const seedRef = { value: seed | 0 };
  const angle = nextRand(seedRef) * Math.PI * 2;
  const speed = 16 + nextRand(seedRef) * 28;
  const maxLife = 0.12 + nextRand(seedRef) * 0.1;
  const color =
    nextRand(seedRef) > 0.4 ? PALETTE.terminalGreen : PALETTE.cyanAccent;

  pushParticle(particles, {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: maxLife,
    maxLife,
    size: 1,
    color,
    gravityScale: 0.2,
  });

  return seedRef.value;
}

export function spawnShardSparks(
  particles: SparkParticle[],
  centerX: number,
  centerY: number,
  seed = 1,
): number {
  const seedRef = { value: seed | 0 };
  const colors = [PALETTE.cyanAccent, '#b8f6ff', PALETTE.starBright] as const;

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + (nextRand(seedRef) - 0.5) * 0.4;
    const speed = 34 + nextRand(seedRef) * 58;
    const maxLife = 0.18 + nextRand(seedRef) * 0.16;
    const color =
      colors[Math.floor(nextRand(seedRef) * colors.length)] ??
      PALETTE.cyanAccent;

    pushParticle(particles, {
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      size: nextRand(seedRef) > 0.5 ? 2 : 1,
      color,
      gravityScale: 0.25,
    });
  }

  return seedRef.value;
}

export function stepParticles(particles: SparkParticle[], dt: number): void {
  if (dt <= 0 || particles.length === 0) return;

  const damping = Math.max(0, 1 - PARTICLE_DRAG * dt);
  let writeIdx = 0;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) continue;

    p.vx *= damping;
    p.vy = p.vy * damping + PARTICLE_GRAVITY * p.gravityScale * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    particles[writeIdx] = p;
    writeIdx++;
  }

  particles.length = writeIdx;
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: readonly SparkParticle[],
  camX: number,
  camY: number,
): void {
  if (particles.length === 0) return;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const ratio = Math.max(0, Math.min(1, p.life / p.maxLife));
    const px = Math.round(p.x - camX);
    const py = Math.round(p.y - camY);
    const size = ratio < 0.35 ? 1 : p.size;

    ctx.globalAlpha = ratio > 0.5 ? 1 : ratio > 0.22 ? 0.72 : 0.4;
    ctx.fillStyle = p.color;
    ctx.fillRect(px, py, size, size);
  }
  ctx.globalAlpha = 1;
}

export class ParticleSystem {
  private particles: SparkParticle[] = [];
  private seed: number;

  constructor(seed = 7331) {
    this.seed = seed | 0;
  }

  get activeParticles(): readonly SparkParticle[] {
    return this.particles;
  }

  get count(): number {
    return this.particles.length;
  }

  emitLanding(footCenterX: number, footY: number, impactSpeed = 200): void {
    this.seed = spawnLandingSparks(
      this.particles,
      footCenterX,
      footY,
      impactSpeed,
      this.seed,
    );
  }

  emitGrapple(
    originX: number,
    originY: number,
    targetX: number,
    targetY: number,
  ): void {
    this.seed = spawnGrappleSparks(
      this.particles,
      originX,
      originY,
      targetX,
      targetY,
      this.seed,
    );
  }

  emitGrappleTrail(x: number, y: number): void {
    this.seed = spawnGrappleTrailSpark(this.particles, x, y, this.seed);
  }

  update(dt: number): void {
    stepParticles(this.particles, dt);
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    drawParticles(ctx, this.particles, camX, camY);
  }

  clear(): void {
    this.particles.length = 0;
  }
}
