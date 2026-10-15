// Procedural device models. Each builder returns a THREE.Group whose userData.screens lists the
// canvas textures on it (main.js repaints them once a second for clocks and live UI).
//
// A screen is { draw(ctx, w, h, t), px?: height in pixels }. The texture's aspect follows the screen
// mesh, so draw functions can lay out against the w and h they are given.

import * as THREE from 'three';
import { slabGeo, screenGeo, canvasTex, metal, matte, glassBlack } from './kit.js';

const SCREEN_GAP = 0.0012;

function texFor(screen, aspect, px = 1024) {
  const h = screen.px || px, w = Math.round(h * aspect);
  return canvasTex(w, h, screen.draw);
}
function screenMesh(w, h, r, tex, u0, u1) {
  return new THREE.Mesh(screenGeo(w, h, r, u0, u1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}
function finish(g, screens) { g.userData.screens = screens; return g; }

// Rear cameras, drawn on the back face (z = -d/2) of a phone-like slab.
function rearCams(g, style, w, h, d, color) {
  const back = -d / 2 - 0.002, lens = (x, y, r) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.006, 28), metal(0x22252b, 0.25, 0.9));
    ring.rotation.x = Math.PI / 2; ring.position.set(x, y, back - 0.002);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.72, 28), glassBlack());
    glass.rotation.y = Math.PI; glass.position.set(x, y, back - 0.0055);
    g.add(ring, glass);
  };
  if (style === 'apple') {
    const plate = new THREE.Mesh(slabGeo(w * 0.52, w * 0.52, 0.006, w * 0.12), metal(color, 0.25));
    plate.position.set(-w * 0.2, h / 2 - w * 0.32, back);
    g.add(plate);
    lens(-w * 0.31, h / 2 - w * 0.2, w * 0.085); lens(-w * 0.31, h / 2 - w * 0.44, w * 0.085); lens(-w * 0.1, h / 2 - w * 0.32, w * 0.085);
  } else if (style === 'pixel') {
    const bar = new THREE.Mesh(slabGeo(w * 0.98, w * 0.24, 0.012, w * 0.1), metal(0x1a1c20, 0.3, 0.6));
    bar.position.set(0, h / 2 - w * 0.36, back);
    g.add(bar);
    lens(-w * 0.26, h / 2 - w * 0.36, w * 0.07); lens(-w * 0.08, h / 2 - w * 0.36, w * 0.07); lens(w * 0.14, h / 2 - w * 0.36, w * 0.04);
  } else if (style === 'galaxy') {
    for (let i = 0; i < 3; i++) lens(-w * 0.3, h / 2 - w * (0.2 + i * 0.2), w * 0.075);
    lens(-w * 0.1, h / 2 - w * 0.2, w * 0.045);
  }
}

// Front cutout over the screen.
function cutout(g, kind, w, h, z) {
  if (kind === 'island') {
    const m = new THREE.Mesh(screenGeo(w * 0.32, w * 0.09, w * 0.045), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    m.position.set(0, h / 2 - w * 0.09, z + 0.0006); g.add(m);
  } else if (kind === 'punch') {
    const m = new THREE.Mesh(new THREE.CircleGeometry(w * 0.03, 20), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    m.position.set(0, h / 2 - w * 0.075, z + 0.0006); g.add(m);
  }
}

export function phone({ w = 0.36, h = 0.78, d = 0.032, r = 0.055, color = 0x8a8f98, bezel = 0.012, screen, cut = 'punch', cams = 'apple', rough = 0.32 } = {}) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(slabGeo(w, h, d, r), metal(color, rough)));
  const sw = w - 2 * bezel, sh = h - 2 * bezel;
  const tex = texFor(screen, sw / sh);
  const s = screenMesh(sw, sh, r - bezel, tex);
  s.position.z = d / 2 + SCREEN_GAP; g.add(s);
  cutout(g, cut, sw, sh, s.position.z);
  rearCams(g, cams, w, h, d, color);
  return finish(g, [tex]);
}

