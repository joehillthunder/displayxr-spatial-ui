// Samsung: today's One UI 9 home screen rebuilt in 3D, and four reimagined spatial interfaces
// (phone, tablet, monitor, home TV) for a glasses-free 3D screen of each size.
//
// samsung.js imports this file and this file imports drawing helpers from samsung.js. That cycle is safe
// because the helpers are function declarations (hoisted) and constants used only inside build().

import * as THREE from 'three';
import {
  canvasTex, panel, slabGeo, screenGeo, rrShape, rr, fillRR, strokeRR, text, grad, blobs,
  clockStr, dateStr, statusBar, glyph, FONT, Spring, damp, clamp, lerp,
} from '../kit.js';
import { icon3d, label3d, gridPositions } from '../icons3d.js';
import { icon, wallpaper, nowBar, window1, lines } from './samsung.js';

const F = FONT.samsung;
const BLUE = '#3e82ff';

// One UI app palette (name, glyph, gradient). A superset of samsung.js APPS with a few extras.
const APP = {
  Phone: ['phone', ['#4fdc78', '#1fae4f']], Messages: ['message', ['#62a8ff', '#2f6cf5']],
  Internet: ['search', ['#9a7bff', '#5b3df0']], Camera: ['camera', ['#ff7d90', '#e8344f']],
  Gallery: ['photos', ['#ff94b8', '#f0446f']], Settings: ['gear', ['#a3abb9', '#677083']],
  Calendar: ['calendar', ['#55d8b8', '#14a585']], Clock: ['clock', ['#6e7aff', '#3442d8']],
  Notes: ['note', ['#ffbe55', '#f68a14']], Health: ['heart', ['#5bdfac', '#18b07a']],
  SmartThings: ['home', ['#55b0ff', '#1876e8']], Store: ['store', ['#ff7cb8', '#d6338a']],
  Weather: ['sun', ['#ffd257', '#f39b12']], Music: ['music', ['#ff8a6c', '#ea4a2a']],
  Wallet: ['wallet', ['#4a5a80', '#1d2847']], Maps: ['map', ['#62cc74', '#2e9c45']],
  'Galaxy AI': ['sparkle', ['#a68bff', '#3e82ff']], 'My Files': ['note', ['#ffcf5a', '#f5a400']],
  Contacts: ['person', ['#ff9a5a', '#f0612a']], Recorder: ['mic', ['#ff6b6b', '#e0303a']],
  'TV Plus': ['tv', ['#3e82ff', '#1428a0']], 'Gaming Hub': ['play', ['#9a7bff', '#4b2fd6']],
  Workspace: ['grid', ['#4fdc9a', '#1a9a6a']], 'Art Store': ['photos', ['#ffb36b', '#e0603a']],
};
const appOf = (n) => APP[n] || APP.Settings;
// Names samsung.js icon() knows how to draw.
const SAMSUNG_APPS = ['Phone', 'Messages', 'Internet', 'Camera', 'Gallery', 'Settings', 'Calendar', 'Clock', 'Notes', 'Health', 'SmartThings', 'Store', 'Weather', 'Music', 'Wallet', 'Maps'];

// ---- small builders ------------------------------------------------------------------------------------
function owner(o, key) { for (; o; o = o.parent) if (o.userData && o.userData[key] !== undefined) return o; return null; }

function texPanel(w, h, r, px, draw, opts = {}) {
  const tex = canvasTex(Math.max(8, Math.round(px * w / h)), px, draw);
  const m = panel(w, h, r, tex, { transparent: true, ...opts });
  m.userData.tex = tex;
  return m;
}

// A device "shadow box": the bezel at the glass, inner walls running back to the screen plane at -back.
function frameBox({ w, h, r, bezel = 0.014, back = 0.13, front = 0.01, color = 0x3b3e46, rough = 0.3 }) {
  const g = new THREE.Group();
  const outer = rrShape(w, h, r);
  outer.holes.push(new THREE.Path(rrShape(w - 2 * bezel, h - 2 * bezel, Math.max(0.004, r - bezel)).getPoints(64)));
  const geo = new THREE.ExtrudeGeometry(outer, { depth: back + front, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 16 });
  geo.translate(0, 0, -back);
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: rough })));
  return { group: g, iw: w - 2 * bezel, ih: h - 2 * bezel, ir: Math.max(0.004, r - bezel), back };
}

// Frosted glass slab with a transparent painted face (One UI's blurred cards).
function frost(w, h, r, tex, { depth = 0.01, opacity = 0.16, tint = 0xffffff } = {}) {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(slabGeo(w, h, depth, r, depth * 0.4), new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity, roughness: 0.35, clearcoat: 1, depthWrite: false }));
  slab.renderOrder = 1; g.add(slab);
  if (tex) { const f = panel(w, h, r, tex, { transparent: true }); f.position.z = depth / 2 + 0.0008; f.renderOrder = 2; g.add(f); g.userData.face = f; }
  g.userData.slab = slab;
  return g;
}

// Solid dark slab with a painted face (cards, tiles, windows).
function slabCard(w, h, r, tex, { depth = 0.012, color = 0x12141b, transparent = false } = {}) {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(slabGeo(w, h, depth, r, depth * 0.4), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.25 }));
  g.add(slab);
  const f = panel(w, h, r, tex, { transparent }); f.position.z = depth / 2 + 0.0008; g.add(f);
  g.userData.face = f; g.userData.slab = slab;
  return g;
}

// One UI app icon as a solid squircle.
function oneIcon(name, size = 0.066, depth = 0.022) {
  const [g, cols] = appOf(name);
  return icon3d({
    shape: 'samsung', size, depth, side: new THREE.Color(cols[1]).getHex(),
    face: (ctx, w, h) => {
      ctx.fillStyle = grad(ctx, 0, 0, 0, h, cols); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = grad(ctx, 0, 0, 0, h * 0.5, ['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']); ctx.fillRect(0, 0, w, h * 0.5);
      glyph(ctx, g, w / 2, h / 2, w * 0.52, '#fff');
    },
  });
}

function label(str, height = 0.016, color = '#fff') { return label3d(str, { height, font: F, weight: 600, color }); }

