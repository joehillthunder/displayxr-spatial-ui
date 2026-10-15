// 3D props for the device carousel's "3D screen" apps: things that pop out of a device's glass.
//
// Every builder returns a THREE.Group (sized in scene units, centred on its origin) and, where it moves,
// puts an update(dt, t) function on group.userData.update. Brands compose these with their own styled
// cards (kit.canvasTex + kit.panel) inside dev.apps[].build(box).
//
// Keep pop-outs within about 0.2 units in front of the screen: the device is already near the glass.

import * as THREE from 'three';
import { canvasTex, panel, slabGeo, screenGeo, text, FONT } from './kit.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...o });
const emis = (color, k = 1, o = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4, ...o });
const tick = (g, fn) => { g.userData.update = fn; return g; };
export const updateAll = (root, dt, t) => root.traverse((o) => o.userData.update?.(dt, t));

// ---- weather -----------------------------------------------------------------------------------------
export function cloud(s = 0.06, color = 0xf4f6fb) {
  const g = new THREE.Group(), m = std(color, { roughness: 0.9 });
  [[0, 0, 0.55], [-0.6, -0.1, 0.4], [0.62, -0.08, 0.42], [-0.25, 0.28, 0.42], [0.3, 0.25, 0.38], [0, -0.18, 0.45]].forEach(([x, y, r]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * s, 20, 14), m); b.position.set(x * s, y * s, (Math.random() - 0.5) * 0.2 * s); g.add(b);
  });
  const ph = Math.random() * 6;
  return tick(g, (dt, t) => { g.position.x += Math.sin(t * 0.6 + ph) * 0.00006; g.rotation.z = Math.sin(t * 0.5 + ph) * 0.03; });
}

export function sun(r = 0.04, color = 0xffc53d) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), emis(color, 1.1)));
  const rays = new THREE.Group(); g.add(rays);
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.16, r * 0.55, 8), emis(color, 0.9));
    const a = (i / 12) * Math.PI * 2; c.position.set(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45, 0); c.rotation.z = a - Math.PI / 2; rays.add(c);
  }
  g.add(glow(color, r * 5));
  return tick(g, (dt, t) => { rays.rotation.z = t * 0.35; rays.scale.setScalar(1 + Math.sin(t * 2) * 0.05); });
}

// Falling rain (or snow) inside a w x h x d box centred on the origin.
export function precipitation({ w = 0.2, h = 0.2, d = 0.12, count = 90, snow = false, color = snow ? 0xffffff : 0x8cc8ff } = {}) {
  const geo = snow ? new THREE.SphereGeometry(0.0035, 6, 4) : new THREE.CylinderGeometry(0.0012, 0.0012, 0.018, 4);
  const mesh = new THREE.InstancedMesh(geo, emis(color, 0.5, { transparent: true, opacity: 0.85 }), count);
  const P = [], m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) P.push([(Math.random() - 0.5) * w, Math.random() * h - h / 2, (Math.random() - 0.5) * d, 0.6 + Math.random() * 0.6]);
  const g = new THREE.Group(); g.add(mesh);
  return tick(g, (dt, t) => {
    for (let i = 0; i < count; i++) {
      const p = P[i];
      p[1] -= dt * (snow ? 0.05 : 0.32) * p[3];
      if (p[1] < -h / 2) p[1] += h;
      m.makeTranslation(p[0] + (snow ? Math.sin(t + i) * 0.006 : 0), p[1], p[2]);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
}

export function bolt(s = 0.05, color = 0xffe14d) {
  const sh = new THREE.Shape();
  [[0.1, 0.5], [-0.25, 0.02], [0.02, 0.02], [-0.12, -0.5], [0.28, 0.08], [0.02, 0.08], [0.2, 0.5]].forEach(([x, y], i) => (i ? sh.lineTo(x * s, y * s) : sh.moveTo(x * s, y * s)));
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: s * 0.12, bevelEnabled: false }), emis(color, 1.4));
  const g = new THREE.Group(); g.add(mesh);
  return tick(g, (dt, t) => { mesh.visible = (t % 2.6) < 0.18 || ((t % 2.6) > 0.3 && (t % 2.6) < 0.4); });
}