export const tablet = (o) => phone({ w: 0.9, h: 0.64, d: 0.022, r: 0.035, bezel: 0.02, cut: 'none', cams: 'none', ...o });

// Book-style foldable: two panels hinged on a vertical axis, opened to `open` radians (PI = flat).
// The inner screen is one texture across both panels; `cover` optionally paints the outer screen.
export function foldable({ w = 0.34, h = 0.72, d = 0.018, r = 0.04, color = 0x5d6066, bezel = 0.01, open = Math.PI * 0.86, screen, cams = 'galaxy', axis = 'y' } = {}) {
  const g = new THREE.Group();
  const vertical = axis === 'x';                 // flip phones fold top-over-bottom
  const pw = vertical ? w : w, ph = vertical ? h / 2 : h;
  const sw = vertical ? w - 2 * bezel : w * 2 - 2 * bezel, sh = vertical ? h - 2 * bezel : h - 2 * bezel;
  const tex = texFor(screen, sw / sh);
  const a = (Math.PI - open) / 2;
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(), body = new THREE.Group();
    body.add(new THREE.Mesh(slabGeo(vertical ? pw : pw, vertical ? ph : ph, d, r), metal(color, 0.3)));
    let s;
    if (vertical) {
      // side -1 = bottom half (v 0..0.5), +1 = top half (v 0.5..1)
      s = new THREE.Mesh(screenGeo(sw, ph - bezel * 1.5, r - bezel, 0, 1, side < 0 ? 0 : 0.5, side < 0 ? 0.5 : 1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      s.position.y = side * -bezel / 4;
    } else {
      s = screenMesh(pw - bezel * 1.5, sh, r - bezel, tex, side < 0 ? 0 : 0.5, side < 0 ? 0.5 : 1);
      s.position.x = side * -bezel / 4;
    }
    s.position.z = d / 2 + SCREEN_GAP; body.add(s);
    if (vertical) { body.position.y = side * ph / 2; pivot.rotation.x = side * a; }
    else { body.position.x = side * pw / 2; pivot.rotation.y = side * -a; }
    if (side > 0) rearCams(body, cams, pw, ph, d, color);
    pivot.add(body); g.add(pivot);
  }
  // hinge spine
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.6, d * 0.6, vertical ? w * 0.98 : h * 0.98, 16), metal(0x30333a, 0.4));
  if (vertical) spine.rotation.z = Math.PI / 2;
  spine.position.z = -d * 0.2; g.add(spine);
  return finish(g, [tex]);
}

export function laptop({ w = 1.0, h = 0.64, color = 0x9aa0a8, screen, keys = 0x1b1d21, lid = -0.3, tilt = 0.32, bezel = 0.018 } = {}) {
  const g = new THREE.Group(), D = h * 0.95, t = 0.018;
  const base = new THREE.Mesh(slabGeo(w, D, t, 0.03), metal(color, 0.38));
  base.rotation.x = -Math.PI / 2; g.add(base);
  const deck = new THREE.Mesh(screenGeo(w * 0.86, D * 0.42, 0.01), matte(keys, 0.6));
  deck.rotation.x = -Math.PI / 2; deck.position.set(0, t / 2 + 0.0008, -D * 0.12); g.add(deck);
  const pad = new THREE.Mesh(screenGeo(w * 0.36, D * 0.26, 0.012), metal(color, 0.25, 0.5));
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, t / 2 + 0.0008, D * 0.28); g.add(pad);
  const pivot = new THREE.Group(); pivot.position.set(0, t / 2, -D / 2); pivot.rotation.x = lid; g.add(pivot);
  const lidMesh = new THREE.Mesh(slabGeo(w, h, 0.012, 0.03), metal(color, 0.38));
  lidMesh.position.y = h / 2; pivot.add(lidMesh);
  const sw = w - 2 * bezel, sh = h - 2 * bezel - 0.01;
  const tex = texFor(screen, sw / sh);
  const s = screenMesh(sw, sh, 0.014, tex); s.position.set(0, h / 2 + 0.004, 0.0072); pivot.add(s);
  g.rotation.x = tilt;
  return finish(g, [tex]);
}

