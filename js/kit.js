// Shared building blocks: rounded geometry, canvas textures, 2D drawing helpers and a small icon set.
//
// Units: the virtual display is 1 unit tall (VIRTUAL_DISPLAY_HEIGHT = 1 in main.js), so z = 0 is the
// glass, +z comes out toward the viewer and -z sinks behind it. Keep content within about -0.35..+0.2.

import * as THREE from 'three';

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const ease = (t) => t * t * (3 - 2 * t);

// Critically-damped-ish spring for one number: s.to = target, s.step(dt) returns the value.
export class Spring {
  constructor(v = 0, k = 170, c = 18) { this.v = v; this.to = v; this.vel = 0; this.k = k; this.c = c; }
  step(dt) {
    dt = Math.min(dt, 1 / 30);
    const a = (this.to - this.v) * this.k - this.vel * this.c;
    this.vel += a * dt; this.v += this.vel * dt;
    return this.v;
  }
}

// ---- geometry --------------------------------------------------------------------------------------
export function rrShape(w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// A flat rounded rectangle whose UVs run 0..1 across its bounds (u0..u1 lets two meshes share a texture).
export function screenGeo(w, h, r, u0 = 0, u1 = 1, v0 = 0, v1 = 1) {
  const g = new THREE.ShapeGeometry(rrShape(w, h, r), 10);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, u0 + (p.getX(i) / w + 0.5) * (u1 - u0), v0 + (p.getY(i) / h + 0.5) * (v1 - v0));
  return g;
}

// A rounded slab centred on the origin, depth d along z.
export function slabGeo(w, h, d, r, b = Math.min(d * 0.35, 0.012)) {
  const g = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, Math.max(0.001, r - b)), {
    depth: Math.max(0.0005, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10,
  });
  g.translate(0, 0, -(d - 2 * b) / 2);
  g.computeVertexNormals();
  return g;
}

export const metal = (color, rough = 0.32, metalness = 0.75) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness });
export const matte = (color, rough = 0.7) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 });
export const glassBlack = () => new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.08, metalness: 0.4 });

// An unlit textured plane (UI panels and screens). Pass opts.transparent for panels with alpha.
export function panel(w, h, r, tex, opts = {}) {
  const m = new THREE.Mesh(screenGeo(w, h, r), new THREE.MeshBasicMaterial({
    map: tex, transparent: !!opts.transparent, opacity: opts.opacity ?? 1, toneMapped: false, depthWrite: opts.depthWrite ?? !opts.transparent, side: THREE.FrontSide,
  }));
  m.renderOrder = opts.renderOrder ?? 0;
  return m;
}

// A see-through glass card: a tinted, slightly frosted rounded slab with a bright rim.
export function glassCard(w, h, r, { tint = 0xffffff, opacity = 0.18, depth = 0.012 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(slabGeo(w, h, depth, r, depth * 0.45), new THREE.MeshPhysicalMaterial({
    color: tint, roughness: 0.12, metalness: 0, transmission: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false,
  }));
  body.renderOrder = 2;
  g.add(body);
  const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ShapeGeometry(rrShape(w, h, r), 10), 30), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
  rim.position.z = depth / 2 + 0.0005;
  g.add(rim);
  g.userData.body = body;
  return g;
}

// Fit an object into a w x h box (x/y), centred, and return the scale applied.
export function fitTo(obj, w, h) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const s = Math.min(w / (size.x || 1), h / (size.y || 1));
  const wrap = new THREE.Group();
  obj.position.sub(c);
  wrap.add(obj);
  wrap.scale.setScalar(s);
  return wrap;
}

// ---- canvas textures --------------------------------------------------------------------------------
// draw(ctx, w, h, t) paints the canvas; tex.redraw(t) repaints it (used for clocks and animated UI).
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.redraw = (t = performance.now() / 1000) => { ctx.save(); ctx.clearRect(0, 0, w, h); draw(ctx, w, h, t); ctx.restore(); tex.needsUpdate = true; };
  tex.redraw(0);
  return tex;
}

// ---- 2D drawing --------------------------------------------------------------------------------------
export const FONT = {
  apple: '-apple-system, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
  google: '"Google Sans Flex", "Google Sans", "Roboto Flex", "Roboto", "Inter", sans-serif',
  samsung: '"SamsungOne", "Inter", "Segoe UI", sans-serif',
  ui: '"Inter", "Segoe UI", system-ui, sans-serif',
};