// A thin leader line + label for callouts.
function callout(title, sub, { lineLen = 0.06 } = {}) {
  const g = new THREE.Group();
  const m = texPanel(0.44, 0.08, 0, 160, (c, w, h) => {
    const k = h / 64;
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(lineLen / 0.44 * w, h / 2); c.stroke();
    c.beginPath(); c.arc(4 * k, h / 2, 4 * k, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
    const x = lineLen / 0.44 * w + 10 * k;
    text(c, title, x, 28 * k, { size: 23 * k, weight: 700, font: F });
    text(c, sub, x, 52 * k, { size: 17 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.68)' });
  });
  m.position.x = 0.22; g.add(m);
  return g;
}

// App window art (One UI light window), with a body per app.
function appBody(name) {
  return (ctx, x, y, w, h, u) => {
    if (name === 'Gallery') {
      for (let i = 0; i < 12; i++) { const cx = x + 16 * u + (i % 3) * ((w - 32 * u) / 3), cy = y + 14 * u + Math.floor(i / 3) * 98 * u; fillRR(ctx, cx, cy, (w - 44 * u) / 3, 90 * u, 10 * u, grad(ctx, cx, cy, cx + 100 * u, cy + 90 * u, [`hsl(${(i * 47) % 360},70%,64%)`, `hsl(${(i * 47 + 50) % 360},60%,40%)`])); }
    } else if (name === 'Internet') {
      fillRR(ctx, x + 16 * u, y + 10 * u, w - 32 * u, 34 * u, 17 * u, '#e8eaf2');
      text(ctx, 'news.example.com', x + 34 * u, y + 33 * u, { size: 16 * u, color: '#555', font: F });
      fillRR(ctx, x + 16 * u, y + 56 * u, w - 32 * u, h * 0.36, 14 * u, grad(ctx, 0, y, w, y + h * 0.4, ['#6e8bff', '#b16eff']));
      text(ctx, 'Foldables at eight', x + 16 * u, y + 90 * u + h * 0.36, { size: 26 * u, weight: 700, color: '#141821', font: F });
      lines(ctx, x + 16 * u, y + 110 * u + h * 0.36, w - 32 * u, 5, u);
    } else if (name === 'Notes') {
      text(ctx, 'Trip ideas', x + 20 * u, y + 40 * u, { size: 26 * u, weight: 700, color: '#141821', font: F });
      ['Kyoto in November', 'Rail pass, 7 days', 'Book the ryokan', 'Pack the Fold8'].forEach((s, i) => {
        ctx.beginPath(); ctx.arc(x + 30 * u, y + (78 + i * 40) * u, 9 * u, 0, Math.PI * 2); ctx.strokeStyle = '#f68a14'; ctx.lineWidth = 3 * u; ctx.stroke();
        text(ctx, s, x + 50 * u, y + (85 + i * 40) * u, { size: 19 * u, color: '#333', font: F });
      });
    } else if (name === 'Messages') {
      [['Mina', 'Landing at 6:40'], ['You', "I'll be at gate B"], ['Mina', 'Perfect, see you!']].forEach(([who, s], i) => {
        const me = who === 'You', bw = 230 * u;
        fillRR(ctx, me ? x + w - bw - 20 * u : x + 20 * u, y + (20 + i * 62) * u, bw, 48 * u, 24 * u, me ? BLUE : '#e7e9f0');
        text(ctx, s, (me ? x + w - bw - 20 * u : x + 20 * u) + 20 * u, y + (50 + i * 62) * u, { size: 18 * u, color: me ? '#fff' : '#141821', font: F });
      });
    } else if (name === 'Calendar') {
      for (let i = 0; i < 35; i++) {
        const cx = x + 20 * u + (i % 7) * ((w - 40 * u) / 7), cy = y + 20 * u + Math.floor(i / 7) * 46 * u;
        if (i === 16) { ctx.beginPath(); ctx.arc(cx + 18 * u, cy + 14 * u, 18 * u, 0, Math.PI * 2); ctx.fillStyle = '#14a585'; ctx.fill(); }
        text(ctx, String(((i + 27) % 31) + 1), cx + 18 * u, cy + 21 * u, { size: 17 * u, color: i === 16 ? '#fff' : '#333', align: 'center', font: F });
      }
    } else {
      ['Connections', 'Display', 'Galaxy AI', 'Battery', 'Security'].forEach((s, i) => {
        fillRR(ctx, x + 16 * u, y + (14 + i * 56) * u, w - 32 * u, 48 * u, 16 * u, '#eceef4');
        text(ctx, s, x + 36 * u, y + (45 + i * 56) * u, { size: 18 * u, weight: 600, color: '#141821', font: F });
      });
    }
  };
}
function appWindow(name, title = name) {
  return (ctx, w, h) => {
    const u = w / 520;
    window1(ctx, 4 * u, 4 * u, w - 8 * u, h - 8 * u, title, SAMSUNG_APPS.includes(name) ? name : 'Settings', u, (x, y, ww, hh) => appBody(name)(ctx, x, y, ww, hh, u));
  };
}

// =====================================================================================================
// 1. App grid in 3D: the One UI 9 home screen on a Galaxy S26 Ultra, every layer at its own depth.
// =====================================================================================================
function iconGrid() {
  const group = new THREE.Group(), targets = [];
  const root = new THREE.Group(); group.add(root);
  const W = 0.405, H = 0.86;
  const box = frameBox({ w: W, h: H, r: 0.045, bezel: 0.012, back: 0.12, color: 0x4b4f58 });
  root.add(box.group);
  const { iw, ih, ir } = box;

  const wall = panel(iw, ih, ir, canvasTex(540, 1150, (c, w, h) => wallpaper(c, w, h, 0)));
  wall.position.z = -0.118; root.add(wall);
  const sbar = texPanel(iw, 0.04, 0, 64, (c, w, h) => statusBar(c, w, h * 0.7, { size: h * 0.42, font: F, pad: h * 0.6 }));
  sbar.position.set(0, ih / 2 - 0.025, -0.03); root.add(sbar);
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.008, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  cam.position.set(0, ih / 2 - 0.022, 0.004); root.add(cam);

  // weather + calendar widget, frosted, just behind the glass
  const widget = frost(iw * 0.9, 0.15, 0.032, canvasTex(600, 250, (c, w, h) => {
    const u = h / 250;
    glyph(c, 'cloud', 60 * u, 70 * u, 70 * u, '#fff'); glyph(c, 'sun', 92 * u, 52 * u, 40 * u, '#ffd257');
    text(c, '64°', 30 * u, 175 * u, { size: 78 * u, weight: 600, font: F });
    text(c, 'San Jose', 30 * u, 220 * u, { size: 24 * u, weight: 600, font: F, color: 'rgba(255,255,255,0.85)' });
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(w / 2, 30 * u, 2 * u, h - 60 * u);
    text(c, new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), w / 2 + 34 * u, 70 * u, { size: 26 * u, weight: 700, font: F, color: '#9fc0ff' });
    text(c, String(new Date().getDate()), w / 2 + 34 * u, 150 * u, { size: 72 * u, weight: 700, font: F });
    text(c, 'Design review · 10:00', w / 2 + 34 * u, 205 * u, { size: 22 * u, weight: 500, font: F, color: 'rgba(255,255,255,0.8)' });
  }), { depth: 0.012, opacity: 0.14 });
  widget.position.set(0, ih / 2 - 0.13, -0.05); root.add(widget);

  // 4 x 4 grid of solid icons with labels
  const GRID = ['Gallery', 'Calendar', 'Clock', 'Settings', 'Notes', 'Health', 'SmartThings', 'Store', 'Weather', 'Music', 'Wallet', 'Maps', 'Galaxy AI', 'My Files', 'Contacts', 'Recorder'];
  const DOCK = ['Phone', 'Messages', 'Internet', 'Camera'];
  const icons = [];
  const S = 0.064, dx = iw * 0.235, dy = 0.104;
  const addIcon = (name, x, y, z, withLabel) => {
    const holder = new THREE.Group(); holder.position.set(x, y, z);
    const ic = oneIcon(name, S, 0.022); holder.add(ic);
    if (withLabel) { const l = label(name.length > 9 ? name.slice(0, 9) + '…' : name, 0.015); l.position.set(0, -S * 0.72, 0.012); holder.add(l); }
    holder.userData = { icon: icons.length, name, home: new THREE.Vector3(x, y, z), z: new Spring(z, 200, 18), tilt: new Spring(0, 180, 16), sc: new Spring(1, 260, 14) };
    root.add(holder); targets.push(ic); icons.push(holder);
  };
  gridPositions(4, 4, dx, dy, 0, -0.03).forEach(([x, y], i) => addIcon(GRID[i], x, y, 0.012, true));
  // page dots (behind) and the dock (forward, on a frosted shelf)
  const dots = texPanel(0.06, 0.012, 0, 32, (c, w, h) => { for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(w / 2 + (i - 1) * h * 1.6, h / 2, h * 0.32, 0, Math.PI * 2); c.fillStyle = i ? 'rgba(255,255,255,0.45)' : '#fff'; c.fill(); } });
  dots.position.set(0, -0.255, -0.02); root.add(dots);
  const shelf = frost(iw * 0.94, 0.1, 0.04, null, { depth: 0.012, opacity: 0.12 });
  shelf.position.set(0, -0.335, 0.03); root.add(shelf);
  DOCK.forEach((n, i) => addIcon(n, (i - 1.5) * dx, -0.335, 0.055, false));

  // the app window that springs out of a tapped icon
  let openName = null, openFrom = null;
  const sheetTex = canvasTex(520, 760, (c, w, h) => { if (openName) appWindow(openName)(c, w, h); });
  const sheet = panel(iw * 1.05, iw * 1.05 * 760 / 520, 0.03, sheetTex, { transparent: true });
  sheet.visible = false; root.add(sheet);
  const open = new Spring(0, 150, 17);

  return {
    group, targets,
    update(dt, t, hit) {
      root.rotation.y = Math.sin(t * 0.35) * 0.2; root.rotation.x = Math.sin(t * 0.27) * 0.04;
      const hov = owner(hit?.object, 'icon');
      for (const h of icons) {
        const u = h.userData, on = h === hov && !openName;
        u.z.to = u.home.z + (on ? 0.07 : 0); u.tilt.to = on ? -0.35 : 0;
        h.position.z = u.z.step(dt); h.rotation.x = u.tilt.step(dt); h.rotation.y = on ? Math.sin(t * 4) * 0.12 : damp(h.rotation.y, 0, 8, dt);
        h.scale.setScalar(u.sc.step(dt));
      }
      const o = open.step(dt);
      sheet.visible = o > 0.01;
      if (sheet.visible && openFrom) {
        sheet.position.set(openFrom.x * (1 - o), openFrom.y * (1 - o), openFrom.z + (0.13 - openFrom.z) * o);
        sheet.scale.setScalar(0.12 + 0.88 * o);
        sheet.material.opacity = clamp(o * 1.5, 0, 1);
      }
    },
    click(hit) {
      if (openName) { openName = null; open.to = 0; return; }
      const h = owner(hit?.object, 'icon');
      if (!h) return;
      h.userData.sc.vel = -4; // bounce
      openName = h.userData.name; openFrom = h.position.clone(); sheetTex.redraw(); open.v = 0; open.to = 1;
    },
  };
}