// ---- people and feelings ------------------------------------------------------------------------------
// A friendly stylised caller (head and shoulders) for video calls. talk() makes the mouth move.
export function bust({ skin = 0xe0b08f, hair = 0x3a2a20, shirt = 0x3d6fd6, s = 0.1 } = {}) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.42, 32, 24), std(skin, { roughness: 0.6 }));
  head.scale.set(1, 1.12, 0.95); head.position.y = s * 0.35; g.add(head);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(s * 0.44, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), std(hair, { roughness: 0.8 }));
  hairM.position.y = s * 0.39; hairM.rotation.x = -0.25; hairM.scale.set(1.02, 1.1, 1); g.add(hairM);
  for (const x of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.05, 12, 8), std(0x1b1b1f, { roughness: 0.2 }));
    eye.position.set(x * s * 0.15, s * 0.42, s * 0.37); eye.name = 'eye'; g.add(eye);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(s * 0.08, 12, 8), std(skin)); ear.position.set(x * s * 0.42, s * 0.36, 0); g.add(ear);
  }
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.035, s * 0.1, 4, 8), std(0x8a3b3b));
  mouth.rotation.z = Math.PI / 2; mouth.position.set(0, s * 0.2, s * 0.38); g.add(mouth);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.14, s * 0.16, s * 0.2, 16), std(skin)); neck.position.y = s * -0.05; g.add(neck);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.42, s * 0.25, 6, 20), std(shirt, { roughness: 0.75 }));
  torso.rotation.z = Math.PI / 2; torso.scale.set(1, 1.15, 0.6); torso.position.y = s * -0.42; g.add(torso);
  const eyes = g.children.filter((o) => o.name === 'eye');
  g.userData.talking = true;
  return tick(g, (dt, t) => {
    const blink = (t % 3.7) < 0.12 ? 0.15 : 1;
    eyes.forEach((e) => (e.scale.y = blink));
    mouth.scale.x = g.userData.talking ? 0.7 + 0.5 * Math.abs(Math.sin(t * 9) * Math.sin(t * 3.1)) : 0.7;
    head.rotation.y = Math.sin(t * 0.7) * 0.18; hairM.rotation.y = head.rotation.y;
    head.rotation.z = Math.sin(t * 0.5) * 0.05;
  });
}

export function heart(s = 0.05, color = 0xff2d55, bpm = 72) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.35 * s);
  sh.bezierCurveTo(-0.55 * s, 0.0, -0.5 * s, 0.5 * s, 0, 0.25 * s);
  sh.bezierCurveTo(0.5 * s, 0.5 * s, 0.55 * s, 0.0, 0, -0.35 * s);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: s * 0.25, bevelEnabled: true, bevelThickness: s * 0.12, bevelSize: s * 0.08, bevelSegments: 6, curveSegments: 24 });
  geo.center();
  const mesh = new THREE.Mesh(geo, emis(color, 0.45, { roughness: 0.3, metalness: 0.1 }));
  const g = new THREE.Group(); g.add(mesh); g.add(glow(color, s * 3, 0.35));
  g.userData.bpm = bpm;
  return tick(g, (dt, t) => {
    const ph = (t * g.userData.bpm / 60) % 1, beat = Math.exp(-ph * 9) + 0.5 * Math.exp(-Math.max(0, ph - 0.18) * 12) * (ph > 0.18 ? 1 : 0);
    mesh.scale.setScalar(1 + beat * 0.16);
    mesh.rotation.y = Math.sin(t * 0.8) * 0.4;
  });
}