export function watch({ shape = 'round', size = 0.34, color = 0x2a2c30, band = 0x30343c, screen, d = 0.07 } = {}) {
  const g = new THREE.Group();
  let tex;
  if (shape === 'round') {
    const R = size / 2;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.96, d, 64), metal(color, 0.25));
    body.rotation.x = Math.PI / 2; g.add(body);
    const bez = new THREE.Mesh(new THREE.TorusGeometry(R * 0.96, R * 0.05, 12, 64), metal(color, 0.18));
    bez.position.z = d / 2; g.add(bez);
    tex = texFor(screen, 1, 640);
    const s = new THREE.Mesh(new THREE.CircleGeometry(R * 0.9, 64), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    s.position.z = d / 2 + 0.004; g.add(s);
  } else {
    const W = size * 0.84, H = size;
    g.add(new THREE.Mesh(slabGeo(W, H, d, W * 0.28, d * 0.4), metal(color, 0.25)));
    tex = texFor(screen, (W - 0.03) / (H - 0.03), 640);
    const s = screenMesh(W - 0.03, H - 0.03, W * 0.24, tex); s.position.z = d / 2 + SCREEN_GAP; g.add(s);
  }
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 20), metal(color, 0.3));
  crown.rotation.z = Math.PI / 2; crown.position.set(size * 0.5, size * 0.08, 0); g.add(crown);
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(slabGeo(size * 0.62, size * 0.75, 0.025, 0.05), matte(band, 0.8));
    strap.position.set(0, s * size * 0.72, -0.03); strap.rotation.x = s * 0.55; g.add(strap);
  }
  return finish(g, [tex]);
}

export function tv({ w = 1.25, h = 0.72, color = 0x1d1f23, screen, stand = 'feet', bezel = 0.008 } = {}) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(slabGeo(w, h, 0.02, 0.008), metal(color, 0.4)));
  const sw = w - 2 * bezel, sh = h - 2 * bezel;
  const tex = texFor(screen, sw / sh);
  const s = screenMesh(sw, sh, 0.004, tex); s.position.z = 0.0105; g.add(s);
  if (stand === 'feet') {
    for (const x of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.16), metal(0x2b2d31, 0.35));
      f.position.set(x * w * 0.38, -h / 2 - 0.035, 0.02); f.rotation.x = 0.15; g.add(f);
    }
  } else {
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.03), metal(0x2b2d31));
    neck.position.set(0, -h / 2 - 0.04, -0.02);
    const foot = new THREE.Mesh(slabGeo(0.42, 0.18, 0.02, 0.04), metal(0x2b2d31));
    foot.rotation.x = -Math.PI / 2; foot.position.set(0, -h / 2 - 0.09, 0.02);
    g.add(neck, foot);
  }
  return finish(g, [tex]);
}

// All-in-one desktop: screen over a coloured chin, on an angled foot.
export function desktop({ w = 1.1, h = 0.74, color = 0x9cc3e6, screen, chin = 0.12 } = {}) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(slabGeo(w, h, 0.016, 0.02), metal(color, 0.35, 0.5)));
  const front = new THREE.Mesh(screenGeo(w - 0.006, h - chin, 0.018), new THREE.MeshStandardMaterial({ color: 0xf2f3f5, roughness: 0.3 }));
  front.position.set(0, chin / 2, 0.0085); g.add(front);
  const sw = w - 0.06, sh = h - chin - 0.06;
  const tex = texFor(screen, sw / sh);
  const s = screenMesh(sw, sh, 0.004, tex); s.position.set(0, chin / 2, 0.0095); g.add(s);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.26, 0.012), metal(color, 0.35, 0.5));
  leg.position.set(0, -h / 2 - 0.08, -0.06); leg.rotation.x = -0.35; g.add(leg);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.012, 0.2), metal(color, 0.35, 0.5));
  foot.position.set(0, -h / 2 - 0.2, -0.02); g.add(foot);
  return finish(g, [tex]);
}