// =====================================================================================================
// 2. Phone · One UI Depth: the viewing area recedes, the interaction area ramps up to your thumb.
// =====================================================================================================
function phoneDepth() {
  const group = new THREE.Group(), targets = [];
  const root = new THREE.Group(); root.position.x = -0.2; group.add(root);
  const W = 0.42, H = 0.86;
  const box = frameBox({ w: W, h: H, r: 0.046, bezel: 0.012, back: 0.14, color: 0x2c3140 });
  root.add(box.group);
  const { iw, ih, ir } = box;
  const bg = panel(iw, ih, ir, canvasTex(270, 560, (c, w, h) => { c.fillStyle = grad(c, 0, 0, 0, h, ['#0d1020', '#06070b']); c.fillRect(0, 0, w, h); }));
  bg.position.z = -0.138; root.add(bg);
  // viewing area: One UI's big title, set deep behind the glass
  const title = texPanel(iw * 0.92, 0.3, 0, 400, (c, w, h) => {
    const u = h / 400;
    statusBar(c, w, 34 * u, { size: 22 * u, font: F, pad: 20 * u });
    text(c, 'Messages', w / 2, 230 * u, { size: 92 * u, weight: 700, font: F, align: 'center' });
    text(c, '3 unread messages', w / 2, 290 * u, { size: 32 * u, weight: 500, font: F, align: 'center', color: 'rgba(255,255,255,0.65)' });
  });
  title.position.set(0, ih / 2 - 0.16, -0.1); root.add(title);

  // conversation rows on a ramp: the further down (nearer the thumb), the nearer the viewer
  const PEOPLE = [['Mina', 'Landing at 6:40', '#ff9a5a'], ['Design team', 'Depth v3 is up', '#3e82ff'], ['Jae', 'Climbing Saturday?', '#4fdc78'], ['Mom', 'Call me tonight', '#ff7cb8'], ['Alex', 'Sent you the photos', '#9a7bff'], ['Galaxy AI', 'Your Now Brief is ready', '#55d8b8'], ['Sam', 'Lunch at 1?', '#ffbe55'], ['Priya', 'The fold looks great', '#62a8ff'], ['Theo', 'Running late, 5 min', '#ff6b6b'], ['Kai', 'Movie tonight?', '#5bdfac']];
  const RH = 0.072, PITCH = 0.084;
  const rows = PEOPLE.map(([n, m, col], i) => {
    const tex = canvasTex(520, 90, (c, w, h) => {
      const u = h / 90;
      c.beginPath(); c.arc(46 * u, h / 2, 28 * u, 0, Math.PI * 2); c.fillStyle = col; c.fill();
      text(c, n[0], 46 * u, h / 2 + 10 * u, { size: 28 * u, weight: 700, align: 'center', font: F });
      text(c, n, 92 * u, 38 * u, { size: 25 * u, weight: 700, font: F });
      text(c, m, 92 * u, 68 * u, { size: 20 * u, weight: 500, font: F, color: 'rgba(255,255,255,0.65)' });
      text(c, `${(i * 7 + 2) % 12 + 1}:${String((i * 13) % 60).padStart(2, '0')}`, w - 24 * u, 38 * u, { size: 17 * u, font: F, align: 'right', color: 'rgba(255,255,255,0.5)' });
      if (i < 3) { c.beginPath(); c.arc(w - 36 * u, 64 * u, 11 * u, 0, Math.PI * 2); c.fillStyle = BLUE; c.fill(); text(c, '1', w - 36 * u, 70 * u, { size: 15 * u, weight: 700, align: 'center', font: F }); }
    });
    const card = slabCard(iw * 0.92, RH, 0.026, tex, { depth: 0.01, color: 0x1a1d28 });
    card.userData = { ...card.userData, row: i, name: n, lift: new Spring(0, 200, 18) };
    root.add(card); targets.push(card);
    return card;
  });
  const TOP = 0.04, BOTTOM = -0.24;           // the interaction area on screen
  const zAt = (y) => lerp(-0.075, 0.07, clamp((TOP - y) / (TOP - BOTTOM), 0, 1));
  const scroll = new Spring(0, 60, 14);
  let dragFrom = null, idle = 0;

  // Now Bar: a solid pill floating above the bottom of the screen
  const KINDS = ['music', 'timer', 'ride', 'workout'];
  let kind = 0;
  const pillW = iw * 0.86, pillH = 0.074;
  const pillTex = canvasTex(620, Math.round(620 * pillH / pillW), (c, w, h, t) => { c.clearRect(0, 0, w, h); nowBar(c, 0, 0, w, h, KINDS[kind], t); });
  const pill = new THREE.Group();
  const pg = new THREE.ExtrudeGeometry(rrShape(pillW, pillH, pillH / 2), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 20 });
  pg.translate(0, 0, -0.01);
  pill.add(new THREE.Mesh(pg, new THREE.MeshPhysicalMaterial({ color: 0x10121a, roughness: 0.25, clearcoat: 1 })));
  const pf = panel(pillW, pillH, pillH / 2, pillTex, { transparent: true }); pf.position.z = 0.0065; pill.add(pf);
  pill.position.set(0, -ih / 2 + 0.06, 0.13); pill.userData.nowbar = true;
  root.add(pill); targets.push(pill);
  const pillLift = new Spring(0.13, 200, 18);
  // compose button
  const fab = icon3d({ shape: 'circle', size: 0.06, depth: 0.02, side: 0x2f6cf5, face: (c, w, h) => { c.fillStyle = BLUE; c.fillRect(0, 0, w, h); glyph(c, 'message', w / 2, h / 2, w * 0.5, '#fff'); } });
  fab.position.set(iw / 2 - 0.05, -ih / 2 + 0.125, 0.1); fab.userData.fab = true; root.add(fab); targets.push(fab);

  // conversation sheet
  let openName = null;
  const sheetTex = canvasTex(520, 760, (c, w, h) => { if (openName) appWindow('Messages', openName)(c, w, h); });
  const sheet = panel(iw * 0.98, iw * 0.98 * 760 / 520, 0.03, sheetTex, { transparent: true });
  sheet.visible = false; sheet.position.set(0, 0, 0.15); root.add(sheet);
  const open = new Spring(0, 150, 17);

  // callouts to the right of the phone
  const notes = [['Viewing area', 'big title, set back behind the glass', 0.27, -0.1], ['Interaction area', 'rows ramp up toward your thumb', -0.12, 0.0], ['Now Bar', 'a live pill floating on top', -0.37, 0.13]];
  for (const [a, b, y, z] of notes) { const co = callout(a, b, { lineLen: 0.05 }); co.position.set(W / 2 + 0.01, y, z); root.add(co); }
  let repaint = 0;

  return {
    group, targets,
    update(dt, t, hit) {
      root.rotation.y = 0.24 + Math.sin(t * 0.3) * 0.08;
      idle += dt;
      if (!dragFrom && idle > 3) scroll.to = (Math.sin((idle - 3) * 0.25) * 0.5 + 0.5) * (rows.length * PITCH - (TOP - BOTTOM) - 0.02);
      const s = scroll.step(dt), hovRow = owner(hit?.object, 'row');
      rows.forEach((r, i) => {
        const y = TOP - RH / 2 - i * PITCH + s;
        const u = r.userData; u.lift.to = r === hovRow ? 0.035 : 0;
        r.position.set(0, y, zAt(y) + u.lift.step(dt));
        r.rotation.x = -0.18;
        const vis = y < TOP + 0.02 && y > BOTTOM - 0.03;
        r.visible = vis;
        r.userData.face.material.opacity = clamp((TOP + 0.02 - y) / 0.05, 0, 1);
        r.userData.face.material.transparent = true;
      });
      pillLift.to = owner(hit?.object, 'nowbar') ? 0.16 : 0.13;
      pill.position.z = pillLift.step(dt);
      repaint -= dt; if (repaint <= 0) { repaint = 0.25; pillTex.redraw(t); }
      const o = open.step(dt);
      sheet.visible = o > 0.01; sheet.scale.setScalar(0.2 + 0.8 * o); sheet.material.opacity = clamp(o * 1.5, 0, 1);
    },
    drag(dx, dy) { if (!dragFrom) dragFrom = scroll.to; idle = 0; scroll.to = clamp(dragFrom + dy * 0.0012, -0.02, rows.length * PITCH - (TOP - BOTTOM)); },
    dragEnd() { dragFrom = null; },
    click(hit) {
      idle = 0;
      if (openName) { openName = null; open.to = 0; return; }
      if (owner(hit?.object, 'nowbar')) { kind = (kind + 1) % KINDS.length; pillTex.redraw(); return; }
      if (owner(hit?.object, 'fab')) { openName = 'New message'; sheetTex.redraw(); open.to = 1; return; }
      const r = owner(hit?.object, 'row');
      if (r && r.visible) { openName = r.userData.name; sheetTex.redraw(); open.v = 0; open.to = 1; }
    },
  };
}

