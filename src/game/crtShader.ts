import type { GameScreenState } from './types';

export interface CrtShaderUniforms {
  time: number;
  virtualWidth: number;
  virtualHeight: number;
  aberrationPx: number;
  scanlineStrength: number;
  glitchIntensity: number;
  deathFlash: number;
  vignetteStrength: number;
}

export function computeCrtUniforms(
  elapsedTime: number,
  deathFlashRatio: number,
  screenState: GameScreenState,
  virtualWidth: number,
  virtualHeight: number,
  reducedMotion = false,
): CrtShaderUniforms {
  const safeFlash = Math.max(0, Math.min(1, deathFlashRatio));
  const safeW = Math.max(160, virtualWidth);
  const safeH = Math.max(120, virtualHeight);

  if (reducedMotion) {
    return {
      time: elapsedTime,
      virtualWidth: safeW,
      virtualHeight: safeH,
      aberrationPx: 0.25,
      scanlineStrength: screenState === 'title' ? 0.14 : 0.1,
      glitchIntensity: 0,
      deathFlash: safeFlash,
      vignetteStrength: 0.18,
    };
  }

  // Subtle periodic CRT sync micro-glitch (~0.16s window every 5.5s)
  const cycle = elapsedTime % 5.5;
  const inGlitchWindow =
    screenState !== 'paused' && cycle >= 4.8 && cycle <= 4.96;
  const windowProgress = inGlitchWindow ? (cycle - 4.8) / 0.16 : 0;
  const envelope = inGlitchWindow ? Math.sin(windowProgress * Math.PI) : 0;

  const baseGlitch = envelope * 0.26;
  const glitchIntensity = Math.min(1, baseGlitch + safeFlash * 0.72);

  // Subtle chromatic aberration (virtual pixels), heightened gently on glitch/death
  const baseAberration = screenState === 'title' ? 0.55 : 0.42;
  const aberrationPx =
    baseAberration + envelope * 0.65 + safeFlash * 1.45;

  return {
    time: elapsedTime,
    virtualWidth: safeW,
    virtualHeight: safeH,
    aberrationPx,
    scanlineStrength: screenState === 'title' ? 0.14 : 0.11,
    glitchIntensity,
    deathFlash: safeFlash,
    vignetteStrength: screenState === 'title' ? 0.22 : 0.16,
  };
}

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2 u_virtualSize;
uniform float u_aberrationPx;
uniform float u_scanlineStrength;
uniform float u_glitchIntensity;
uniform float u_deathFlash;
uniform float u_vignetteStrength;