// A sphere "reaction" (emoji-like face) that bounces out.
export function emojiBall(r = 0.035, color = 0xffcc33, mood = 'smile') {
  const tex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#' + new THREE.Color(color).getHexString(); c.fillRect(0, 0, w, h);
    c.fillStyle = '#3a2a10';
    const cx = w * 0.25;   // the face sits at u = 0.25, the +z side of the sphere
    c.beginPath(); c.ellipse(cx - 14, h * 0.42, 6, 9, 0, 0, Math.PI * 2); c.ellipse(cx + 14, h * 0.42, 6, 9, 0, 0, Math.PI * 2); c.fill();
    c.lineWidth = 6; c.strokeStyle = '#3a2a10'; c.lineCap = 'round'; c.beginPath();
    if (mood === 'wow') { c.arc(cx, h * 0.66, 8, 0, Math.PI * 2); c.fillStyle = '#3a2a10'; c.fill(); }
    else if (mood === 'love') { c.fillStyle = '#ff2d55'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.fillText('♥ ♥', cx, h * 0.5); c.beginPath(); c.arc(cx, h * 0.6, 14, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    else { c.arc(cx, h * 0.56, 18, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 }));
  const g = new THREE.Group(); g.add(m);
  const ph = Math.random() * 6;
  return tick(g, (dt, t) => { m.position.y = Math.abs(Math.sin(t * 2.2 + ph)) * r * 0.6; m.rotation.y = Math.sin(t * 1.3 + ph) * 0.4; });
}

// ---- health and fitness ---------------------------------------------------------------------------------
// Concentric activity rings as solid tori; fracs = [move, exercise, stand] 0..1.
export function rings({ r = 0.06, tube = 0.008, colors = [0xfa114f, 0xa6ff00, 0x00f5ea], fracs = [0.82, 0.64, 0.9] } = {}) {
  const g = new THREE.Group(), arcs = [];
  colors.forEach((c, i) => {
    const R = r - i * tube * 2.6;
    const track = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 12, 80), emis(c, 0.15, { transparent: true, opacity: 0.25 }));
    const arc = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 16, 120, Math.PI * 2 * fracs[i]), emis(c, 0.7));
    arc.rotation.z = Math.PI / 2; arc.position.z = i * tube * 1.6; track.position.z = arc.position.z;
    arc.userData.full = fracs[i]; arcs.push(arc); g.add(track, arc);
  });
  return tick(g, (dt, t) => { arcs.forEach((a, i) => { a.position.z = (i * 1.6 + Math.sin(t * 1.4 + i) * 0.8) * tube; }); g.rotation.y = Math.sin(t * 0.6) * 0.35; });
}

// ---- places ------------------------------------------------------------------------------------------
// A small city block plate with extruded buildings, a glowing route and a bobbing pin.
export function city({ w = 0.26, d = 0.18, color = 0xd9dde6, route = 0x2f7bff, pin = 0xff3b30, seed = 7 } = {}) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, d), std(0x9fb3a0, { roughness: 0.95 })); g.add(plate);
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) {
    if (i === 0 || j === 0) continue;   // streets
    const h = 0.008 + rnd() * rnd() * 0.07;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w / 8.5, h, d / 6.5), std(new THREE.Color(color).offsetHSL(0, 0, (rnd() - 0.5) * 0.15), { roughness: 0.7 }));
    b.position.set((i / 7) * w, h / 2 + 0.003, (j / 5.2) * d); g.add(b);
  }
  const pts = [[-0.45, 0.45], [-0.45, 0], [0, 0], [0, -0.4], [0.42, -0.4]].map(([x, z]) => new THREE.Vector3(x * w, 0.006, z * d));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.01), 60, 0.003, 8), emis(route, 1));
  g.add(tube);
  const p = new THREE.Group(); p.position.copy(pts[pts.length - 1]); g.add(p);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.012, 20, 14), emis(pin, 0.6)); head.position.y = 0.04; p.add(head);
  const stem = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.03, 12), emis(pin, 0.6)); stem.rotation.x = Math.PI; stem.position.y = 0.022; p.add(stem);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), emis(0xffffff, 1)); g.add(dot);
  const curve = new THREE.CatmullRomCurve3(pts);
  return tick(g, (dt, t) => { p.position.y = 0.004 + Math.abs(Math.sin(t * 2.4)) * 0.012; curve.getPointAt((t * 0.12) % 1, dot.position); dot.position.y = 0.01; });
}