// =====================================================================================================
// 3. Tablet · DeX in depth: windows on staggered planes, the focused one forward, the taskbar in front.
// =====================================================================================================
function tabletDex() {
  const group = new THREE.Group(), targets = [];
  const root = new THREE.Group(); group.add(root);
  const W = 1.34, H = 0.84;
  const box = frameBox({ w: W, h: H, r: 0.04, bezel: 0.018, back: 0.16, color: 0x3a3d45 });
  root.add(box.group);
  const { iw, ih, ir } = box;
  const wall = panel(iw, ih, ir, canvasTex(1100, 690, (c, w, h) => wallpaper(c, w, h, 2)));
  wall.position.z = -0.158; root.add(wall);

  const SLOTS = [[-0.36, 0.07, 0.22], [0.44, 0.09, -0.3], [0, 0.12, 0]];
  const WW = 0.5, WH = 0.36;
  const wins = [];
  const makeWin = (name) => {
    const tex = canvasTex(520, Math.round(520 * WH / WW), (c, w, h) => appWindow(name)(c, w, h));
    const g = slabCard(WW, WH, 0.024, tex, { depth: 0.01, color: 0xe9ebf2, transparent: true });
    g.userData = { ...g.userData, win: name, x: new Spring(0, 120, 16), y: new Spring(-0.4, 120, 16), z: new Spring(-0.1, 120, 16), ry: new Spring(0, 120, 16), s: new Spring(0.2, 140, 15) };
    root.add(g); targets.push(g); wins.push(g);
    return g;
  };
  let order = ['Internet', 'Notes', 'Gallery'].map(makeWin);    // order[last] is focused
  const focus = (g) => { order = [...order.filter((x) => x !== g), g]; };

  // taskbar: frosted strip in front of the glass, solid icons, status on the right
  const TB = ['Internet', 'Notes', 'Gallery', 'Messages', 'Calendar', 'Settings'];
  const bar = frost(iw * 0.96, 0.085, 0.03, canvasTex(1200, 82, (c, w, h) => {
    const u = h / 82;
    glyph(c, 'grid', 46 * u, h / 2, 34 * u, '#fff');
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(w - 330 * u, 20 * u, 2 * u, h - 40 * u);
    glyph(c, 'wifi', w - 280 * u, h / 2 + 2 * u, 26 * u, '#fff');
    text(c, clockStr(), w - 30 * u, h / 2 + 10 * u, { size: 28 * u, weight: 600, align: 'right', font: F });
    text(c, dateStr(false), w - 120 * u, h / 2 + 10 * u, { size: 20 * u, align: 'right', font: F, color: 'rgba(255,255,255,0.7)' });
  }), { depth: 0.012, opacity: 0.14, tint: 0x9fb4ff });
  bar.position.set(0, -ih / 2 + 0.06, 0.07); root.add(bar);
  const tbIcons = TB.map((n, i) => {
    const ic = oneIcon(n, 0.054, 0.02);
    ic.position.set(-0.36 + i * 0.09, -ih / 2 + 0.06, 0.09);
    ic.userData = { ...ic.userData, task: n, lift: new Spring(0.09, 200, 16) };
    root.add(ic); targets.push(ic);
    return ic;
  });
  const callTop = callout('Focused window', 'comes forward; the rest step back', { lineLen: 0.05 });
  callTop.position.set(iw / 2 - 0.5, ih / 2 - 0.05, 0.02); root.add(callTop);

  return {
    group, targets,
    update(dt, t, hit) {
      root.rotation.y = Math.sin(t * 0.25) * 0.1; root.rotation.x = -0.05 + Math.sin(t * 0.2) * 0.03;
      const hovWin = owner(hit?.object, 'win'), hovTask = owner(hit?.object, 'task');
      const n = order.length;
      order.forEach((g, k) => {
        const depthRank = n - 1 - k;                         // 0 = focused
        const [sx, sy, sry] = SLOTS[Math.min(k, SLOTS.length - 1)];
        const u = g.userData;
        u.x.to = depthRank === 0 ? 0 : sx * (n > 2 ? 1 : 1.2); u.y.to = depthRank === 0 ? 0.04 : sy;
        u.z.to = depthRank === 0 ? 0.03 : -0.05 - depthRank * 0.04 + (g === hovWin ? 0.03 : 0);
        u.ry.to = depthRank === 0 ? 0 : sry;
        u.s.to = depthRank === 0 ? 1.22 : 0.92;
        g.position.set(u.x.step(dt), u.y.step(dt), u.z.step(dt)); g.rotation.y = u.ry.step(dt); g.scale.setScalar(u.s.step(dt));
        g.renderOrder = k;
      });
      for (const ic of tbIcons) { ic.userData.lift.to = ic === hovTask ? 0.13 : 0.09; ic.position.z = ic.userData.lift.step(dt); ic.rotation.x = ic === hovTask ? -0.3 : damp(ic.rotation.x, 0, 8, dt); }
    },
    click(hit) {
      const w = owner(hit?.object, 'win');
      if (w) { focus(w); return; }
      const task = owner(hit?.object, 'task');
      if (!task) return;
      const name = task.userData.task;
      let g = wins.find((x) => x.userData.win === name && order.includes(x));
      if (!g) {
        g = wins.find((x) => x.userData.win === name) || makeWin(name);
        const u = g.userData; u.x.v = task.position.x; u.y.v = task.position.y; u.z.v = 0.1; u.s.v = 0.15;
        if (order.length >= 3) { const drop = order.shift(); drop.visible = false; }
        g.visible = true; order.push(g);
      }
      focus(g);
      wins.forEach((x) => { x.visible = order.includes(x); });
    },
  };
}