export function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function fillRR(ctx, x, y, w, h, r, fill) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
export function strokeRR(ctx, x, y, w, h, r, stroke, lw = 2) { rr(ctx, x, y, w, h, r); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }

// Apple-style continuous-corner squircle path (superellipse, n = 5).
export function squircle(ctx, x, y, s, n = 5) {
  const cx = x + s / 2, cy = y + s / 2, a = s / 2;
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const th = (i / 64) * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
    const px = cx + a * Math.sign(c) * Math.abs(c) ** (2 / n), py = cy + a * Math.sign(sn) * Math.abs(sn) ** (2 / n);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

export function text(ctx, str, x, y, { size = 24, weight = 500, color = '#fff', align = 'left', font = FONT.ui, base = 'alphabetic', spacing = 0, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / Math.max(1, stops.length - 1), c));
  return g;
}

// Soft blurred colour blobs: the base of most modern wallpapers.
export function blobs(ctx, w, h, base, spots) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (const [x, y, r, c] of spots) {
    const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * Math.max(w, h));
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
}

export function clockStr(t, h24 = false) {
  const d = new Date();
  let hh = d.getHours(); const mm = String(d.getMinutes()).padStart(2, '0');
  if (!h24) hh = hh % 12 || 12;
  return `${hh}:${mm}`;
}
export function dateStr(long = true) {
  return new Date().toLocaleDateString('en-US', long ? { weekday: 'long', month: 'long', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' });
}

// Generic status bar: time on the left, signal/wifi/battery on the right.
export function statusBar(ctx, w, y, { color = '#fff', font = FONT.ui, size = 22, pad = 40, timeAlign = 'left' } = {}) {
  text(ctx, clockStr(), timeAlign === 'center' ? w / 2 : pad, y, { size, weight: 600, color, font, align: timeAlign === 'center' ? 'center' : 'left' });
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color;
  const s = size / 22, x = w - pad;
  // battery
  ctx.globalAlpha = 0.9; ctx.lineWidth = 1.6 * s; rr(ctx, x - 34 * s, y - 15 * s, 30 * s, 15 * s, 4 * s); ctx.stroke();
  fillRR(ctx, x - 32 * s, y - 13 * s, 21 * s, 11 * s, 2.5 * s, color);
  ctx.fillRect(x - 3 * s, y - 10 * s, 2.5 * s, 5 * s);
  // wifi
  ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 56 * s, y - 1 * s, (4 + i * 5) * s, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke(); }
  // signal
  for (let i = 0; i < 4; i++) fillRR(ctx, x - 98 * s + i * 7 * s, y - (5 + i * 3.5) * s, 4.5 * s, (5 + i * 3.5) * s, 1.2 * s, color);
  ctx.restore();
}

// Simple line icons, drawn centred at (cx, cy) inside a box of size s. Brand-neutral on purpose.
export function glyph(ctx, name, cx, cy, s, color = '#fff', lw = s * 0.08) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s / 100, s / 100);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw * 100 / s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const P = () => ctx.beginPath(), S = () => ctx.stroke(), F = () => ctx.fill();
  switch (name) {
    case 'phone': P(); ctx.moveTo(-26, -34); ctx.quadraticCurveTo(-36, -24, -30, -6); ctx.quadraticCurveTo(-14, 26, 10, 34); ctx.quadraticCurveTo(26, 38, 32, 26); ctx.lineTo(18, 12); ctx.lineTo(8, 18); ctx.quadraticCurveTo(-10, 6, -16, -10); ctx.lineTo(-10, -20); ctx.closePath(); F(); break;
    case 'message': P(); ctx.ellipse(0, -4, 38, 30, 0, 0, Math.PI * 2); F(); P(); ctx.moveTo(-22, 18); ctx.lineTo(-30, 36); ctx.lineTo(-6, 24); F(); break;
    case 'camera': rr(ctx, -38, -22, 76, 52, 10); S(); P(); ctx.arc(0, 4, 15, 0, Math.PI * 2); S(); fillRR(ctx, -14, -32, 28, 12, 4, color); break;
    case 'photos': for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.globalAlpha = 0.75; P(); ctx.ellipse(0, -20, 11, 20, 0, 0, Math.PI * 2); F(); ctx.restore(); } break;
    case 'music': P(); ctx.moveTo(-10, 22); ctx.lineTo(-10, -30); ctx.lineTo(28, -38); ctx.lineTo(28, 14); S(); P(); ctx.ellipse(-20, 24, 12, 9, -0.3, 0, Math.PI * 2); F(); P(); ctx.ellipse(18, 16, 12, 9, -0.3, 0, Math.PI * 2); F(); break;
    case 'play': P(); ctx.moveTo(-16, -26); ctx.lineTo(28, 0); ctx.lineTo(-16, 26); ctx.closePath(); F(); break;
    case 'pause': fillRR(ctx, -22, -26, 14, 52, 4, color); fillRR(ctx, 8, -26, 14, 52, 4, color); break;
    case 'next': P(); ctx.moveTo(-26, -20); ctx.lineTo(4, 0); ctx.lineTo(-26, 20); ctx.closePath(); F(); P(); ctx.moveTo(0, -20); ctx.lineTo(30, 0); ctx.lineTo(0, 20); ctx.closePath(); F(); break;
    case 'prev': ctx.scale(-1, 1); P(); ctx.moveTo(-26, -20); ctx.lineTo(4, 0); ctx.lineTo(-26, 20); ctx.closePath(); F(); P(); ctx.moveTo(0, -20); ctx.lineTo(30, 0); ctx.lineTo(0, 20); ctx.closePath(); F(); break;
    case 'map': P(); ctx.arc(0, -10, 20, Math.PI, 0); ctx.lineTo(0, 34); ctx.closePath(); F(); ctx.globalCompositeOperation = 'destination-out'; P(); ctx.arc(0, -10, 8, 0, Math.PI * 2); F(); break;
    case 'mail': rr(ctx, -38, -26, 76, 52, 8); S(); P(); ctx.moveTo(-36, -22); ctx.lineTo(0, 6); ctx.lineTo(36, -22); S(); break;
    case 'gear': for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); fillRR(ctx, -7, -38, 14, 16, 3, color); ctx.restore(); } P(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.lineWidth = 10; S(); break;
    case 'clock': P(); ctx.arc(0, 0, 34, 0, Math.PI * 2); S(); P(); ctx.moveTo(0, -20); ctx.lineTo(0, 0); ctx.lineTo(14, 10); S(); break;
    case 'calendar': rr(ctx, -34, -30, 68, 64, 10); S(); P(); ctx.moveTo(-34, -12); ctx.lineTo(34, -12); S(); for (let i = 0; i < 6; i++) fillRR(ctx, -22 + (i % 3) * 18, 0 + Math.floor(i / 3) * 14, 8, 8, 2, color); break;
    case 'sun': P(); ctx.arc(0, 0, 16, 0, Math.PI * 2); F(); for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); P(); ctx.moveTo(0, -26); ctx.lineTo(0, -36); S(); ctx.restore(); } break;
    case 'cloud': P(); ctx.arc(-14, 6, 16, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(4, -6, 22, Math.PI, Math.PI * 1.9); ctx.arc(22, 8, 14, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); F(); break;
    case 'heart': P(); ctx.moveTo(0, 30); ctx.bezierCurveTo(-46, 0, -30, -40, 0, -16); ctx.bezierCurveTo(30, -40, 46, 0, 0, 30); F(); break;
    case 'search': P(); ctx.arc(-6, -6, 22, 0, Math.PI * 2); S(); P(); ctx.moveTo(10, 10); ctx.lineTo(30, 30); S(); break;
    case 'mic': rr(ctx, -12, -34, 24, 46, 12); F(); P(); ctx.arc(0, 0, 22, 0.1 * Math.PI, 0.9 * Math.PI); S(); P(); ctx.moveTo(0, 22); ctx.lineTo(0, 34); S(); break;
    case 'wifi': for (let i = 0; i < 3; i++) { P(); ctx.arc(0, 22, 14 + i * 14, -Math.PI * 0.78, -Math.PI * 0.22); S(); } P(); ctx.arc(0, 22, 5, 0, Math.PI * 2); F(); break;
    case 'bt': P(); ctx.moveTo(-18, -16); ctx.lineTo(18, 16); ctx.lineTo(0, 32); ctx.lineTo(0, -32); ctx.lineTo(18, -16); ctx.lineTo(-18, 16); S(); break;
    case 'moon': P(); ctx.arc(0, 0, 30, 0.5, Math.PI * 2 - 0.5 + 0.0); ctx.arc(14, -10, 24, Math.PI * 2 - 0.9, 1.1, true); F(); break;
    case 'flash': P(); ctx.moveTo(6, -36); ctx.lineTo(-20, 6); ctx.lineTo(0, 6); ctx.lineTo(-6, 36); ctx.lineTo(20, -6); ctx.lineTo(0, -6); ctx.closePath(); F(); break;
    case 'plane': P(); ctx.moveTo(0, -36); ctx.lineTo(6, -8); ctx.lineTo(34, 8); ctx.lineTo(34, 14); ctx.lineTo(6, 6); ctx.lineTo(4, 26); ctx.lineTo(14, 34); ctx.lineTo(-14, 34); ctx.lineTo(-4, 26); ctx.lineTo(-6, 6); ctx.lineTo(-34, 14); ctx.lineTo(-34, 8); ctx.lineTo(-6, -8); ctx.closePath(); F(); break;
    case 'home': P(); ctx.moveTo(-34, -2); ctx.lineTo(0, -32); ctx.lineTo(34, -2); S(); rr(ctx, -24, -8, 48, 40, 4); S(); break;
    case 'bulb': P(); ctx.arc(0, -8, 22, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(10, 18); ctx.lineTo(-10, 18); ctx.closePath(); S(); P(); ctx.moveTo(-9, 28); ctx.lineTo(9, 28); S(); break;
    case 'lock': rr(ctx, -26, -4, 52, 38, 8); F(); P(); ctx.arc(0, -8, 16, Math.PI, 0); ctx.lineTo(16, -2); ctx.moveTo(-16, -2); ctx.lineTo(-16, -8); S(); break;
    case 'person': P(); ctx.arc(0, -14, 16, 0, Math.PI * 2); F(); P(); ctx.ellipse(0, 30, 30, 22, 0, Math.PI, 0); F(); break;
    case 'grid': for (let i = 0; i < 9; i++) { P(); ctx.arc(-24 + (i % 3) * 24, -24 + Math.floor(i / 3) * 24, 7, 0, Math.PI * 2); F(); } break;
    case 'sparkle': P(); ctx.moveTo(0, -38); ctx.quadraticCurveTo(4, -4, 38, 0); ctx.quadraticCurveTo(4, 4, 0, 38); ctx.quadraticCurveTo(-4, 4, -38, 0); ctx.quadraticCurveTo(-4, -4, 0, -38); F(); break;
    case 'note': rr(ctx, -28, -34, 56, 68, 8); S(); for (let i = 0; i < 3; i++) { P(); ctx.moveTo(-16, -16 + i * 16); ctx.lineTo(16, -16 + i * 16); S(); } break;
    case 'store': P(); ctx.moveTo(-30, -10); ctx.lineTo(30, -10); ctx.lineTo(24, 30); ctx.lineTo(-24, 30); ctx.closePath(); F(); P(); ctx.arc(0, -12, 14, Math.PI, 0); S(); break;
    case 'tv': rr(ctx, -38, -26, 76, 48, 6); S(); P(); ctx.moveTo(-16, 34); ctx.lineTo(16, 34); S(); break;
    case 'fitness': for (let i = 0; i < 3; i++) { P(); ctx.arc(0, 0, 34 - i * 11, -Math.PI / 2, Math.PI * (0.9 - i * 0.25)); S(); } break;
    case 'wallet': rr(ctx, -36, -24, 72, 50, 8); F(); ctx.globalCompositeOperation = 'destination-out'; fillRR(ctx, 6, -6, 30, 16, 6, '#000'); break;
    case 'chevron': P(); ctx.moveTo(-10, -22); ctx.lineTo(12, 0); ctx.lineTo(-10, 22); S(); break;
    case 'plus': P(); ctx.moveTo(-24, 0); ctx.lineTo(24, 0); ctx.moveTo(0, -24); ctx.lineTo(0, 24); S(); break;
    case 'car': rr(ctx, -36, -6, 72, 26, 8); F(); P(); ctx.moveTo(-24, -6); ctx.lineTo(-14, -24); ctx.lineTo(14, -24); ctx.lineTo(24, -6); F(); P(); ctx.arc(-20, 22, 8, 0, Math.PI * 2); ctx.arc(20, 22, 8, 0, Math.PI * 2); F(); break;
    case 'thermo': rr(ctx, -9, -34, 18, 48, 9); S(); P(); ctx.arc(0, 22, 13, 0, Math.PI * 2); F(); break;
    case 'speaker': rr(ctx, -24, -34, 48, 68, 10); S(); P(); ctx.arc(0, 10, 13, 0, Math.PI * 2); S(); P(); ctx.arc(0, -18, 5, 0, Math.PI * 2); F(); break;
    default: P(); ctx.arc(0, 0, 26, 0, Math.PI * 2); F();
  }
  ctx.restore();
}