// ---- media ---------------------------------------------------------------------------------------------
// Audio bars rising from a base line; set group.userData.level (0..1) or let them dance.
export function bars({ n = 12, w = 0.18, h = 0.08, colors = [0xff375f, 0xff9f0a] } = {}) {
  const g = new THREE.Group(), list = [];
  const c0 = new THREE.Color(colors[0]), c1 = new THREE.Color(colors[1] ?? colors[0]);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w / n * 0.62, 1, w / n * 0.62), emis(c0.clone().lerp(c1, i / (n - 1)), 0.7));
    m.position.x = (i - (n - 1) / 2) * (w / n); g.add(m); list.push(m);
  }
  return tick(g, (dt, t) => list.forEach((m, i) => {
    const v = 0.15 + 0.85 * Math.abs(Math.sin(t * 3.1 + i * 0.7) * Math.sin(t * 1.7 + i * 0.3));
    m.scale.y = v * h; m.position.y = (v * h) / 2;
  }));
}

// A depth photo: three cut-out layers (sky, hills, subject) separated in z. draw(ctx,w,h,layer) paints each.
export function depthPhoto({ w = 0.2, h = 0.14, gap = 0.03, draw } = {}) {
  const g = new THREE.Group(), layers = [];
  for (let i = 0; i < 3; i++) {
    const tex = canvasTex(512, Math.round(512 * h / w), (c, cw, ch) => draw(c, cw, ch, i));
    const m = panel(w * (1 - i * 0.04), h * (1 - i * 0.04), i ? 0 : 0.012, tex, { transparent: i > 0 });
    m.position.z = i * gap; g.add(m); layers.push(m);
  }
  return tick(g, (dt, t) => layers.forEach((m, i) => { m.position.x = Math.sin(t * 0.6) * 0.004 * i; m.position.z = i * gap * (0.85 + 0.15 * Math.sin(t * 0.9)); }));
}

// ---- generic -------------------------------------------------------------------------------------------
// A soft additive glow sprite.
let glowTex = null;
export function glow(color = 0xffffff, size = 0.1, opacity = 0.5) {
  if (!glowTex) glowTex = canvasTex(128, 128, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}

// A thick floating card: a rounded slab with canvas art on the front. draw(ctx, w, h, t); card.userData.tex.redraw().
export function card3d(w, h, draw, { r = Math.min(w, h) * 0.18, depth = 0.008, color = 0x15171c, px = 360, opacity = 1 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(slabGeo(w, h, depth, r, depth * 0.45), new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1, transparent: opacity < 1, opacity }));
  g.add(body);
  const tex = canvasTex(Math.round(px * w / h), px, draw);
  const face = new THREE.Mesh(screenGeo(w - depth * 0.6, h - depth * 0.6, r - depth * 0.3), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true }));
  face.position.z = depth / 2 + 0.0006; g.add(face);
  g.userData.tex = tex; g.userData.face = face; g.userData.body = body;
  return g;
}

// Big floating number/word on a transparent plane (temperature, score, time).
export function bigText(str, { height = 0.05, color = '#fff', font = FONT.ui, weight = 700 } = {}) {
  const px = 160, c = document.createElement('canvas').getContext('2d');
  c.font = `${weight} ${px * 0.8}px ${font}`;
  const tw = Math.ceil(c.measureText(str).width + px * 0.3);
  const tex = canvasTex(tw, px, (ctx, w, h) => {
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14;
    text(ctx, str, w / 2, h * 0.78, { size: px * 0.8, weight, color, align: 'center', font });
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(height * tw / px, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
}

// Spring-in helper for staggered pop-outs: returns 0..1 for item i given time since enter.
export const stagger = (since, i, each = 0.12, dur = 0.5) => {
  const x = Math.min(1, Math.max(0, (since - i * each) / dur));
  return 1 - Math.pow(1 - x, 3) + Math.sin(x * Math.PI) * 0.08;
};