// =====================================================================================================
// 4. Monitor · Smart Monitor hub: apps, a hero video and SmartThings arranged as a 3D dashboard.
// =====================================================================================================
function monitorHub() {
  const group = new THREE.Group(), targets = [];
  const root = new THREE.Group(); root.position.y = 0.04; group.add(root);
  const W = 1.38, H = 0.78;
  const box = frameBox({ w: W, h: H, r: 0.014, bezel: 0.012, back: 0.14, color: 0xe6e7ea, rough: 0.4 });
  root.add(box.group);
  const { iw, ih } = box;
  const stand = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.6, roughness: 0.35 });
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03), stand); neck.position.set(0, -H / 2 - 0.05, -0.12); root.add(neck);
  const foot = new THREE.Mesh(slabGeo(0.42, 0.16, 0.016, 0.03), stand); foot.rotation.x = -Math.PI / 2; foot.position.set(0, -H / 2 - 0.11, -0.08); root.add(foot);

  const bg = panel(iw, ih, 0.004, canvasTex(1200, 680, (c, w, h) => { blobs(c, w, h, '#05070f', [[0.2, 0.2, 0.5, 'rgba(40,80,200,0.55)'], [0.85, 0.8, 0.5, 'rgba(120,60,220,0.45)']]); }));
  bg.position.z = -0.138; root.add(bg);
  const header = texPanel(iw * 0.94, 0.07, 0, 90, (c, w, h) => {
    const u = h / 90;
    text(c, 'Good evening, Alex', 10 * u, 58 * u, { size: 40 * u, weight: 700, font: F });
    text(c, `${clockStr()}  ·  64° Cloudy`, w - 10 * u, 58 * u, { size: 30 * u, weight: 600, font: F, align: 'right', color: 'rgba(255,255,255,0.8)' });
  });
  header.position.set(0, ih / 2 - 0.05, -0.07); root.add(header);

  // hero: what's playing, deepest content layer
  const SHOWS = { 'TV Plus': ['Ocean Worlds', '#0a3a6b', '#41c3d9'], 'Gaming Hub': ['Nebula Racers', '#2a0d5c', '#b16eff'], Workspace: ['Q4 Planning.pptx', '#0f3d2c', '#4fdc9a'], Internet: ['news.example.com', '#3a1f6b', '#6e8bff'] };
  let showing = 'TV Plus';
  const heroTex = canvasTex(1000, 560, (c, w, h, t) => {
    const [title, a, b] = SHOWS[showing], u = h / 560;
    fillRR(c, 0, 0, w, h, 26 * u, grad(c, 0, 0, w, h, [a, b]));
    for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(w * (0.5 + i * 0.1), h * (0.45 + Math.sin(i + t * 0.3) * 0.08), 90 * u, 32 * u, 0.2, 0, Math.PI * 2); c.fillStyle = `rgba(255,255,255,${0.05 + i * 0.03})`; c.fill(); }
    c.fillStyle = grad(c, 0, h * 0.5, 0, h, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']); c.fillRect(0, 0, w, h);
    text(c, showing, 40 * u, 60 * u, { size: 26 * u, weight: 600, font: F, color: 'rgba(255,255,255,0.8)' });
    text(c, title, 40 * u, h - 90 * u, { size: 58 * u, weight: 700, font: F });
    fillRR(c, 40 * u, h - 52 * u, w - 80 * u, 8 * u, 4 * u, 'rgba(255,255,255,0.25)');
    fillRR(c, 40 * u, h - 52 * u, (w - 80 * u) * ((t * 0.02) % 1), 8 * u, 4 * u, '#fff');
  });
  const hero = slabCard(0.66, 0.37, 0.026, heroTex, { depth: 0.012 });
  hero.position.set(-0.03, 0.04, -0.07); root.add(hero);

  // apps column, angled toward the centre
  const APPS = ['TV Plus', 'Gaming Hub', 'Workspace', 'Internet'];
  const apps = APPS.map((n, i) => {
    const h = new THREE.Group(); h.position.set(-0.54, 0.15 - i * 0.12, 0.02); h.rotation.y = 0.32;
    const ic = icon3d({ shape: 'rounded', size: 0.07, depth: 0.024, side: new THREE.Color(appOf(n)[1][1]).getHex(), face: (c, w, hh) => { const [g, cols] = appOf(n); c.fillStyle = grad(c, 0, 0, 0, hh, cols); c.fillRect(0, 0, w, hh); glyph(c, g, w / 2, hh / 2, w * 0.5, '#fff'); } });
    ic.position.x = -0.045; h.add(ic);
    const l = label(n, 0.026); l.position.set(0.0 + l.geometry.parameters.width / 2, 0, 0.01); h.add(l);
    h.userData = { app: n, lift: new Spring(0.02, 200, 16) };
    root.add(h); targets.push(h);
    return h;
  });
  // SmartThings column
  const DEV = [{ n: 'Living room lights', g: 'bulb', on: true, s: ['Off', '80%'] }, { n: 'Air conditioner', g: 'thermo', on: true, s: ['Off', '72° Cool'] }, { n: 'Front door', g: 'lock', on: true, s: ['Unlocked', 'Locked'] }, { n: 'Robot vacuum', g: 'home', on: false, s: ['Docked', 'Cleaning'] }];
  const tiles = DEV.map((d, i) => {
    const tex = canvasTex(440, 180, (c, w, h) => {
      const u = h / 180;
      fillRR(c, 0, 0, w, h, 30 * u, d.on ? '#e9f0ff' : 'rgba(30,34,46,0.95)');
      c.beginPath(); c.arc(56 * u, h / 2, 34 * u, 0, Math.PI * 2); c.fillStyle = d.on ? BLUE : '#3a3f50'; c.fill();
      glyph(c, d.g, 56 * u, h / 2, 34 * u, '#fff');
      text(c, d.n, 110 * u, 78 * u, { size: 28 * u, weight: 700, font: F, color: d.on ? '#141821' : '#fff' });
      text(c, d.s[d.on ? 1 : 0], 110 * u, 120 * u, { size: 25 * u, weight: 500, font: F, color: d.on ? BLUE : 'rgba(255,255,255,0.6)' });
    });
    const t = slabCard(0.24, 0.098, 0.022, tex, { depth: 0.014, color: 0x1a1d28 });
    t.position.set(0.53, 0.17 - i * 0.115, 0.04); t.rotation.y = -0.32;
    t.userData = { ...t.userData, dev: i, lift: new Spring(0.04, 200, 16), tex };
    root.add(t); targets.push(t);
    return t;
  });
  const stTitle = label('SmartThings', 0.024); stTitle.position.set(0.5, 0.25, 0.03); stTitle.rotation.y = -0.32; root.add(stTitle);
  const apTitle = label('Apps', 0.024); apTitle.position.set(-0.54, 0.25, 0.03); apTitle.rotation.y = 0.32; root.add(apTitle);
  // continue-from-phone strip along the bottom
  const strip = frost(0.66, 0.075, 0.03, canvasTex(900, 102, (c, w, h) => {
    const u = h / 102;
    icon(c, 22 * u, 20 * u, 62 * u, 'Messages');
    text(c, 'Continue from Galaxy S26 Ultra', 104 * u, 46 * u, { size: 28 * u, weight: 700, font: F });
    text(c, 'Messages · Mina · 2 min ago', 104 * u, 80 * u, { size: 22 * u, font: F, color: 'rgba(255,255,255,0.7)' });
    fillRR(c, w - 170 * u, 26 * u, 150 * u, 50 * u, 25 * u, BLUE); text(c, 'Open', w - 95 * u, 60 * u, { size: 24 * u, weight: 700, align: 'center', font: F });
  }), { depth: 0.01, opacity: 0.12 });
  strip.position.set(-0.03, -0.25, 0.06); root.add(strip);
  let repaint = 0;

  return {
    group, targets,
    update(dt, t, hit) {
      root.rotation.y = Math.sin(t * 0.22) * 0.07;
      const ha = owner(hit?.object, 'app'), ht = owner(hit?.object, 'dev');
      for (const a of apps) { a.userData.lift.to = a === ha ? 0.08 : 0.02; a.position.z = a.userData.lift.step(dt); a.rotation.y = damp(a.rotation.y, a === ha ? 0.05 : 0.32, 8, dt); }
      for (const tl of tiles) { tl.userData.lift.to = tl === ht ? 0.09 : 0.04; tl.position.z = tl.userData.lift.step(dt); tl.rotation.y = damp(tl.rotation.y, tl === ht ? -0.05 : -0.32, 8, dt); }
      repaint -= dt; if (repaint <= 0) { repaint = 0.2; heroTex.redraw(t); }
    },
    click(hit) {
      const a = owner(hit?.object, 'app');
      if (a) { showing = a.userData.app; heroTex.redraw(); return; }
      const tl = owner(hit?.object, 'dev');
      if (tl) { const d = DEV[tl.userData.dev]; d.on = !d.on; tl.userData.tex.redraw(); }
    },
  };
}