// Smart display: a tilted screen floating over a fabric speaker base.
export function hub({ w = 0.78, h = 0.5, color = 0xe9e6e0, fabric = 0xd7d3cb, screen } = {}) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.22, 48, 1, false, 0, Math.PI * 2), matte(fabric, 0.95));
  base.scale.set(1.6, 1, 0.8); base.position.set(0, -h / 2 - 0.04, -0.08); g.add(base);
  const pivot = new THREE.Group(); pivot.rotation.x = -0.22; g.add(pivot);
  pivot.add(new THREE.Mesh(slabGeo(w, h, 0.02, 0.03), matte(color, 0.5)));
  const sw = w - 0.07, sh = h - 0.07;
  const tex = texFor(screen, sw / sh);
  const s = screenMesh(sw, sh, 0.012, tex); s.position.z = 0.0115; pivot.add(s);
  return finish(g, [tex]);
}

// Streaming box in front of a TV showing its interface.
export function streamer({ box = 'square', boxColor = 0x15161a, ...tvOpts } = {}) {
  const g = tv({ w: 1.2, h: 0.68, ...tvOpts });
  const b = box === 'square'
    ? new THREE.Mesh(slabGeo(0.16, 0.16, 0.05, 0.03), metal(boxColor, 0.5, 0.3))
    : new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.05, 40), matte(boxColor, 0.6));
  if (box === 'square') { b.rotation.x = -Math.PI / 2; }
  b.position.set(0.42, -0.42, 0.12); g.add(b);
  return g;
}

// Headset with the windows its wearer sees floating behind it. windows: [{ w, h, screen, x, y, z, ry }].
export function headset({ color = 0xc9ccd2, visor = 0x0a0b0e, strap = 0x5e6168, windows = [], scale = 1 } = {}) {
  const g = new THREE.Group(), screens = [];
  for (const win of windows) {
    const tex = texFor(win.screen, win.w / win.h, 720);
    const m = new THREE.Mesh(screenGeo(win.w, win.h, win.r ?? 0.03), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true, opacity: 0.97 }));
    m.position.set(win.x || 0, win.y || 0, win.z || 0); m.rotation.y = win.ry || 0;
    g.add(m); screens.push(tex);
  }
  const hs = new THREE.Group(); hs.scale.setScalar(scale); hs.position.set(0, -0.3, 0.12); g.add(hs);
  const shell = new THREE.Mesh(slabGeo(0.42, 0.2, 0.12, 0.09, 0.04), metal(color, 0.25));
  hs.add(shell);
  const glass = new THREE.Mesh(slabGeo(0.4, 0.18, 0.02, 0.08, 0.008), new THREE.MeshPhysicalMaterial({ color: visor, roughness: 0.05, metalness: 0.2, clearcoat: 1 }));
  glass.position.z = 0.062; hs.add(glass);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 12, 40, Math.PI), matte(strap, 0.9));
  band.rotation.x = Math.PI / 2; band.rotation.z = Math.PI; band.scale.set(1.05, 1.4, 1); band.position.z = -0.03; hs.add(band);
  return finish(g, screens);
}

// AI glasses with a small heads-up panel floating in front of the right lens.
export function glasses({ color = 0x1c1d20, hud, lens = 0x334455 } = {}) {
  const g = new THREE.Group(), frame = metal(color, 0.4, 0.2);
  for (const x of [-0.2, 0.2]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.009, 12, 40), frame);
    rim.scale.y = 0.78; rim.position.x = x; g.add(rim);
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.125, 40), new THREE.MeshPhysicalMaterial({ color: lens, transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1 }));
    l.scale.y = 0.78; l.position.x = x; g.add(l);
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.42), frame);
    temple.position.set(x * 1.75, 0.04, -0.2); g.add(temple);
  }
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 20, Math.PI), frame);
  bridge.position.y = 0.02; g.add(bridge);
  const screens = [];
  if (hud) {
    const tex = texFor(hud, 1.45, 512);
    const m = new THREE.Mesh(screenGeo(0.29, 0.2, 0.025), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true }));
    m.position.set(0.2, 0.3, 0.1); g.add(m); screens.push(tex);
  }
  return finish(g, screens);
}