varying vec2 v_uv;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = v_uv;

  // Quantize glitch tear to crisp virtual scanline bands
  float rowIdx = floor(uv.y * u_virtualSize.y);
  float bandIdx = floor(rowIdx / 4.0);
  float timeStep = floor(u_time * 18.0);
  float bandRand = hash12(vec2(bandIdx, timeStep));

  float sliceShift = 0.0;
  if (u_glitchIntensity > 0.01 && bandRand > (1.0 - 0.22 * u_glitchIntensity)) {
    float dir = hash12(vec2(bandIdx + 17.0, timeStep)) * 2.0 - 1.0;
    sliceShift = dir * (1.2 + 2.4 * u_glitchIntensity) / u_virtualSize.x;
  }

  // Subtle vertical wobble on heavy glitch only
  vec2 sampleUv = vec2(clamp(uv.x + sliceShift, 0.0, 1.0), uv.y);

  // Radial distance from screen center drives subtle edge chromatic aberration
  vec2 centered = uv - 0.5;
  float edgeWeight = dot(centered, centered) * 3.4;
  float chromaShift = (0.35 + edgeWeight) * (u_aberrationPx / u_virtualSize.x);
  if (abs(sliceShift) > 0.0) {
    chromaShift += abs(sliceShift) * 0.65;
  }

  float r = texture2D(u_texture, vec2(clamp(sampleUv.x + chromaShift, 0.0, 1.0), sampleUv.y)).r;
  float g = texture2D(u_texture, sampleUv).g;
  float b = texture2D(u_texture, vec2(clamp(sampleUv.x - chromaShift, 0.0, 1.0), sampleUv.y)).b;
  vec3 color = vec3(r, g, b);

  // Crisp CRT scanlines aligned with virtual pixel rows
  float scanPhase = uv.y * u_virtualSize.y * 6.2831853;
  float scanWave = 0.5 - 0.5 * cos(scanPhase);
  float scanMask = 1.0 - u_scanlineStrength * scanWave;
  color *= scanMask;

  // Subtle horizontal phosphor grille micro-tint
  float colWave = 0.5 + 0.5 * cos(uv.x * u_virtualSize.x * 6.2831853);
  color *= 1.0 - 0.025 * colWave;

  // Subtle glitch scanline highlight accent (#39ff8f / #27e0ff tint on active tear slices)
  if (abs(sliceShift) > 0.0) {
    float sparkNoise = hash12(vec2(rowIdx, timeStep + 5.0));
    if (sparkNoise > 0.72) {
      color += vec3(0.04, 0.14, 0.12) * u_glitchIntensity;
    }
  }

  // Gentle CRT corner vignette preserving #0a0e14 depth
  float vig = 1.0 - u_vignetteStrength * dot(centered * 1.32, centered * 1.32);
  color *= clamp(vig, 0.76, 1.0);

  // Preserve death flash clarity at full frame brightness
  color += vec3(0.16, 0.02, 0.03) * u_deathFlash * 0.35;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export class CrtShaderRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private quadBuffer: WebGLBuffer;
  private texture: WebGLTexture;
  private uTextureLoc: WebGLUniformLocation | null;
  private uTimeLoc: WebGLUniformLocation | null;
  private uVirtualSizeLoc: WebGLUniformLocation | null;
  private uAberrationLoc: WebGLUniformLocation | null;
  private uScanlineLoc: WebGLUniformLocation | null;
  private uGlitchLoc: WebGLUniformLocation | null;
  private uDeathFlashLoc: WebGLUniformLocation | null;
  private uVignetteLoc: WebGLUniformLocation | null;
  private disposed = false;

  private constructor(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    quadBuffer: WebGLBuffer,
    texture: WebGLTexture,
  ) {
    this.gl = gl;
    this.program = program;
    this.quadBuffer = quadBuffer;
    this.texture = texture;

    this.uTextureLoc = gl.getUniformLocation(program, 'u_texture');
    this.uTimeLoc = gl.getUniformLocation(program, 'u_time');
    this.uVirtualSizeLoc = gl.getUniformLocation(program, 'u_virtualSize');
    this.uAberrationLoc = gl.getUniformLocation(program, 'u_aberrationPx');
    this.uScanlineLoc = gl.getUniformLocation(program, 'u_scanlineStrength');
    this.uGlitchLoc = gl.getUniformLocation(program, 'u_glitchIntensity');
    this.uDeathFlashLoc = gl.getUniformLocation(program, 'u_deathFlash');
    this.uVignetteLoc = gl.getUniformLocation(program, 'u_vignetteStrength');
  }

  static create(canvas: HTMLCanvasElement): CrtShaderRenderer | null {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return null;

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vert || !frag) {
      if (vert) gl.deleteShader(vert);
      if (frag) gl.deleteShader(frag);
      return null;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      return null;
    }

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }

    const quadBuffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!quadBuffer || !texture) {
      if (quadBuffer) gl.deleteBuffer(quadBuffer);
      if (texture) gl.deleteTexture(texture);
      gl.deleteProgram(program);
      return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return new CrtShaderRenderer(gl, program, quadBuffer, texture);
  }

  resize(width: number, height: number): void {
    if (this.disposed) return;
    this.gl.viewport(0, 0, Math.max(1, width), Math.max(1, height));
  }

  render(
    sourceCanvas: HTMLCanvasElement,
    uniforms: CrtShaderUniforms,
  ): void {
    if (this.disposed) return;
    const { gl } = this;

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      sourceCanvas,
    );

    if (this.uTextureLoc) gl.uniform1i(this.uTextureLoc, 0);
    if (this.uTimeLoc) gl.uniform1f(this.uTimeLoc, uniforms.time);
    if (this.uVirtualSizeLoc) {
      gl.uniform2f(
        this.uVirtualSizeLoc,
        uniforms.virtualWidth,
        uniforms.virtualHeight,
      );
    }
    if (this.uAberrationLoc) {
      gl.uniform1f(this.uAberrationLoc, uniforms.aberrationPx);
    }
    if (this.uScanlineLoc) {
      gl.uniform1f(this.uScanlineLoc, uniforms.scanlineStrength);
    }
    if (this.uGlitchLoc) {
      gl.uniform1f(this.uGlitchLoc, uniforms.glitchIntensity);
    }
    if (this.uDeathFlashLoc) {
      gl.uniform1f(this.uDeathFlashLoc, uniforms.deathFlash);
    }
    if (this.uVignetteLoc) {
      gl.uniform1f(this.uVignetteLoc, uniforms.vignetteStrength);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const { gl } = this;
    gl.deleteTexture(this.texture);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteProgram(this.program);
  }
}