// =====================================================================================================
// 5. Home view · Samsung TV: a layered hero, a curved content carousel, a 3D SmartThings room and
//    Vision AI suggestions that pop forward from the focused title.
// =====================================================================================================
function tvHome() {
  const group = new THREE.Group(), targets = [];
  const root = new THREE.Group(); group.add(root);
  const W = 1.5, H = 0.845;
  const box = frameBox({ w: W, h: H, r: 0.01, bezel: 0.01, back: 0.17, color: 0x1b1c20 });
  root.add(box.group);
  const { iw, ih } = box;

  const TITLES = [['Ocean Worlds', '#0a3a6b', '#41c3d9'], ['Nebula Racers', '#2a0d5c', '#b16eff'], ['Night Market', '#5c1a0d', '#ffb36b'], ['Arctic Run', '#0d3a4c', '#bfe8ff'], ['Desert Lines', '#5c3a0d', '#ffd257'], ['Neon Tokyo', '#3a0d4c', '#ff7cb8'], ['Forest Echo', '#0d4c2a', '#5bdfac']];
  let playing = 0, upscale = false, dim = false, cast = false;
  // hero art at the back, title floating in front of it
  const heroTex = canvasTex(1200, 676, (c, w, h, t) => {
    const [, a, b] = TITLES[playing];
    c.fillStyle = grad(c, 0, 0, w, h, [a, b]); c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(w * (0.45 + i * 0.08), h * (0.32 + Math.sin(i * 1.7 + t * 0.2) * 0.1), 120, 40, 0.25, 0, Math.PI * 2); c.fillStyle = `rgba(255,255,255,${0.04 + i * 0.02})`; c.fill(); }
    c.fillStyle = grad(c, 0, h * 0.35, 0, h, ['rgba(5,6,10,0)', 'rgba(5,6,10,0.95)']); c.fillRect(0, 0, w, h);
    if (dim) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, w, h); }
  });
  const hero = panel(iw, ih, 0.004, heroTex); hero.position.z = -0.168; root.add(hero);
  const titleTex = canvasTex(700, 240, (c, w, h) => {
    const u = h / 240;
    text(c, 'Samsung TV Plus · Featured', 0, 40 * u, { size: 26 * u, weight: 600, font: F, color: 'rgba(255,255,255,0.75)' });
    text(c, TITLES[playing][0], 0, 130 * u, { size: 84 * u, weight: 800, font: F });
    text(c, upscale ? '4K HDR · Vision AI upscaled to 8K' : '4K HDR · Nature', 0, 180 * u, { size: 26 * u, font: F, color: upscale ? '#9fc0ff' : 'rgba(255,255,255,0.75)' });
  });
  const titleP = panel(0.62, 0.21, 0, titleTex, { transparent: true }); titleP.position.set(-0.4, 0.24, -0.08); root.add(titleP);
  const topBar = texPanel(0.4, 0.045, 0, 64, (c, w, h) => { text(c, clockStr(), w - 4, h * 0.72, { size: h * 0.55, weight: 600, align: 'right', font: F }); c.beginPath(); c.arc(w - h * 3.2, h / 2, h * 0.32, 0, Math.PI * 2); c.fillStyle = '#ff7cb8'; c.fill(); });
  topBar.position.set(iw / 2 - 0.22, ih / 2 - 0.04, -0.06); root.add(topBar);

  // apps row (Tizen launcher), solid rounded icons
  const ROW = ['TV Plus', 'Gaming Hub', 'Art Store', 'SmartThings', 'Health', 'Music', 'Gallery'];
  const appIcons = ROW.map((n, i) => {
    const ic = icon3d({ shape: 'rounded', size: 0.06, depth: 0.018, side: new THREE.Color(appOf(n)[1][1]).getHex(), face: (c, w, h) => { const [g, cols] = appOf(n); c.fillStyle = grad(c, 0, 0, 0, h, cols); c.fillRect(0, 0, w, h); glyph(c, g, w / 2, h / 2, w * 0.5, '#fff'); } });
    ic.position.set(-0.62 + i * 0.1, 0.03, -0.02); ic.userData = { ...ic.userData, tvapp: n };
    root.add(ic); targets.push(ic);
    return ic;
  });

  // content carousel: posters on a shallow arc, focused one nearest
  const posters = TITLES.map(([n, a, b], i) => {
    const tex = canvasTex(320, 200, (c, w, h) => {
      fillRR(c, 0, 0, w, h, 18, grad(c, 0, 0, w, h, [a, b]));
      c.fillStyle = grad(c, 0, h * 0.4, 0, h, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']); c.fillRect(0, 0, w, h);
      text(c, n, 18, h - 22, { size: 30, weight: 700, font: F });
    });
    const p = slabCard(0.2, 0.125, 0.016, tex, { depth: 0.01 });
    p.userData = { ...p.userData, poster: i };
    root.add(p); targets.push(p);
    return p;
  });
  const rowLabel = label('Continue watching', 0.022); rowLabel.position.set(-0.6, -0.1, 0.0); root.add(rowLabel);
  const pos = new Spring(2, 90, 15); let focus = 2;

  // Vision AI / Bixby suggestion chips above the focused poster
  const CHIPS = [['sparkle', 'Upscale to 8K'], ['bulb', 'Dim the lights'], ['person', "Who's in this?"]];
  const chips = CHIPS.map(([g, s], i) => {
    const tex = canvasTex(360, 72, (c, w, h) => {
      fillRR(c, 0, 0, w, h, h / 2, 'rgba(18,20,30,0.92)'); strokeRR(c, 1, 1, w - 2, h - 2, h / 2, 'rgba(160,190,255,0.6)', 2);
      glyph(c, g, h * 0.55, h / 2, h * 0.45, '#9fc0ff');
      text(c, s, h * 1.05, h * 0.64, { size: h * 0.4, weight: 700, font: F });
    });
    const m = panel(0.2, 0.04, 0.02, tex, { transparent: true });
    m.userData = { chip: i, pop: new Spring(0, 160, 15) };
    root.add(m); targets.push(m);
    return m;
  });
  let chipShow = new Spring(0, 120, 15), chipHold = 0;

  // SmartThings room: a tiny living room floating top-right
  const room = new THREE.Group(); room.position.set(0.5, 0.1, 0.06); room.rotation.set(0.5, -0.5, 0); root.add(room);
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.8 });
  const wallM = new THREE.MeshStandardMaterial({ color: 0xd9dbe2, roughness: 0.9 });
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.16), wood); room.add(fl);
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.006), wallM); w1.position.set(0, 0.045, -0.08); room.add(w1);
  const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.09, 0.16), wallM); w2.position.set(-0.11, 0.045, 0); room.add(w2);
  const sofa = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.04), new THREE.MeshStandardMaterial({ color: 0x3e5a9a, roughness: 0.8 })); sofa.position.set(0.0, 0.016, 0.03); room.add(sofa);
  const tvMini = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.004), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x2a6bff, emissiveIntensity: 0.6 })); tvMini.position.set(0, 0.05, -0.075); room.add(tvMini);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: 0xffc870, emissiveIntensity: 1.2 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), lampMat); lamp.position.set(-0.08, 0.06, 0.04); room.add(lamp);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.05), wallM); pole.position.set(-0.08, 0.03, 0.04); room.add(pole);
  const glowM = new THREE.MeshBasicMaterial({ color: 0xffc870, transparent: true, opacity: 0.35, depthWrite: false });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.06, 32), glowM); pool.rotation.x = -Math.PI / 2; pool.position.set(-0.06, 0.005, 0.03); room.add(pool);
  room.userData.room = true; targets.push(room);
  const roomTex = canvasTex(400, 70, (c, w, h) => {
    fillRR(c, 0, 0, w, h, h / 2, 'rgba(18,20,30,0.9)');
    glyph(c, 'home', h * 0.55, h / 2, h * 0.5, '#55b0ff');
    text(c, `Living room · ${dim ? 'Movie mode' : 'Lamp on'}`, h * 1.05, h * 0.64, { size: h * 0.38, weight: 700, font: F });
  });
  const roomLabel = panel(0.2, 0.035, 0.017, roomTex, { transparent: true }); roomLabel.position.set(0.5, 0.21, 0.07); root.add(roomLabel);

  // cast card that slides in from the right
  const castTex = canvasTex(420, 300, (c, w, h) => {
    fillRR(c, 0, 0, w, h, 26, 'rgba(18,20,30,0.95)');
    text(c, 'Vision AI · On screen', 24, 44, { size: 22, weight: 600, font: F, color: '#9fc0ff' });
    [['Narrator', 'D. Attenborough-style voice'], ['Filmed in', 'Raja Ampat, Indonesia'], ['Species', 'Manta ray, reef shark']].forEach(([a, b], i) => {
      text(c, a, 24, 100 + i * 66, { size: 20, font: F, color: 'rgba(255,255,255,0.6)' });
      text(c, b, 24, 128 + i * 66, { size: 24, weight: 700, font: F });
    });
  });
  const castCard = panel(0.25, 0.18, 0.02, castTex, { transparent: true }); castCard.position.set(0.9, 0.0, 0.1); root.add(castCard);
  const castX = new Spring(1.1, 120, 16);
  let repaint = 0;

  const layout = (dt, hovPoster) => {
    const p = pos.step(dt);
    posters.forEach((m, i) => {
      const o = i - p, a = Math.abs(o);
      m.position.set(-0.02 + o * 0.215, -0.22 + (a < 0.5 ? 0.012 : 0), 0.07 - Math.min(a, 3) * Math.min(a, 3) * 0.018 + (m === hovPoster ? 0.03 : 0));
      m.rotation.y = -clamp(o, -2, 2) * 0.22;
      m.scale.setScalar(a < 0.5 ? 1.3 - a * 0.6 : Math.max(0.8, 1.05 - a * 0.08));
      m.visible = a < 3.6;
    });
    return p;
  };

  return {
    group, targets,
    update(dt, t, hit) {
      root.rotation.y = Math.sin(t * 0.2) * 0.06;
      const hp = owner(hit?.object, 'poster'), hc = owner(hit?.object, 'chip'), ha = owner(hit?.object, 'tvapp');
      layout(dt, hp);
      const onFocus = (hp && hp.userData.poster === focus) || hc;
      if (onFocus) chipHold = 2.5; chipHold -= dt;
      chipShow.to = chipHold > 0 ? 1 : 0.55;
      const cs = chipShow.step(dt), fp = posters[focus].position;
      chips.forEach((m, i) => {
        m.userData.pop.to = m === hc ? 1 : 0;
        const pp = m.userData.pop.step(dt);
        m.position.set(fp.x - 0.21 + i * 0.21, fp.y + 0.1 + 0.03 * cs, fp.z + 0.04 + 0.07 * cs + 0.03 * pp);
        m.scale.setScalar(0.85 + 0.15 * cs + 0.08 * pp);
        m.material.opacity = 0.35 + 0.65 * cs;
      });
      for (const ic of appIcons) { const on = ic === ha; ic.position.z = damp(ic.position.z, on ? 0.04 : -0.02, 10, dt); ic.rotation.x = damp(ic.rotation.x, on ? -0.35 : 0, 10, dt); }
      room.rotation.y = -0.5 + Math.sin(t * 0.4) * 0.15;
      lampMat.emissiveIntensity = damp(lampMat.emissiveIntensity, dim ? 0.05 : 1.2, 4, dt);
      glowM.opacity = damp(glowM.opacity, dim ? 0.02 : 0.35, 4, dt);
      castX.to = cast ? 0.56 : 1.1; castCard.position.x = castX.step(dt); castCard.visible = castCard.position.x < 1.0;
      repaint -= dt; if (repaint <= 0) { repaint = 0.25; heroTex.redraw(t); }
    },
    click(hit) {
      const p = owner(hit?.object, 'poster');
      if (p) {
        const i = p.userData.poster;
        if (i === focus) { playing = i; cast = false; heroTex.redraw(); titleTex.redraw(); }
        else { focus = i; pos.to = i; chipHold = 2.5; }
        return;
      }
      const c = owner(hit?.object, 'chip');
      if (c) {
        const k = c.userData.chip;
        if (k === 0) { upscale = !upscale; titleTex.redraw(); }
        if (k === 1) { dim = !dim; heroTex.redraw(); roomTex.redraw(); }
        if (k === 2) cast = !cast;
        chipHold = 3; return;
      }
      if (owner(hit?.object, 'room')) { dim = !dim; heroTex.redraw(); roomTex.redraw(); return; }
      const a = owner(hit?.object, 'tvapp');
      if (a) { const i = (playing + 1) % TITLES.length; playing = i; focus = i; pos.to = i; heroTex.redraw(); titleTex.redraw(); }
    },
  };
}

