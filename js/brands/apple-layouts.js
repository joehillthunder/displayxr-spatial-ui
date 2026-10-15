// Apple: today's iPhone home screen rebuilt with solid 3D icons, then four reimagined spatial
// interfaces (phone, tablet, monitor, living-room Home View) in Liquid Glass.
//
// Each device is drawn as a shell whose screen is an open window into depth: the bezel sits at the
// glass (z = 0), the wallpaper sits at the back of the shell, and UI lives in between and in front.

import * as THREE from 'three';
import { canvasTex, panel, glassCard, Spring, damp, clamp, FONT, rr, fillRR, text, grad, blobs, glyph, statusBar, clockStr, rrShape, slabGeo, metal } from '../kit.js';
import { icon3d, label3d, gridPositions } from '../icons3d.js';
import { appIcon, lg, wallpaper, APPS, APP_NAMES, trafficLights } from './apple.js';

const F = FONT.apple;

// ---- shared pieces --------------------------------------------------------------------------------------

function tp(w, h, r, px, draw, opts = {}) {
  const tex = canvasTex(Math.round(px * w / h), px, draw);
  const m = panel(w, h, r, tex, { transparent: true, ...opts });
  m.userData.tex = tex;
  return m;
}

// A device shell: a bezel ring at the glass, walls running back D units, and a wallpaper at the back.
function shell({ W, H, R, bw, D, cap = 0xb4b8bf, side = 0x3a4150, wall }) {
  const g = new THREE.Group();
  const outer = rrShape(W, H, R);
  outer.holes.push(new THREE.Path(rrShape(W - 2 * bw, H - 2 * bw, Math.max(0.004, R - bw)).getPoints(10)));
  const geo = new THREE.ExtrudeGeometry(outer, { depth: D, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -D - 0.004);
  g.add(new THREE.Mesh(geo, [metal(cap, 0.3, 0.7), metal(side, 0.5, 0.5)]));
  const iw = W - 2 * bw, ih = H - 2 * bw;
  if (wall) {
    const tex = canvasTex(Math.round(900 * iw / ih), 900, wall);
    const back = panel(iw, ih, Math.max(0.004, R - bw), tex);
    back.position.z = -D + 0.002;
    g.add(back);
    g.userData.wallTex = tex;
  }
  g.userData.inner = [iw, ih];
  return g;
}

// A solid app icon: the 2D icon art on the face, the body in the icon's darker colour.
function appSlab(id, size, { round = false, depth = size * 0.3 } = {}) {
  const [cols] = APPS[id] || APPS.settings;
  const g = icon3d({ shape: round ? 'circle' : 'squircle', size, depth, side: cols[1], px: 192, face: (c, w) => appIcon(c, id, 0, 0, w, { round }) });
  g.userData.id = id;
  g.traverse((o) => { o.userData.icon = g; });
  return g;
}

// Hover lift + tilt toward the pointer + a springy bounce on click, for any set of icons.
function iconFx(icons, { lift = 0.06, scale = 1.12, tilt = 0.5 } = {}) {
  for (const ic of icons) {
    ic.userData.base = ic.position.clone();
    ic.userData.fx = { z: new Spring(0, 220, 20), s: new Spring(1, 220, 18), kick: new Spring(0, 260, 7), rx: 0, ry: 0 };
  }
  const _p = new THREE.Vector3();
  return {
    update(dt, hit) {
      const hov = hit?.object?.userData.icon;
      for (const ic of icons) {
        const f = ic.userData.fx, on = hov === ic;
        f.z.to = on ? lift : 0; f.s.to = on ? scale : 1;
        let rx = 0, ry = 0;
        if (on) { ic.worldToLocal(_p.copy(hit.point)); const s = ic.userData.size || 0.1; ry = clamp(_p.x / s, -1, 1) * tilt; rx = -clamp(_p.y / s, -1, 1) * tilt; }
        f.rx = damp(f.rx, rx, 10, dt); f.ry = damp(f.ry, ry, 10, dt);
        ic.position.z = ic.userData.base.z + f.z.step(dt) + f.kick.step(dt);
        ic.scale.setScalar(f.s.step(dt));
        ic.rotation.set(f.rx, f.ry, 0);
      }
    },
    kick(ic, v = 1.8) { if (ic?.userData.fx) ic.userData.fx.kick.vel += v; },
  };
}

const hitIcon = (hit) => hit?.object?.userData.icon || null;

// =====================================================================================================
// 1. Today's iPhone home screen, rebuilt with solid icons (the traditional layout)
// =====================================================================================================

function widgetWeather(c, w, h) {
  const k = w / 170;
  lg(c, 2, 2, w - 4, h - 4, 30 * k);
  text(c, 'Cupertino', 18 * k, 34 * k, { size: 17 * k, weight: 600, font: F });
  text(c, '72°', 18 * k, 92 * k, { size: 52 * k, weight: 300, font: F });
  glyph(c, 'sun', 30 * k, 122 * k, 22 * k, '#ffd60a');
  text(c, 'Sunny', 48 * k, 129 * k, { size: 15 * k, weight: 600, font: F });
  text(c, 'H:78° L:58°', 18 * k, 153 * k, { size: 14 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.85)' });
}
function widgetCalendar(c, w, h) {
  const k = w / 170, d = new Date();
  lg(c, 2, 2, w - 4, h - 4, 30 * k);
  text(c, d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(), 18 * k, 32 * k, { size: 13 * k, weight: 700, color: '#ff6961', font: F });
  text(c, String(d.getDate()), 18 * k, 76 * k, { size: 40 * k, weight: 400, font: F });
  fillRR(c, 18 * k, 94 * k, 4 * k, 34 * k, 2 * k, '#5ac8fa');
  text(c, 'Design review', 30 * k, 108 * k, { size: 14 * k, weight: 600, font: F });
  text(c, '10:00 – 11:00 AM', 30 * k, 126 * k, { size: 12.5 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.75)' });
}

function layoutIcons() {
  const group = new THREE.Group(), targets = [];
  const H = 0.84, W = H * 400 / 868, s = H / 868, D = 0.16;
  const P = (px, py) => [(px - 200) * s, (434 - py) * s];
  const ph = new THREE.Group(); group.add(ph);
  ph.add(shell({ W: W + 0.024, H: H + 0.024, R: 0.06, bw: 0.012, D, cap: 0x3a4a68, side: 0x34446a, wall: (c, w, h) => wallpaper(c, w, h, 'blue') }));
  const back = -D + 0.006;
  // Dynamic Island at the glass
  const island = panel(0.11, 0.03, 0.015, null); island.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
  island.position.set(0, H / 2 - 0.035, 0.002); ph.add(island);
  // status bar on the wallpaper
  const sb = tp(W, 0.05, 0, 100, (c, w, h) => statusBar(c, w, h * 0.62, { font: F, size: h * 0.3, pad: w * 0.075 }));
  sb.position.set(0, H / 2 - 0.03, back + 0.004); ph.add(sb);
  // widgets: glass slabs a step off the wallpaper
  for (const [px, draw, label] of [[22, widgetWeather, 'Weather'], [208, widgetCalendar, 'Calendar']]) {
    const ws = 170 * s, [x, y] = P(px + 85, 74 + 85);
    const slab = glassCard(ws, ws, 30 * s, { opacity: 0.12, depth: 0.012 });
    slab.position.set(x, y, -0.085); ph.add(slab);
    const face = tp(ws, ws, 30 * s, 340, draw); face.position.set(x, y, -0.078); ph.add(face);
    const l = label3d(label, { height: 0.014, font: F }); l.position.set(x, y - ws / 2 - 0.013, back + 0.01); ph.add(l);
  }
  // the 4 x 4 grid
  const icons = [];
  const grid = ['photos', 'camera', 'mail', 'clock', 'maps', 'notes', 'store', 'settings', 'fitness', 'wallet', 'tv', 'health', 'home', 'files', 'weather', 'calendar'];
  const is = 64 * s, gap = (400 - 54 - 256) / 3;
  grid.forEach((id, i) => {
    const [x, y] = P(27 + 32 + (i % 4) * (64 + gap), 290 + 32 + Math.floor(i / 4) * 98);
    const ic = appSlab(id, is); ic.userData.size = is;
    ic.position.set(x, y, -0.06); ph.add(ic); icons.push(ic); targets.push(ic);
    const l = label3d(APP_NAMES[id], { height: 0.014, font: F }); l.position.set(x, y - is / 2 - 0.012, back + 0.01); ph.add(l);
  });
  // Search pill, then the floating dock with its icons in front of the glass
  const [sx, sy] = P(200, 710 + 16);
  const pill = tp(100 * s, 32 * s, 16 * s, 80, (c, w, h) => { lg(c, 1, 1, w - 2, h - 2, h / 2); glyph(c, 'search', h * 0.7, h / 2, h * 0.42, '#fff'); text(c, 'Search', w / 2 + h * 0.25, h * 0.66, { size: h * 0.42, weight: 600, font: F, align: 'center' }); });
  pill.position.set(sx, sy, -0.035); ph.add(pill);
  const [dx, dy] = P(200, 868 - 114 + 48);
  const dock = glassCard(372 * s, 96 * s, 40 * s, { opacity: 0.16, depth: 0.018 });
  dock.position.set(dx, dy, -0.01); ph.add(dock);
  ['phone', 'safari', 'messages', 'music'].forEach((id, i) => {
    const ic = appSlab(id, is); ic.userData.size = is;
    ic.position.set(P(34 + 32 + i * (64 + (400 - 68 - 256) / 3), 0)[0], dy, 0.025); ph.add(ic); icons.push(ic); targets.push(ic);
  });
  const fx = iconFx(icons, { lift: 0.07 });
  return {
    group, targets,
    update(dt, t, hit) {
      ph.rotation.y = Math.sin(t * 0.35) * 0.3;
      ph.rotation.x = Math.sin(t * 0.27) * 0.07;
      fx.update(dt, hit);
    },
    click(hit) { fx.kick(hitIcon(hit), 2.4); },
  };
}

// =====================================================================================================
// 2. Phone, reimagined: an icon drum behind the glass, with folders that open as volumes
// =====================================================================================================

function folderFace(ids) {
  return (c, w) => {
    const k = w / 100;
    c.save(); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(0, 0, w, w); c.restore();
    ids.slice(0, 9).forEach((id, i) => appIcon(c, id, (14 + (i % 3) * 25) * k, (14 + Math.floor(i / 3) * 25) * k, 21 * k));
  };
}

function layoutPhone() {
  const group = new THREE.Group(), targets = [];
  const H = 0.86, W = 0.42, D = 0.32;
  const ph = new THREE.Group(); group.add(ph);
  ph.add(shell({ W, H, R: 0.065, bw: 0.013, D, cap: 0xc9cbd0, side: 0x2c3350, wall: (c, w, h) => { blobs(c, w, h, '#05070f', [[0.5, 0.5, 0.7, '#1a2a6a'], [0.2, 0.2, 0.4, '#3a1a5a'], [0.8, 0.85, 0.4, '#0b4a6a']]); } }));
  const island = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0 }));
  island.scale.set(0.11, 0.03, 1); island.position.set(0, H / 2 - 0.04, 0.002); ph.add(island);
  const sb = tp(W - 0.03, 0.05, 0, 100, (c, w, h) => statusBar(c, w, h * 0.62, { font: F, size: h * 0.3, pad: w * 0.06 }));
  sb.position.set(0, H / 2 - 0.035, 0.001); ph.add(sb);
  // the drum: rows of four on a cylinder whose axis runs across the phone
  const ROWS = [
    ['photos', 'camera', 'mail', 'clock'], ['maps', 'notes', 'store', 'settings'], ['fitness', 'wallet', 'folder', 'health'],
    ['home', 'files', 'weather', 'calendar'], ['music', 'tv', 'safari', 'messages'], ['clock', 'maps', 'photos', 'notes'], ['store', 'folder', 'camera', 'mail'],
  ];
  const FOLDER = ['mail', 'notes', 'calendar', 'files', 'clock', 'weather', 'maps', 'store', 'settings'];
  const R = 0.24, STEP = 0.46, CY = 0.03, CZ = -R - 0.02, size = 0.072;
  const drum = new THREE.Group(); drum.position.set(0, CY, CZ); ph.add(drum);
  const rows = [], icons = [];
  ROWS.forEach((ids, r) => {
    const row = new THREE.Group(); drum.add(row); rows.push(row);
    ids.forEach((id, i) => {
      const ic = id === 'folder'
        ? icon3d({ shape: 'squircle', size, depth: size * 0.3, side: 0x8e95a3, px: 192, face: folderFace(FOLDER) })
        : appSlab(id, size);
      if (id === 'folder') { ic.traverse((o) => { o.userData.icon = ic; }); ic.userData.folder = true; }
      ic.userData.size = size;
      ic.position.set((i - 1.5) * 0.092, 0, 0); row.add(ic); icons.push(ic); targets.push(ic);
    });
  });
  const fx = iconFx(icons, { lift: 0.05, scale: 1.15, tilt: 0.4 });
  // fixed dock on the glass, in front
  const dockY = -H / 2 + 0.075;
  const dock = glassCard(W - 0.05, 0.1, 0.045, { opacity: 0.16, depth: 0.016 });
  dock.position.set(0, dockY, 0.01); ph.add(dock);
  const dockIcons = ['phone', 'safari', 'messages', 'music'].map((id, i) => { const ic = appSlab(id, size); ic.userData.size = size; ic.position.set((i - 1.5) * 0.092, dockY, 0.04); ph.add(ic); targets.push(ic); return ic; });
  const dfx = iconFx(dockIcons, { lift: 0.05 });
  // scroll position (in rows), drag to spin, snaps to the nearest row
  const scroll = new Spring(2, 60, 13); let base = 2, dragging = false, idle = 0;
  // the folder volume
  const vol = new THREE.Group(); vol.position.set(0, 0.02, 0.07); vol.visible = false; ph.add(vol);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.2), new THREE.MeshPhysicalMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.14, roughness: 0.05, clearcoat: 1, depthWrite: false }));
  vol.add(cube, new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })));
  const vtitle = label3d('Productivity', { height: 0.024, font: F, weight: 700 }); vtitle.position.set(0, 0.2, 0.0); vol.add(vtitle);
  const volIcons = FOLDER.map((id, i) => {
    const ic = appSlab(id, 0.07); ic.userData.size = 0.07;
    ic.position.set(((i % 3) - 1) * 0.1, (1 - Math.floor(i / 3)) * 0.1, ((i % 2) ? -0.04 : 0.04)); vol.add(ic); targets.push(ic); return ic;
  });
  const vfx = iconFx(volIcons, { lift: 0.04 });
  const open = new Spring(0, 150, 16);
  return {
    group, targets,
    enter() { scroll.v = 0.5; scroll.to = 2; },
    drag(dx, dy) { if (!dragging) { dragging = true; base = scroll.to; } scroll.to = clamp(base + dy * 0.006, 0, ROWS.length - 1); idle = 0; },
    dragEnd() { if (dragging) { dragging = false; scroll.to = Math.round(scroll.to); } },
    update(dt, t, hit) {
      idle += dt;
      if (!dragging && idle > 6) { idle = 0; scroll.to = (Math.round(scroll.to) + 1) % ROWS.length; }
      const sc = scroll.step(dt);
      rows.forEach((row, r) => {
        const a = (r - sc) * STEP;
        row.position.set(0, -Math.sin(a) * R, Math.cos(a) * R);
        row.rotation.x = a;
        row.visible = Math.abs(a) < 1.25;
      });
      fx.update(dt, hit); dfx.update(dt, hit); vfx.update(dt, hit);
      const o = open.step(dt);
      vol.visible = o > 0.02;
      vol.scale.setScalar(Math.max(0.01, o));
      vol.rotation.y = Math.sin(t * 0.6) * 0.35;
      drum.position.z = CZ - 0.06 * clamp(o, 0, 1);
      ph.rotation.y = Math.sin(t * 0.3) * 0.12;
    },
    click(hit) {
      const ic = hitIcon(hit);
      if (open.to > 0.5) { if (ic && volIcons.includes(ic)) vfx.kick(ic); else open.to = 0; return; }
      if (!ic) return;
      if (ic.userData.folder) { open.to = 1; idle = 0; return; }
      // a tap on a row away from the front scrolls it to the front first
      const row = rows.findIndex((r) => r === ic.parent);
      if (row >= 0 && row !== Math.round(scroll.to)) { scroll.to = row; idle = 0; return; }
      (dockIcons.includes(ic) ? dfx : fx).kick(ic);
    },
  };
}

