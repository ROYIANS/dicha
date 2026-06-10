import { useEffect, useRef } from 'react';

const VERTEX_SHADER = `#version 300 es
in vec2 coordinates;
out vec2 fragCoord;
void main() {
  gl_Position = vec4(coordinates, 0.0, 1.0);
  fragCoord = (coordinates + 1.0) * 0.5;
  fragCoord.y = 1.0 - fragCoord.y;
}`;

function buildFragmentShader() {
  return `#version 300 es
precision mediump float;

in vec2 fragCoord;

uniform float u_time;
uniform float u_opacities[10];
uniform vec3 u_colors[6];
uniform float u_total_size;
uniform float u_dot_size;
uniform vec2 u_resolution;

out vec4 fragColor;

float PHI = 1.61803398874989484820459;
float random(vec2 xy) {
  return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
}

void main() {
  vec2 st = fragCoord.xy * u_resolution;

  st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
  st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));

  float opacity = step(0.0, st.x);
  opacity *= step(0.0, st.y);

  vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

  float frequency = 5.0;
  float show_offset = random(st2);
  float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency) + 1.0);
  opacity *= u_opacities[int(rand * 10.0)];
  opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
  opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

  vec3 color = u_colors[int(show_offset * 6.0)];

  fragColor = vec4(color, opacity);
  fragColor.rgb *= fragColor.a;
}`;
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : (gl.deleteShader(shader), null);
}

function readDrawerTokens() {
  const root = getComputedStyle(document.documentElement);
  const parseRgb = (raw: string, fallback: [number, number, number]) => {
    const parts = raw.split(',').map((s) => Number.parseFloat(s.trim()));
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      return [parts[0]! / 255, parts[1]! / 255, parts[2]! / 255] as [number, number, number];
    }
    return fallback;
  };

  const scrimRgb = root.getPropertyValue('--lp-drawer-scrim-rgb').trim() || '0, 0, 0';
  const scrimA = Number.parseFloat(root.getPropertyValue('--lp-drawer-scrim-a').trim()) || 0.5;
  const dotRgb = root.getPropertyValue('--lp-drawer-dot-rgb').trim() || '255, 255, 255';

  return {
    scrim: `rgba(${scrimRgb}, ${scrimA})`,
    dot: parseRgb(dotRgb, [1, 1, 1]),
  };
}

/** WebGL 闪烁点阵 + 半透明叠层，用于抽屉遮罩（参考 ChemViz ClerkModalBackdrop）。 */
export function DotsBackdrop({ visible, className = '' }: { visible: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.round(Math.max(1, Math.min(window.devicePixelRatio ?? 1, 2)));
    const offscreen = document.createElement('canvas');

    const setSize = () => {
      canvas.width = offscreen.width = Math.max(1, canvas.offsetWidth * dpr);
      canvas.height = offscreen.height = Math.max(1, canvas.offsetHeight * dpr);
    };
    setSize();

    const gl = offscreen.getContext('webgl2');
    const ctx2d = canvas.getContext('2d');
    if (!gl || !ctx2d) return;

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, buildFragmentShader());
    if (!vert || !frag) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const coord = gl.getAttribLocation(program, 'coordinates');
    gl.enableVertexAttribArray(coord);
    gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uColors = gl.getUniformLocation(program, 'u_colors');
    const uOpacities = gl.getUniformLocation(program, 'u_opacities');
    const uTotalSize = gl.getUniformLocation(program, 'u_total_size');
    const uDotSize = gl.getUniformLocation(program, 'u_dot_size');

    const opacities = new Float32Array([0.08, 0.08, 0.08, 0.08, 0.08, 0.16, 0.16, 0.16, 0.16, 0.28]);

    const syncDotColors = () => {
      const [r, g, b] = readDrawerTokens().dot;
      gl.uniform3fv(
        uColors,
        new Float32Array([r, g, b, r, g, b, r, g, b, r, g, b, r, g, b, r, g, b]),
      );
    };

    syncDotColors();
    gl.uniform1fv(uOpacities, opacities);
    gl.uniform1f(uTotalSize, 4);
    gl.uniform1f(uDotSize, 2);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST);

    let startTime: number | null = null;
    let raf = 0;
    let lastFrame = 0;

    const draw = (ts: number) => {
      if (startTime === null) startTime = ts / 1000;
      if (!reducedMotion && ts - lastFrame < 1000 / 30) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrame = ts;

      const t = reducedMotion ? 0 : ts / 1000 - startTime;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uResolution, canvas.width / dpr, canvas.height / dpr);
      gl.viewport(0, 0, offscreen.width, offscreen.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      const { scrim } = readDrawerTokens();
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      ctx2d.fillStyle = scrim;
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      if (offscreen.width > 0 && offscreen.height > 0) ctx2d.drawImage(offscreen, 0, 0);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => {
      setSize();
      gl.uniform2f(uResolution, canvas.width / dpr, canvas.height / dpr);
    });
    ro.observe(canvas);

    const themeObserver = new MutationObserver(() => syncDotColors());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      themeObserver.disconnect();
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none size-full ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
    />
  );
}