export const layouts = [
  {
    key: 'icons', name: 'One UI home screen, in 3D', short: 'App grid', tagline: 'Galaxy S26 Ultra · One UI 9, the traditional layout with real depth',
    blurb: "Today's Galaxy home screen kept exactly as people know it: status bar, the weather and calendar widget, a 4 × 4 grid of One UI squircle icons, page dots and the dock. On a 3D screen, each layer sits at its own depth: the wallpaper at the back of the phone, the widget just under the glass, solid icons standing off it and the dock shelf nearest.",
    points: ['Every icon is a solid squircle with its One UI art on the face', 'The widget is a frosted slab; the dock rides on a glass shelf in front', 'Tapping an icon bounces it and springs its app window out toward you'],
    how: 'Hover an icon to lift and tilt it. Click it to open its app; click again to close.',
    hint: 'Hover an icon · click to open',
    build: iconGrid,
  },
  {
    key: 'phone', name: 'One UI Depth', short: 'Phone', tagline: 'Reach in z: content moves toward your thumb',
    blurb: "One UI already splits apps into a viewing area at the top and an interaction area at the bottom for one-handed use. In depth that split becomes physical: the big title sits back behind the glass, the list ramps up toward you as it nears your thumb, and the Now Bar floats on top as a solid pill.",
    points: ['Title and header recede so they read as "look, don\'t touch"', 'List rows climb a ramp: the lower the row, the nearer the viewer', 'Now Bar as a 3D pill with live music, timer, ride or workout'],
    how: 'Drag up or down to scroll the ramp. Click a row to open the conversation, the Now Bar to switch live activity, or the blue button to compose.',
    hint: 'Drag to scroll · click a row or the Now Bar',
    build: phoneDepth,
  },
  {
    key: 'tablet', name: 'DeX in depth', short: 'Tablet', tagline: 'Galaxy Tab · windows on staggered planes',
    blurb: 'Samsung DeX turns a Galaxy Tab into a desktop of overlapping windows. In 3D the overlap becomes real: the focused window floats forward and grows, the others step back onto their own planes and turn toward the middle, and the taskbar sits in front of the glass with solid app icons.',
    points: ['Focus = depth: the active window is the nearest one', 'Background windows stay visible on angled planes behind it', 'Taskbar apps rise as you hover and launch windows up out of the bar'],
    how: 'Click a window to bring it forward. Click a taskbar app to open or focus its window.',
    hint: 'Click a window · click a taskbar app',
    build: tabletDex,
  },
  {
    key: 'monitor', name: 'Smart Monitor hub', short: 'Monitor', tagline: 'Samsung Smart Monitor · a 3D dashboard',
    blurb: "Samsung's Smart Monitors mix a PC screen, streaming apps and SmartThings. Here the hub is laid out in depth: what's playing sits deepest like a window, apps and SmartThings controls wrap around it on angled columns in front, and turn to face you when you hover.",
    points: ['Hero video as the deepest layer, like looking through a window', 'Apps and SmartThings tiles on angled side columns, nearer the viewer', 'Continue-from-phone strip floats along the bottom'],
    how: 'Click an app to switch what plays. Click a SmartThings tile to toggle the device.',
    hint: 'Click an app or a SmartThings tile',
    build: monitorHub,
  },
  {
    key: 'home', name: 'Vision AI home', short: 'Home view', tagline: 'Samsung TV · the Tizen home in layers',
    blurb: 'The TV home screen is already layered: featured art, a title, app and content rows. On a big glasses-free 3D TV those layers separate: the artwork sits deep, the title floats in front of it, the content row curves toward you, a tiny SmartThings room floats in the corner, and Vision AI suggestions pop out of the title you are on.',
    points: ['Content row on a curve, the focused title nearest and largest', 'Vision AI chips: upscale to 8K, dim the lights, who is on screen', 'A 3D SmartThings room shows the lamp actually dimming'],
    how: 'Click a side poster to focus it, click the focused one to play it. Use the chips above it, or click the little room to toggle the lamp.',
    hint: 'Click posters · use the Vision AI chips',
    build: tvHome,
  },
];