// =====================================================================================================
// 3. Tablet, reimagined: Stage Manager in depth
// =====================================================================================================

function winChrome(c, w, h, k, { dark = false, title = '' } = {}) {
  lg(c, 2, 2, w - 4, h - 4, 34 * k, { tint: dark ? 'rgba(28,30,38,0.92)' : 'rgba(246,247,250,0.94)', rim: 0.85 });
  trafficLights(c, 30 * k, 30 * k, 14 * k);
  if (title) text(c, title, w / 2, 37 * k, { size: 18 * k, weight: 700, font: F, color: dark ? '#fff' : '#111', align: 'center' });
}
const APPWIN = {
  safari: (c, w, h, k) => {
    winChrome(c, w, h, k);
    lg(c, w / 2 - 200 * k, 14 * k, 400 * k, 40 * k, 20 * k, { tint: 'rgba(0,0,0,0.05)', rim: 0.3 });
    text(c, 'displayxr.com', w / 2, 41 * k, { size: 17 * k, weight: 600, font: F, color: '#333', align: 'center' });
    text(c, 'Depth, without the headset.', 40 * k, 120 * k, { size: 38 * k, weight: 800, font: F, color: '#111' });
    text(c, 'Glasses-free 3D for every app and page.', 40 * k, 160 * k, { size: 20 * k, weight: 400, font: F, color: '#555' });
    fillRR(c, 40 * k, 190 * k, w - 80 * k, h - 220 * k, 22 * k, grad(c, 0, 190 * k, w, h, ['#6aa9ff', '#a36bff', '#ff7aa8']));
  },
  notes: (c, w, h, k) => {
    winChrome(c, w, h, k, { title: 'Notes' });
    fillRR(c, 16 * k, 64 * k, 190 * k, h - 80 * k, 18 * k, 'rgba(225,228,236,0.9)');
    ['Spatial UI', 'Prototypes', 'Depth rules', 'Ideas'].forEach((t, i) => { if (!i) fillRR(c, 24 * k, (76 + i * 40) * k, 174 * k, 32 * k, 9 * k, 'rgba(255,204,0,0.4)'); text(c, t, 38 * k, (98 + i * 40) * k, { size: 15 * k, weight: 500, font: F, color: '#222' }); });
    text(c, 'Stage Manager, in depth', 228 * k, 104 * k, { size: 26 * k, weight: 700, font: F, color: '#111' });
    ['The window you use sits at the glass', 'Recent windows wait to the left, further back', 'Tap one to bring it forward', 'The dock floats in front'].forEach((t, i) => {
      c.beginPath(); c.arc(238 * k, (140 + i * 34) * k, 5 * k, 0, Math.PI * 2); c.fillStyle = '#ffcc00'; c.fill();
      text(c, t, 254 * k, (146 + i * 34) * k, { size: 16 * k, weight: 400, font: F, color: '#333' });
    });
  },
  photos: (c, w, h, k) => {
    winChrome(c, w, h, k, { dark: true, title: 'Photos' });
    const hues = [200, 20, 280, 140, 330, 45, 190, 260, 100, 10, 160, 300];
    for (let i = 0; i < 12; i++) {
      const x = 18 * k + (i % 4) * ((w - 36 * k) / 4), y = 64 * k + Math.floor(i / 4) * ((h - 84 * k) / 3), ww = (w - 36 * k) / 4 - 8 * k, hh = (h - 84 * k) / 3 - 8 * k;
      fillRR(c, x, y, ww, hh, 10 * k, grad(c, x, y, x + ww, y + hh, [`hsl(${hues[i]},70%,62%)`, `hsl(${hues[i] + 40},60%,36%)`]));
    }
  },
  music: (c, w, h, k) => {
    winChrome(c, w, h, k, { dark: true, title: 'Music' });
    fillRR(c, 40 * k, 74 * k, 250 * k, 250 * k, 22 * k, grad(c, 0, 74 * k, 0, 324 * k, ['#ff9f0a', '#ff375f', '#6a5cff']));
    text(c, 'Glass Horizons', 320 * k, 130 * k, { size: 30 * k, weight: 800, font: F });
    text(c, 'Aurora Lane', 320 * k, 166 * k, { size: 20 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.7)' });
    fillRR(c, 320 * k, 210 * k, w - 360 * k, 6 * k, 3 * k, 'rgba(255,255,255,0.2)'); fillRR(c, 320 * k, 210 * k, (w - 360 * k) * 0.4, 6 * k, 3 * k, '#fff');
    [['prev', 380], ['pause', 460], ['next', 540]].forEach(([g, x]) => glyph(c, g, x * k, 268 * k, 40 * k, '#fff'));
  },
};

function layoutTablet() {
  const group = new THREE.Group(), targets = [];
  const W = 1.22, H = 0.84, D = 0.22;
  const tab = new THREE.Group(); group.add(tab);
  tab.add(shell({ W, H, R: 0.05, bw: 0.024, D, cap: 0x8e9299, wall: (c, w, h) => wallpaper(c, w, h, 'sea'), side: 0x2f4a52 }));
  const sb = tp(W - 0.06, 0.04, 0, 80, (c, w, h) => statusBar(c, w, h * 0.65, { font: F, size: h * 0.36, pad: w * 0.02 }));
  sb.position.set(0, H / 2 - 0.045, -0.02); tab.add(sb);
  const ORDER = ['notes', 'safari', 'photos', 'music'];
  const wins = ORDER.map((id) => {
    const m = tp(0.66, 0.44, 0.03, 620, (c, w, h) => APPWIN[id](c, w, h, w / 660));
    m.userData = { ...m.userData, kind: 'win', id, p: { x: new Spring(0, 110, 15), y: new Spring(0, 110, 15), z: new Spring(-0.2, 110, 15), s: new Spring(0.4, 110, 15), ry: new Spring(0, 110, 15) } };
    tab.add(m); targets.push(m);
    return m;
  });
  let order = [...ORDER];          // order[0] is on stage, the rest wait in the strip
  let zoom = false;
  const dockY = -H / 2 + 0.07;
  const dock = glassCard(0.58, 0.1, 0.045, { opacity: 0.16, depth: 0.016 });
  dock.position.set(0, dockY, 0.04); tab.add(dock);
  const dockIds = ['messages', 'safari', 'mail', 'photos', 'notes', 'music', 'settings'];
  const dockIcons = dockIds.map((id, i) => { const ic = appSlab(id, 0.068); ic.userData.size = 0.068; ic.position.set((i - 3) * 0.078, dockY, 0.07); tab.add(ic); targets.push(ic); return ic; });
  const dfx = iconFx(dockIcons, { lift: 0.05, scale: 1.2 });
  return {
    group, targets,
    update(dt, t, hit) {
      const hov = hit?.object?.userData.kind === 'win' ? hit.object.userData.id : null;
      wins.forEach((m) => {
        const p = m.userData.p, slot = order.indexOf(m.userData.id), on = hov === m.userData.id;
        if (slot === 0) { p.x.to = 0.1; p.y.to = 0.04; p.z.to = zoom ? 0.05 : -0.02; p.s.to = zoom ? 1.12 : 1; p.ry.to = 0; }
        else { p.x.to = -0.44; p.y.to = 0.22 - (slot - 1) * 0.19; p.z.to = -0.12 - (slot - 1) * 0.05 + (on ? 0.06 : 0); p.s.to = on ? 0.4 : 0.33; p.ry.to = on ? 0.2 : 0.42; }
        m.position.set(p.x.step(dt), p.y.step(dt), p.z.step(dt));
        m.scale.setScalar(p.s.step(dt)); m.rotation.y = p.ry.step(dt);
      });
      dfx.update(dt, hit);
      tab.rotation.y = Math.sin(t * 0.25) * 0.08; tab.rotation.x = Math.sin(t * 0.2) * 0.03;
    },
    click(hit) {
      const o = hit?.object;
      if (o?.userData.kind === 'win') {
        const id = o.userData.id;
        if (order[0] === id) zoom = !zoom;
        else { order = [id, ...order.filter((x) => x !== id)]; zoom = false; }
        return;
      }
      const ic = hitIcon(hit);
      if (!ic) return;
      dfx.kick(ic);
      if (APPWIN[ic.userData.id] && order[0] !== ic.userData.id) { order = [ic.userData.id, ...order.filter((x) => x !== ic.userData.id)]; zoom = false; }
    },
  };
}

// =====================================================================================================
// 4. Monitor, reimagined: a spatial macOS desktop
// =====================================================================================================

const MACWIN = {
  finder: (c, w, h, k) => {
    winChrome(c, w, h, k);
    lg(c, 10 * k, 10 * k, 190 * k, h - 20 * k, 22 * k, { tint: 'rgba(210,218,232,0.85)', rim: 0.95 });
    trafficLights(c, 32 * k, 34 * k, 13 * k);
    ['Favorites', 'AirDrop', 'Recents', 'Applications', 'Desktop', 'Documents', 'Spatial UI'].forEach((t, i) => {
      if (i === 6) fillRR(c, 18 * k, (64 + i * 36) * k, 174 * k, 30 * k, 9 * k, 'rgba(10,132,255,0.25)');
      text(c, t, (i ? 34 : 26) * k, (84 + i * 36) * k, { size: (i ? 15 : 12.5) * k, weight: i ? 500 : 700, font: F, color: i ? '#222' : '#777' });
    });
    ['Glass Layers', 'Island Stack', 'Ornaments', 'Depth Grid', 'Motion', 'Specs'].forEach((t, i) => {
      const x = 230 * k + (i % 3) * 140 * k, y = 70 * k + Math.floor(i / 3) * 150 * k;
      fillRR(c, x, y, 96 * k, 74 * k, 10 * k, grad(c, x, y, x, y + 74 * k, ['#8ccaff', '#3f8ef0']));
      fillRR(c, x, y - 8 * k, 42 * k, 14 * k, 5 * k, '#6fb2ff');
      text(c, t, x + 48 * k, y + 100 * k, { size: 14 * k, weight: 500, font: F, color: '#222', align: 'center' });
    });
  },
  safari: APPWIN.safari,
  notes: APPWIN.notes,
};

function layoutMonitor() {
  const group = new THREE.Group(), targets = [];
  const W = 1.34, H = 0.76, D = 0.24, Y = 0.05;
  const mon = new THREE.Group(); group.add(mon);
  const sh = shell({ W, H, R: 0.018, bw: 0.022, D, cap: 0xd5d7db, side: 0x3c4a5a, wall: (c, w, h) => wallpaper(c, w, h, 'tahoe') });
  sh.position.y = Y; mon.add(sh);
  // stand: an aluminium arm and foot behind and under the display
  const arm = new THREE.Mesh(slabGeo(0.32, 0.22, 0.012, 0.01), metal(0xd5d7db, 0.3, 0.7));
  arm.position.set(0, Y - H / 2 - 0.02, -D * 0.7); arm.rotation.x = -0.25; mon.add(arm);
  const foot = new THREE.Mesh(slabGeo(0.36, 0.26, 0.012, 0.03), metal(0xd5d7db, 0.3, 0.7));
  foot.rotation.x = -Math.PI / 2; foot.position.set(0, Y - H / 2 - 0.11, -D * 0.55); mon.add(foot);
  const [iw, ih] = sh.userData.inner;
  // floating menu bar
  const mb = tp(iw - 0.02, 0.032, 0.012, 64, (c, w, h) => {
    lg(c, 1, 1, w - 2, h - 2, h / 2, { tint: 'rgba(255,255,255,0.12)' });
    text(c, 'Finder    File    Edit    View    Go    Window    Help', h * 0.8, h * 0.68, { size: h * 0.42, weight: 600, font: F });
    text(c, clockStr(), w - h * 0.8, h * 0.68, { size: h * 0.42, weight: 600, font: F, align: 'right' });
  });
  mb.position.set(0, Y + ih / 2 - 0.028, 0.02); mon.add(mb);
  // windows at layered depths: the focused one comes to the front layer
  const LAYERS = [-0.05, -0.13, -0.21];
  const SPOT = { finder: [-0.28, 0.06], safari: [0.18, 0.1], notes: [0.3, -0.06] };
  const wins = Object.keys(MACWIN).map((id) => {
    const m = tp(0.6, 0.4, 0.03, 600, (c, w, h) => MACWIN[id](c, w, h, w / 660));
    m.userData = { ...m.userData, kind: 'win', id, z: new Spring(-0.2, 100, 15), lift: 0 };
    m.position.set(SPOT[id][0], Y + SPOT[id][1], -0.2);
    mon.add(m); targets.push(m);
    return m;
  });
  let order = ['notes', 'safari', 'finder'];
  // the dock: a glass shelf sticking out of the bottom of the screen, icons standing on it
  const shelfY = Y - ih / 2 + 0.035;
  const shelf = glassCard(0.86, 0.13, 0.03, { opacity: 0.2, depth: 0.014 });
  shelf.rotation.x = -Math.PI / 2 + 0.12; shelf.position.set(0, shelfY - 0.01, 0.03); mon.add(shelf);
  const ids = ['files', 'safari', 'messages', 'mail', 'maps', 'photos', 'music', 'tv', 'notes', 'calendar', 'store', 'settings'];
  const dockIcons = ids.map((id, i) => {
    const ic = appSlab(id, 0.058); ic.userData.size = 0.058;
    ic.position.set((i - 5.5) * 0.068, shelfY + 0.028, 0.045); mon.add(ic); targets.push(ic);
    ic.userData.mag = new Spring(1, 200, 18); ic.userData.hop = new Spring(0, 160, 6);
    return ic;
  });
  return {
    group, targets,
    update(dt, t, hit) {
      const hovWin = hit?.object?.userData.kind === 'win' ? hit.object : null;
      wins.forEach((m) => {
        const L = order.indexOf(m.userData.id);
        m.userData.z.to = LAYERS[L] + (hovWin === m ? 0.025 : 0);
        m.position.z = m.userData.z.step(dt);
        m.renderOrder = 3 - L;
      });
      // macOS magnification, but in depth: the hovered icon and its neighbours grow and step forward
      const hi = hitIcon(hit), hx = hi && dockIcons.includes(hi) ? hi.position.x : null;
      dockIcons.forEach((ic) => {
        const d = hx === null ? 9 : Math.abs(ic.position.x - hx) / 0.068;
        ic.userData.mag.to = 1 + 0.6 * Math.max(0, 1 - d / 2.2);
        const m = ic.userData.mag.step(dt);
        ic.scale.setScalar(m);
        ic.position.y = shelfY + 0.028 * m + Math.abs(ic.userData.hop.step(dt));
        ic.position.z = 0.045 + (m - 1) * 0.08;
      });
      mon.rotation.y = Math.sin(t * 0.22) * 0.1;
    },
    click(hit) {
      const o = hit?.object;
      if (o?.userData.kind === 'win') { const id = o.userData.id; order = [id, ...order.filter((x) => x !== id)]; return; }
      const ic = hitIcon(hit);
      if (ic && dockIcons.includes(ic)) {
        ic.userData.hop.vel += 1.6;
        const id = ic.userData.id;
        if (MACWIN[id]) order = [id, ...order.filter((x) => x !== id)];
      }
    },
  };
}

// =====================================================================================================
// 5. Home View, reimagined: tvOS in depth on the living-room TV
// =====================================================================================================

const SHOWS = [
  { title: 'HORIZON LINE', sub: 'New episode Friday', c: ['#1a2f5a', '#5a2a6e', '#c04a4a'], sun: '#ffbe78' },
  { title: 'DEEP FIELD', sub: 'Season 2 now streaming', c: ['#020a1a', '#0d2a5a', '#2a7bff'], sun: '#b8d8ff' },
  { title: 'SALT & STONE', sub: 'Original film', c: ['#2a1a0a', '#8a4a1a', '#f0b27a'], sun: '#fff1c2' },
  { title: 'NORTHBOUND', sub: 'Live sports · 7 PM', c: ['#06202a', '#16a6a0', '#9ef0d0'], sun: '#ffffff' },
  { title: 'GLASS CITY', sub: 'Top chart', c: ['#1b0f2a', '#c83cff', '#ff7a45'], sun: '#ffd0f0' },
];
const HOME_APPS = ['tv', 'music', 'photos', 'fitness', 'store', 'settings'];
const APP_HERO = { tv: 0, music: 4, photos: 2, fitness: 3, store: 1, settings: 1 };

function heroBack(show) {
  return (c, w, h) => {
    c.fillStyle = grad(c, 0, 0, w, h, show.c); c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w * 0.68, h * 0.3, 0, w * 0.68, h * 0.3, h * 0.5);
    g.addColorStop(0, show.sun); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  };
}
function heroMid(c, w, h) {
  // a silhouette ridge, its own depth layer
  c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(5,8,18,0.85)'; c.beginPath(); c.moveTo(0, h);
  for (let x = 0; x <= w; x += w / 24) c.lineTo(x, h * (0.62 + 0.12 * Math.sin(x / w * 7) + 0.06 * Math.sin(x / w * 19)));
  c.lineTo(w, h); c.closePath(); c.fill();
}
function heroTitle(show) {
  return (c, w, h) => {
    const k = h / 300;
    text(c, show.title, 20 * k, 120 * k, { size: 64 * k, weight: 800, font: F, spacing: 5 * k });
    text(c, show.sub, 22 * k, 160 * k, { size: 22 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.85)' });
    lg(c, 20 * k, 186 * k, 190 * k, 54 * k, 27 * k, { tint: 'rgba(255,255,255,0.92)' });
    text(c, 'Play', 115 * k, 221 * k, { size: 22 * k, weight: 700, font: F, color: '#111', align: 'center' });
  };
}

function layoutHome() {
  const group = new THREE.Group(), targets = [];
  const W = 1.5, H = 0.84, D = 0.26;
  const tv = new THREE.Group(); group.add(tv);
  const sh = shell({ W, H, R: 0.012, bw: 0.012, D, cap: 0x1b1c20, side: 0x2a2440 });
  tv.add(sh);
  const [iw, ih] = sh.userData.inner;
  let showI = 0;
  // the hero: three parallax layers (sky, ridge, title) at different depths
  const back = tp(iw, ih, 0.004, 700, (c, w, h) => heroBack(SHOWS[showI])(c, w, h), { transparent: false });
  back.position.z = -D + 0.004; tv.add(back);
  const mid = tp(iw, ih * 0.7, 0, 500, heroMid); mid.position.set(0, -ih * 0.15, -0.18); tv.add(mid);
  const title = tp(0.62, 0.3, 0, 300, (c, w, h) => heroTitle(SHOWS[showI])(c, w, h)); title.position.set(-0.4, 0.12, -0.14); tv.add(title);
  // the glass tab bar floats in front
  const tabs = tp(0.62, 0.06, 0.03, 90, (c, w, h) => {
    const k = h / 60; lg(c, 1, 1, w - 2, h - 2, h / 2);
    ['Search', 'Home', 'Apple TV', 'Movies', 'Library'].forEach((t, i) => {
      const x = w * (0.1 + i * 0.2);
      if (i === 1) fillRR(c, x - 50 * k, 8 * k, 100 * k, 44 * k, 22 * k, 'rgba(255,255,255,0.92)');
      text(c, t, x, 38 * k, { size: 19 * k, weight: 600, font: F, color: i === 1 ? '#111' : '#fff', align: 'center' });
    });
  });
  tabs.position.set(0, ih / 2 - 0.06, 0.03); tv.add(tabs);
  // round app icons on a curved arc: the centre is nearest, the ends curve back
  const appY = -0.1, icons = HOME_APPS.map((id, i) => {
    const ic = appSlab(id, 0.11, { round: true }); ic.userData.size = 0.11;
    const x = (i - 2.5) * 0.19; ic.position.set(x, appY, -0.02 - x * x * 0.3);
    tv.add(ic); targets.push(ic); return ic;
  });
  const fx = iconFx(icons, { lift: 0.1, scale: 1.25, tilt: 0.35 });
  // the content shelf: layered posters whose layers separate when focused (tvOS parallax, but real)
  const posters = SHOWS.map((show, i) => {
    const p = new THREE.Group(); p.position.set((i - 2) * 0.27, -0.3, -0.03); tv.add(p);
    const bg = tp(0.24, 0.135, 0.012, 160, heroBack(show), { transparent: false });
    const ridge = tp(0.24, 0.09, 0, 120, heroMid); ridge.position.y = -0.022;
    const name = tp(0.22, 0.04, 0, 60, (c, w, h) => text(c, show.title, 8, h * 0.72, { size: h * 0.55, weight: 800, font: F }));
    name.position.y = 0.035;
    p.add(bg, ridge, name);
    for (const m of [bg, ridge, name]) { m.userData.poster = p; targets.push(m); }
    p.userData = { i, layers: [bg, ridge, name], sep: new Spring(0, 160, 16), rx: 0, ry: 0 };
    return p;
  });
  let heroSep = 0;
  const _p = new THREE.Vector3();
  const setShow = (i) => { if (i === showI) return; showI = i; back.userData.tex.redraw(); title.userData.tex.redraw(); };
  return {
    group, targets,
    update(dt, t, hit) {
      fx.update(dt, hit);
      const hp = hit?.object?.userData.poster;
      posters.forEach((p) => {
        const u = p.userData, on = hp === p;
        u.sep.to = on ? 1 : 0;
        const s = u.sep.step(dt);
        u.layers[1].position.z = 0.004 + 0.02 * s; u.layers[2].position.z = 0.008 + 0.04 * s;
        p.position.z = -0.03 + 0.05 * s; p.scale.setScalar(1 + 0.12 * s);
        let rx = 0, ry = 0;
        if (on) { p.worldToLocal(_p.copy(hit.point)); ry = clamp(_p.x / 0.12, -1, 1) * 0.35; rx = -clamp(_p.y / 0.07, -1, 1) * 0.35; }
        u.rx = damp(u.rx, rx, 8, dt); u.ry = damp(u.ry, ry, 8, dt); p.rotation.set(u.rx, u.ry, 0);
      });
      // the hero layers breathe apart slowly so its depth always reads
      heroSep = 0.5 + 0.5 * Math.sin(t * 0.5);
      mid.position.z = -0.19 + 0.03 * heroSep; title.position.z = -0.11 + 0.05 * heroSep;
      tv.rotation.y = Math.sin(t * 0.2) * 0.06;
    },
    click(hit) {
      const ic = hitIcon(hit);
      if (ic) { fx.kick(ic, 2); setShow(APP_HERO[ic.userData.id] ?? 0); return; }
      const p = hit?.object?.userData.poster;
      if (p) setShow(p.userData.i);
    },
  };
}

// =====================================================================================================
export const layouts = [
  {
    key: 'icons', name: 'App grid in 3D', short: '3D icons', tagline: "Today's iPhone 18 Pro home screen, with every icon made solid",
    blurb: 'The same Home Screen you use today, in its usual layout: status bar, two widgets, a four-column grid, the Search pill and the dock. Each piece is now a solid object at its own depth. The wallpaper sits behind the screen, widgets are glass slabs just off it, icons stand out as thick glass-edged tiles, and the dock floats in front of the glass.',
    points: ['Wallpaper at the back of the phone, widgets one step forward', 'Every app icon is a solid squircle with the icon art on its face', 'The dock is a glass shelf in front of the screen'],
    how: 'Hover an icon to lift it and tilt it toward you. Click to bounce it like a launch.',
    hint: 'Hover an icon · click to launch',
    build: layoutIcons,
  },
  {
    key: 'phone', name: 'Icon drum', short: 'Phone', tagline: 'A phone home screen that scrolls on a drum behind the glass',
    blurb: 'Instead of flat pages, apps sit on a drum that turns inside the phone. The row you are using comes up to the glass while the rows above and below curve away into the dark. Folders are no longer small boxes: they open as a glass volume in front of the screen with their apps floating inside.',
    points: ['Drag up or down to turn the drum; it snaps to a row', 'The front row sits at the glass, others curve back', 'Folders open as 3D volumes in front of the phone', 'The dock stays on the glass, ahead of everything'],
    how: 'Drag up and down to spin the drum. Click a far row to bring it forward, click the folder to open it, click anywhere to close it.',
    hint: 'Drag to spin · click the folder',
    build: layoutPhone,
  },
  {
    key: 'tablet', name: 'Stage Manager in depth', short: 'Tablet', tagline: 'Windows wait behind the one you are using',
    blurb: "iPad's Stage Manager keeps your recent windows in a strip on the left. On a 3D iPad that strip can go back into the screen: the window you are using sits at the glass, recent windows wait further back and turned toward you, and the dock hovers in front.",
    points: ['The window on stage sits at the glass', 'Recent windows stack to the left, each one further back', 'The dock floats in front with solid icons'],
    how: 'Click a window in the strip to bring it forward. Click the window on stage to zoom it toward you. Dock icons open their windows.',
    hint: 'Click a waiting window · click the dock',
    build: layoutTablet,
  },
  {
    key: 'monitor', name: 'Spatial desktop', short: 'Monitor', tagline: 'A Mac desktop with real layers, on a 27-inch display',
    blurb: 'On a desk monitor, windows stack at real depths, so the frontmost window is literally in front. The menu bar floats just ahead of the glass, and the Dock becomes a glass shelf that sticks out of the bottom of the screen with its icons standing on it. Magnification grows icons toward you as well as larger.',
    points: ['The wallpaper sits at the back of the display', 'Windows sit on three depth layers; focus brings one forward', 'The menu bar floats in front of the glass', 'The Dock is a shelf with standing icons that magnify toward you'],
    how: 'Click a window to focus it. Move along the Dock to magnify, click an icon to bounce it and bring its window forward.',
    hint: 'Click a window · sweep the Dock',
    build: layoutMonitor,
  },
  {
    key: 'home', name: 'Home View on the TV', short: 'Home view', tagline: 'tvOS layered artwork, made real on the living-room screen',
    blurb: 'tvOS already builds icons and posters from layers that shift when you focus them. On a glasses-free 3D TV the layers can separate for real: the hero is a sky, a ridge and a title at three depths, app icons sit on a curved arc, and a focused poster pulls apart toward you.',
    points: ['Hero art in three parallax layers inside the TV', 'Round app icons on an arc, nearest in the middle', 'Posters pull apart into their layers when focused', 'The glass tab bar floats in front'],
    how: 'Hover an app or poster to focus it. Click an app or a poster to change the hero.',
    hint: 'Hover to focus · click to change the hero',
    build: layoutHome,
  },
];
