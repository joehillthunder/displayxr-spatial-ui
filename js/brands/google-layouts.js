// Google: today's Pixel home screen rebuilt with solid 3D icons, and four reimagined spatial interfaces
// (phone, tablet, monitor, living-room home view) in Material 3 Expressive.
//
// Helpers come from google.js. That module imports this one, so imported bindings are only touched
// inside build functions (never at module top level).

import * as THREE from 'three';
import { canvasTex, panel, glyph, statusBar, blobs, fillRR, rr, text, clockStr, Spring, damp, clamp, lerp, rrShape, slabGeo, screenGeo, metal, matte } from '../kit.js';
import { icon3d, label3d } from '../icons3d.js';
import { C, GEM, F, T, wrapText, shapePath, fillShape, pill, photo, radialTex, shortDate } from './google.js';

// ---- shared bits ---------------------------------------------------------------------------------------
const APPS = {
  messages: ['message', 'Messages'], photos: ['photos', 'Photos'], camera: ['camera', 'Camera'], maps: ['map', 'Maps'],
  gmail: ['mail', 'Gmail'], calendar: ['calendar', 'Calendar'], youtube: ['play', 'YouTube'], settings: ['gear', 'Settings'],
  clock: ['clock', 'Clock'], keep: ['note', 'Keep'], music: ['music', 'YT Music'], wallet: ['wallet', 'Wallet'],
  phone: ['phone', 'Phone'], chrome: ['search', 'Chrome'], home: ['home', 'Home'], fit: ['heart', 'Fit'],
  files: ['note', 'Files'], gemini: ['sparkle', 'Gemini'], tv: ['tv', 'Google TV'], docs: ['note', 'Docs'],
};
// Tonal pairs for themed icons: [container, on-container, body side].
const TONES = () => [[C.priC, C.onPriC, 0x2a4a7a], [C.secC, C.onSecC, 0x3d4758], [C.terC, C.onTerC, 0x563e5c], [C.grnC, '#c8f0b0', 0x2a4f1c]];

// Pick-tag an object; pickOf() walks up from a raycast hit to the nearest tagged ancestor.
const tag = (o, data) => { o.userData.pick = data; return o; };
function pickOf(hit) { for (let o = hit?.object; o; o = o.parent) if (o.userData.pick) return o.userData.pick; return null; }

// A transparent textured panel whose canvas can be repainted (m.userData.tex.redraw()).
function tp(w, h, r, px, draw, opts = {}) {
  const tex = canvasTex(Math.round(px * w / h), px, draw);
  const m = panel(w, h, r, tex, { transparent: true, ...opts });
  m.userData.tex = tex;
  return m;
}

// A themed Material icon as a solid 3D slab.
function appIcon(id, size, tone = 0, shape = 'circle', depth = size * 0.32) {
  const [g] = APPS[id] || APPS.settings, [bg, fg, side] = TONES()[tone % 4];
  return icon3d({ shape, size, depth, side, face: (ctx, w, h) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); glyph(ctx, g, w / 2, h / 2, w * 0.5, fg, w * 0.045); } });
}

// Dynamic-colour wallpaper (blue seed), the backdrop of every Pixel surface.
function wallpaper(ctx, w, h, seed = 0) {
  const sets = [
    ['#12172a', [[0.15, 0.12, 0.55, '#36508a'], [0.95, 0.45, 0.55, '#5b3f74'], [0.2, 0.95, 0.6, '#1f4a6e']]],
    ['#101820', [[0.2, 0.2, 0.6, '#2d5d7c'], [0.85, 0.7, 0.6, '#3d6b52'], [0.5, 1.0, 0.5, '#244259']]],
    ['#17121e', [[0.8, 0.15, 0.6, '#6b3f6e'], [0.15, 0.6, 0.6, '#384f86'], [0.6, 1.0, 0.5, '#2b2f5e']]],
  ];
  const [base, spots] = sets[seed % sets.length];
  blobs(ctx, w, h, base, spots);
}

// A device you look INTO: a bezel at the glass plane, walls running back, the wallpaper at the back.
function portal(W, H, r, { depth = 0.24, bezel = 0.018, color = 0x1e2126, back = null } = {}) {
  const g = new THREE.Group();
  const ringShape = rrShape(W, H, r); ringShape.holes.push(rrShape(W - 2 * bezel, H - 2 * bezel, Math.max(0.004, r - bezel)));
  const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 14 }), metal(color, 0.35, 0.6));
  ring.position.z = -0.008; g.add(ring);
  const iw = W - 2 * bezel, ih = H - 2 * bezel, ir = Math.max(0.004, r - bezel);
  const wallShape = rrShape(iw + 0.002, ih + 0.002, ir); wallShape.holes.push(rrShape(iw - 0.004, ih - 0.004, Math.max(0.003, ir - 0.003)));
  const walls = new THREE.Mesh(new THREE.ExtrudeGeometry(wallShape, { depth, bevelEnabled: false, curveSegments: 14 }), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.85, metalness: 0.1 }));
  walls.position.z = -depth; g.add(walls);
  if (back) {
    const b = panel(iw, ih, ir, canvasTex(Math.round(900 * iw / ih), 900, back));
    b.material.transparent = false; b.material.depthWrite = true;
    b.position.z = -depth + 0.002; g.add(b);
    g.userData.back = b;
  }
  g.userData.inner = [iw, ih];
  return g;
}

// =====================================================================================================
// 1. App grid in 3D: the Pixel 11 Pro home screen, traditional layout, every element a real object.
// =====================================================================================================
function layoutIcons() {
  const group = new THREE.Group(), targets = [];
  const W = 0.4, H = 0.84, u = W / 100, ry = (yc) => H / 2 - yc * u, rx = (xc) => -W / 2 + xc * u;
  const root = new THREE.Group(); root.position.z = -0.05; group.add(root);

  // Phone body with the wallpaper on its face (status bar and gesture pill painted in).
  root.add(new THREE.Mesh(slabGeo(W + 0.024, H + 0.024, 0.03, 0.06), metal(0x24272d, 0.3, 0.7)));
  const wall = panel(W, H, 0.05, canvasTex(500, 1050, (ctx, w, h) => {
    wallpaper(ctx, w, h);
    statusBar(ctx, w, 7 * (w / 100), { font: F, size: 3.8 * (w / 100), pad: 7 * (w / 100) });
    pill(ctx, w * 0.4, h - 1.6 * (w / 100) * 3, w * 0.2, 1.2 * (w / 100), 'rgba(255,255,255,.75)');
  }));
  wall.position.z = 0.0155; root.add(wall);
  const punch = new THREE.Mesh(new THREE.CircleGeometry(0.009, 24), new THREE.MeshBasicMaterial({ color: 0 }));
  punch.position.set(0, ry(4.5), 0.017); root.add(punch);

  // At a Glance: date + weather, a level above the wallpaper.
  const glance = tp(0.3, 0.085, 0, 300, (ctx, w, h) => {
    const k = h / 85;
    T(ctx, shortDate(), 0, 34 * k, 30 * k, 500, '#fff');
    glyph(ctx, 'sun', 14 * k, 66 * k, 24 * k, '#ffd58a');
    T(ctx, '64°F · Sunny', 34 * k, 75 * k, 22 * k, 500, '#fff');
  });
  glance.position.set(rx(8) + 0.15, ry(27), 0.026); root.add(glance);

  // Widgets: cookie clock + squircle weather as thick tonal slabs.
  const clockW = icon3d({ shape: 'cookie', size: 0.17, depth: 0.04, side: 0x2a4a7a, face: (ctx, w, h) => {
    ctx.fillStyle = C.priC; ctx.fillRect(0, 0, w, h);
    const [hh, mm] = clockStr().split(':');
    T(ctx, hh.padStart(2, '0'), w / 2, h * 0.47, h * 0.36, 700, C.onPriC, 'center');
    T(ctx, mm, w / 2, h * 0.84, h * 0.36, 700, C.pri, 'center');
  } });
  clockW.position.set(rx(31), ry(66), 0.04); root.add(clockW);
  const weatherW = icon3d({ shape: 'squircle', size: 0.15, depth: 0.034, side: 0x563e5c, face: (ctx, w, h) => {
    ctx.fillStyle = C.terC; ctx.fillRect(0, 0, w, h);
    glyph(ctx, 'cloud', w / 2, h * 0.36, w * 0.36, C.onTerC);
    T(ctx, '64°', w / 2, h * 0.8, h * 0.26, 600, C.onTerC, 'center');
  } });
  weatherW.position.set(rx(74), ry(66), 0.035); root.add(weatherW);
  for (const [m, name] of [[clockW, 'clock'], [weatherW, 'weather']]) { tag(m, { kind: 'widget', name, m, base: m.position.z, z: new Spring(m.position.z, 300, 14) }); targets.push(m); }

  // App grid (2 rows x 4) and the dock, every icon a solid themed slab with its label on the wallpaper.
  const grid = ['messages', 'photos', 'camera', 'maps', 'gmail', 'calendar', 'youtube', 'settings'];
  const shapes = ['circle', 'cookie', 'circle', 'clover', 'circle', 'squircle', 'circle', 'cookie'];
  const icons = [];
  const addIcon = (id, x, y, z, tone, shape, withLabel) => {
    const m = appIcon(id, 0.07, tone, shape, 0.026);
    m.position.set(x, y, z); root.add(m);
    if (withLabel) { const l = label3d(APPS[id][1], { height: 0.017, font: F, weight: 500 }); l.position.set(x, y - 0.054, 0.018); root.add(l); }
    const d = { kind: 'icon', id, m, base: z, z: new Spring(z, 320, 11), s: new Spring(1, 320, 11), spin: 0 };
    tag(m, d); targets.push(m); icons.push(d);
  };
  grid.forEach((id, i) => addIcon(id, rx(14 + (i % 4) * 24), ry(120 + Math.floor(i / 4) * 27), 0.04, i % 2, shapes[i], true));
  ['phone', 'messages', 'chrome', 'camera'].forEach((id, i) => addIcon(id, rx(14 + i * 24), ry(173), 0.062, 0, 'circle', false));

  // Search pill, the highest layer.
  const search = new THREE.Group();
  search.add(new THREE.Mesh(slabGeo(0.344, 0.048, 0.02, 0.024, 0.006), new THREE.MeshPhysicalMaterial({ color: 0x32353a, roughness: 0.3, clearcoat: 1 })));
  const sf = panel(0.34, 0.044, 0.022, canvasTex(680, 88, (ctx, w, h) => {
    pill(ctx, 0, 0, w, h, C.sch);
    glyph(ctx, 'search', 44, h / 2, 34, C.onv); T(ctx, 'Search', 80, h / 2 + 11, 30, 500, C.onv);
    glyph(ctx, 'mic', w - 96, h / 2, 34, C.on); glyph(ctx, 'camera', w - 40, h / 2, 34, C.on);
  }), { transparent: true });
  sf.position.z = 0.011; search.add(sf);
  search.position.set(0, ry(194), 0.078); root.add(search);
  tag(search, { kind: 'search', m: search, base: 0.078, z: new Spring(0.078, 300, 14) }); targets.push(search);

  // App sheet: a container transform from the icon to (nearly) full screen, in front of everything.
  let open = null;
  const sheet = tp(W * 0.94, H * 0.9, 0.04, 900, () => {});
  sheet.visible = false; root.add(sheet);
  const sheetT = new Spring(0, 160, 16);
  const paintSheet = (id) => {
    const c = sheet.userData.tex.image.getContext('2d'), w = c.canvas.width, h = c.canvas.height, k = w / 400;
    c.clearRect(0, 0, w, h);
    fillRR(c, 0, 0, w, h, 40 * k, C.bg);
    fillShape(c, 52 * k, 74 * k, 30 * k, 'cookie', C.priC); glyph(c, APPS[id][0], 52 * k, 74 * k, 30 * k, C.onPriC);
    T(c, APPS[id][1], 96 * k, 86 * k, 34 * k, 600, C.on);
    pill(c, 24 * k, 130 * k, w - 48 * k, 48 * k, C.sch); glyph(c, 'search', 50 * k, 154 * k, 22 * k, C.onv); T(c, `Search ${APPS[id][1]}`, 74 * k, 162 * k, 19 * k, 400, C.onv);
    for (let i = 0; i < 5; i++) {
      const y = (204 + i * 112) * k;
      fillRR(c, 24 * k, y, w - 48 * k, 98 * k, 26 * k, i === 0 ? C.priC : C.sc);
      c.save(); rr(c, 38 * k, y + 14 * k, 70 * k, 70 * k, 18 * k); c.clip(); photo(c, i, 38 * k, y + 14 * k, 70 * k, 70 * k, i % 2 === 0); c.restore();
      T(c, ['Pinned', 'Today', 'Shared with you', 'Recent', 'Suggested'][i], 124 * k, y + 42 * k, 22 * k, 600, i === 0 ? C.onPriC : C.on);
      T(c, 'Springs open from its icon', 124 * k, y + 70 * k, 17 * k, 400, i === 0 ? C.onPriC : C.onv);
    }
    pill(c, w - 150 * k, h - 92 * k, 126 * k, 62 * k, C.priC); glyph(c, 'plus', w - 120 * k, h - 61 * k, 24 * k, C.onPriC); T(c, 'New', w - 98 * k, h - 52 * k, 21 * k, 600, C.onPriC);
    sheet.userData.tex.needsUpdate = true;
  };
  sheet.userData.pick = { kind: 'sheet' };

  let clockTick = 0;
  return {
    group, targets,
    update(dt, t, hit) {
      root.rotation.y = Math.sin(t * 0.35) * 0.22;
      root.rotation.x = -0.04 + Math.sin(t * 0.27) * 0.03;
      const p = pickOf(hit);
      for (const d of icons) {
        const on = p === d && !open;
        d.z.to = d.base + (on ? 0.05 : 0); d.s.to = on ? 1.18 : 1;
        const s = d.s.step(dt);
        d.m.position.z = d.z.step(dt);
        // squash-and-stretch on the way up: the Expressive "springy" feel
        d.m.scale.set(s * (1 + (s - d.s.to) * 0.6), s * (1 - (s - d.s.to) * 0.6), s);
        d.spin = damp(d.spin, 0, 5, dt);
        d.m.rotation.z = on ? Math.sin(t * 6) * 0.06 : d.spin;
      }
      for (const m of [clockW, weatherW, search]) {
        const d = m.userData.pick, on = p === d && !open;
        d.z.to = d.base + (on ? 0.04 : 0); m.position.z = d.z.step(dt);
      }
      const o = sheetT.step(dt);
      sheet.visible = o > 0.01;
      if (sheet.visible && open) {
        const from = open.m.position;
        sheet.position.set(lerp(from.x, 0, o), lerp(from.y, -0.01, o), lerp(from.z, 0.12, o));
        sheet.scale.setScalar(Math.max(0.05, 0.16 + 0.84 * o));
        sheet.material.opacity = clamp(o * 1.5, 0, 1);
      }
      if (sheetT.to === 0 && o < 0.02) { open = null; targets.includes(sheet) && targets.splice(targets.indexOf(sheet), 1); }
      clockTick -= dt;
      if (clockTick <= 0) { clockTick = 1; clockW.userData.tex?.redraw(t); }
    },
    click(hit) {
      const p = pickOf(hit);
      if (open) { sheetT.to = 0; return; }
      if (p?.kind === 'icon') {
        open = p; p.spin = Math.PI * 2; p.z.vel += 0.6;
        paintSheet(p.id); sheetT.v = 0; sheetT.to = 1;
        if (!targets.includes(sheet)) targets.push(sheet);
      } else if (p) p.z.vel += 0.8;
    },
  };
}

// =====================================================================================================
// 2. Phone, reimagined: "Material Spaces". The phone is a window into depth: widgets sit at tonal
//    elevations and the app drawer is a stack of pages receding behind the glass.
// =====================================================================================================
const DRAWER = [
  ['Social', ['messages', 'gmail', 'phone', 'photos']],
  ['Create', ['camera', 'docs', 'keep', 'music']],
  ['Get around', ['maps', 'wallet', 'calendar', 'clock']],
  ['Watch & play', ['youtube', 'tv', 'fit', 'home']],
  ['Tools', ['settings', 'files', 'chrome', 'gemini']],
];
function layoutPhone() {
  const group = new THREE.Group(), targets = [];
  const W = 0.44, H = 0.86, DEPTH = 0.27;
  const frame = portal(W, H, 0.06, { depth: DEPTH, bezel: 0.016, back: (ctx, w, h) => {
    wallpaper(ctx, w, h, 2);
  } });
  group.add(frame);
  // Status bar stays on the glass; everything else lives in the room behind or floats in front.
  const sbar = tp(0.4, 0.03, 0, 60, (ctx, w, h) => statusBar(ctx, w, h * 0.78, { font: F, size: h * 0.62, pad: 18 }));
  sbar.position.set(0, H / 2 - 0.035, 0.002); group.add(sbar);

  // At a Glance in big expressive type, just behind the glass.
  const glance = tp(0.38, 0.12, 0, 300, (ctx, w, h) => {
    const k = h / 120;
    T(ctx, new Date().toLocaleDateString('en-US', { weekday: 'long' }), 0, 50 * k, 46 * k, 600, '#fff');
    T(ctx, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + ' · 64° sunny', 0, 98 * k, 30 * k, 400, '#d6dcf0');
  });
  glance.position.set(0.0, 0.315, -0.1); group.add(glance);

  // Widgets at Material's tonal elevation levels, each a real distance from the glass.
  const widgets = [];
  const addWidget = (m, x, y, z, level, [tx, ty] = [0, -0.1]) => {
    m.position.set(x, y, z); group.add(m);
    const tagL = label3d(`Level ${level}`, { height: 0.016, font: F, weight: 600, color: '#a8c8ff' });
    tagL.position.set(x + tx, y + ty, z + 0.001); group.add(tagL);
    const d = { kind: 'widget', m, base: z, z: new Spring(z, 280, 13) };
    tag(m, d); targets.push(m); widgets.push(d);
  };
  const clockW = icon3d({ shape: 'cookie', size: 0.16, depth: 0.045, side: 0x2a4a7a, face: (ctx, w, h) => {
    ctx.fillStyle = C.priC; ctx.fillRect(0, 0, w, h);
    const [hh, mm] = clockStr().split(':');
    T(ctx, hh.padStart(2, '0'), w / 2, h * 0.47, h * 0.36, 700, C.onPriC, 'center');
    T(ctx, mm, w / 2, h * 0.84, h * 0.36, 700, C.pri, 'center');
  } });
  addWidget(clockW, -0.1, 0.125, 0.02, 3, [0, -0.095]);
  const weatherW = icon3d({ shape: 'squircle', size: 0.13, depth: 0.035, side: 0x563e5c, face: (ctx, w, h) => {
    ctx.fillStyle = C.terC; ctx.fillRect(0, 0, w, h);
    glyph(ctx, 'sun', w / 2, h * 0.36, w * 0.36, '#ffd58a'); T(ctx, '64°', w / 2, h * 0.82, h * 0.26, 600, C.onTerC, 'center');
  } });
  addWidget(weatherW, 0.11, 0.135, -0.06, 1, [0, -0.082]);
  // Now playing: a pill that floats highest, the thing you reach for most.
  const np = new THREE.Group();
  np.add(new THREE.Mesh(slabGeo(0.36, 0.08, 0.024, 0.04, 0.007), new THREE.MeshPhysicalMaterial({ color: 0x3d4758, roughness: 0.3, clearcoat: 1 })));
  const npf = tp(0.355, 0.076, 0.038, 160, (ctx, w, h) => {
    pill(ctx, 0, 0, w, h, C.secC);
    ctx.save(); ctx.beginPath(); ctx.arc(h / 2, h / 2, h * 0.36, 0, Math.PI * 2); ctx.clip(); photo(ctx, 4, h * 0.14, h * 0.14, h * 0.72, h * 0.72, false); ctx.restore();
    T(ctx, 'Glass Horizons', h + 10, h * 0.44, h * 0.24, 600, C.onSecC);
    T(ctx, 'Aurora Lane', h + 10, h * 0.74, h * 0.19, 400, C.onSecC);
    fillShape(ctx, w - h * 0.62, h / 2, h * 0.34, 'cookie', C.pri); glyph(ctx, 'pause', w - h * 0.62, h / 2, h * 0.3, C.onPri);
  });
  npf.position.z = 0.0125; np.add(npf);
  addWidget(np, 0, -0.015, 0.07, 5, [0.13, -0.052]);

  // App drawer: pages of four icons stacked into the depth of the phone. The front page is live.
  const pages = DRAWER.map(([name, ids], pi) => {
    const pg = new THREE.Group();
    const card = tp(0.38, 0.17, 0.04, 260, (ctx, w, h) => {
      fillRR(ctx, 0, 0, w, h, h * 0.24, 'rgba(39,42,47,0.92)');
      T(ctx, name, 22, 40, 26, 600, C.on);
      T(ctx, `${pi + 1}/${DRAWER.length}`, w - 22, 40, 22, 500, C.onv, 'right');
    });
    pg.add(card); card.material.depthWrite = false;
    const icons = ids.map((id, i) => {
      const m = appIcon(id, 0.064, (pi + i) % 4, ['circle', 'cookie', 'circle', 'squircle'][i], 0.022);
      m.position.set(-0.135 + i * 0.09, -0.022, 0.016); pg.add(m);
      const d = { kind: 'dicon', page: pi, m, z: new Spring(0.016, 320, 12) };
      tag(m, d);
      return d;
    });
    tag(card, { kind: 'page', page: pi });
    group.add(pg); targets.push(pg);
    return { pg, card, icons, y: new Spring(0, 140, 16), z: new Spring(0, 140, 16), s: new Spring(1, 140, 16) };
  });
  let front = 0, drag = 0;
  const advance = (dir) => { front = (front + dir + pages.length) % pages.length; };
  let clockTick = 0;
  const hint = label3d('Click or drag the stack to flip through the app drawer', { height: 0.017, font: F, weight: 500, color: '#c4c6d0' });
  hint.position.set(0, -0.395, 0.01); group.add(hint);

  return {
    group, targets,
    update(dt, t, hit) {
      group.rotation.y = Math.sin(t * 0.3) * 0.12;
      const p = pickOf(hit);
      for (const d of widgets) { d.z.to = d.base + (p === d ? 0.05 : 0); d.m.position.z = d.z.step(dt); }
      pages.forEach((P, i) => {
        const r = (i - front + pages.length) % pages.length;
        P.y.to = -0.22 + r * 0.03; P.z.to = 0.03 - r * 0.075; P.s.to = 1 - r * 0.06;
        P.pg.position.set(0, P.y.step(dt), P.z.step(dt)); P.pg.scale.setScalar(P.s.step(dt));
        P.pg.visible = r < 3;
        P.card.material.opacity = 1 - r * 0.3;
        for (const d of P.icons) { d.z.to = 0.016 + (r === 0 && p === d ? 0.05 : 0); d.m.position.z = d.z.step(dt); }
      });
      clockTick -= dt;
      if (clockTick <= 0) { clockTick = 1; clockW.userData.tex?.redraw(t); }
    },
    click(hit) {
      const p = pickOf(hit);
      if (p?.kind === 'dicon' && p.page === front) { p.z.vel += 1.2; return; }
      if (p?.kind === 'page' || p?.kind === 'dicon') { advance(p.page === front ? 1 : (p.page - front + pages.length) % pages.length); return; }
      if (p?.kind === 'widget') { p.z.vel += 1; return; }
      advance(1);
    },
    drag(dx, dy) { const step = Math.trunc((dy - drag) / 45); if (step) { advance(step > 0 ? -1 : 1); drag = dy; } },
    dragEnd() { drag = 0; },
  };
}

// =====================================================================================================
// 3. Tablet, reimagined: split apps as the two pages of an open book, a floating taskbar in front.
// =====================================================================================================
function drawApp(ctx, w, h, id, focused) {
  const u = h / 100;
  fillRR(ctx, 0, 0, w, h, 5 * u, C.bg);
  if (focused) { rr(ctx, 3, 3, w - 6, h - 6, 5 * u); ctx.strokeStyle = C.pri; ctx.lineWidth = 6; ctx.stroke(); }
  const [g, name] = APPS[id];
  fillShape(ctx, 8 * u, 8.5 * u, 4 * u, 'cookie', C.priC); glyph(ctx, g, 8 * u, 8.5 * u, 4.4 * u, C.onPriC);
  T(ctx, name, 14 * u, 11 * u, 5 * u, 600, C.on);
  pill(ctx, w / 2 - 4 * u, 1.5 * u, 8 * u, 1 * u, C.out);
  const X = 4 * u, Y = 18 * u, CW = w - 8 * u;
  if (id === 'photos' || id === 'youtube') {
    const cols = id === 'photos' ? 3 : 2, gw = (CW - (cols - 1) * 1.5 * u) / cols, gh = id === 'photos' ? gw : gw * 0.58;
    for (let i = 0; i < cols * 4; i++) {
      const x = X + (i % cols) * (gw + 1.5 * u), y = Y + Math.floor(i / cols) * (gh + (id === 'youtube' ? 9 : 1.5) * u);
      if (y + gh > h - 3 * u) break;
      ctx.save(); rr(ctx, x, y, gw, gh, 2.5 * u); ctx.clip(); photo(ctx, i, x, y, gw, gh, i % 3 === 0); ctx.restore();
      if (id === 'youtube') { T(ctx, ['Building a 3D UI', 'Kyoto in 4K', 'Material shapes', 'Aurora timelapse', 'Bike fixes', 'Lo-fi mix'][i % 6], x, y + gh + 4.5 * u, 3.2 * u, 500, C.on); }
    }
  } else if (id === 'messages' || id === 'gmail') {
    const rows = id === 'gmail'
      ? [['Ana Reyes', 'Kyoto trip, day 2 plan'], ['Pixel Team', 'Your tablet tips'], ['Theo', 'Climbing Saturday?'], ['Calendar', 'Design review moved'], ['Maya', 'Prototype in 3D'], ['Sam', 'Glass specs']]
      : null;
    if (rows) rows.forEach(([n, s], i) => {
      const y = Y + i * 12.5 * u;
      fillRR(ctx, X, y, CW, 11 * u, 4 * u, i === 0 ? C.priC : C.sc);
      fillShape(ctx, X + 6 * u, y + 5.5 * u, 3.6 * u, 'circle', [C.ter, C.pri, C.grn, C.sec][i % 4]);
      T(ctx, n[0], X + 6 * u, y + 7 * u, 3.6 * u, 700, '#1b1b21', 'center');
      T(ctx, n, X + 12 * u, y + 4.6 * u, 3.2 * u, 600, i === 0 ? C.onPriC : C.on);
      T(ctx, s, X + 12 * u, y + 8.6 * u, 2.9 * u, 400, i === 0 ? C.onPriC : C.onv);
    });
    else {
      const bub = (s, y, me) => { ctx.font = `400 ${3.4 * u}px ${F}`; const tw = ctx.measureText(s).width + 6 * u; fillRR(ctx, me ? X + CW - tw : X, y, tw, 8 * u, 4 * u, me ? C.priC : C.sch); T(ctx, s, me ? X + CW - tw + 3 * u : X + 3 * u, y + 5.4 * u, 3.4 * u, 400, me ? C.onPriC : C.on); };
      bub('Is the book layout weird?', Y + 2 * u, false); bub('No, it feels like a real tablet', Y + 13 * u, true);
      bub('Pages tilt toward you', Y + 24 * u, false); bub('Taskbar floats in front!', Y + 35 * u, true);
      ctx.save(); rr(ctx, X, Y + 46 * u, CW * 0.6, 26 * u, 4 * u); ctx.clip(); photo(ctx, 2, X, Y + 46 * u, CW * 0.6, 26 * u); ctx.restore();
      pill(ctx, X, h - 13 * u, CW, 9 * u, C.sch); T(ctx, 'RCS message', X + 4 * u, h - 7.4 * u, 3.2 * u, 400, C.onv);
    }
  } else if (id === 'maps') {
    fillRR(ctx, X, Y, CW, h - Y - 4 * u, 4 * u, '#1f2a24');
    ctx.save(); rr(ctx, X, Y, CW, h - Y - 4 * u, 4 * u); ctx.clip();
    ctx.strokeStyle = '#3c4b42'; ctx.lineWidth = 2.2 * u; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(X - 10 * u, Y + i * 10 * u); ctx.lineTo(X + CW + 10 * u, Y + i * 10 * u - 18 * u); ctx.stroke(); }
    ctx.strokeStyle = '#2f5d7c'; ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.moveTo(X + CW * 0.1, h); ctx.bezierCurveTo(X + CW * 0.4, Y + 30 * u, X + CW * 0.6, Y + 60 * u, X + CW, Y + 10 * u); ctx.stroke();
    ctx.strokeStyle = C.pri; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(X + CW * 0.2, Y + 70 * u); ctx.lineTo(X + CW * 0.45, Y + 40 * u); ctx.lineTo(X + CW * 0.75, Y + 28 * u); ctx.stroke();
    ctx.restore();
    fillShape(ctx, X + CW * 0.75, Y + 28 * u, 4 * u, 'cookie', '#ea4335'); glyph(ctx, 'map', X + CW * 0.75, Y + 28 * u, 4 * u, '#fff');
    pill(ctx, X + 3 * u, Y + 3 * u, CW - 6 * u, 8 * u, C.sch); glyph(ctx, 'search', X + 8 * u, Y + 7 * u, 3.4 * u, C.onv); T(ctx, 'Fushimi Inari Taisha', X + 13 * u, Y + 8.4 * u, 3.2 * u, 500, C.on);
  } else {
    // Keep-style notes
    const notes = [['Trip ideas', C.priC, C.onPriC], ['Groceries', C.terC, C.onTerC], ['Depth rules', C.grnC, '#c8f0b0'], ['Gift list', C.secC, C.onSecC]];
    notes.forEach(([n, bg, fg], i) => {
      const x = X + (i % 2) * (CW / 2 + 1 * u), y = Y + Math.floor(i / 2) * 36 * u, ww = CW / 2 - 1 * u;
      fillRR(ctx, x, y, ww, 33 * u, 4 * u, bg); T(ctx, n, x + 3 * u, y + 7 * u, 3.6 * u, 700, fg);
      for (let k = 0; k < 4; k++) fillRR(ctx, x + 3 * u, y + (12 + k * 5) * u, ww * (k === 3 ? 0.4 : 0.8), 1.6 * u, 0.8 * u, 'rgba(255,255,255,.35)');
    });
  }
}
function layoutTablet() {
  const group = new THREE.Group(), targets = [];
  const W = 1.36, H = 0.84, DEPTH = 0.22;
  group.add(portal(W, H, 0.05, { depth: DEPTH, bezel: 0.02, back: (ctx, w, h) => {
    wallpaper(ctx, w, h, 1);
    statusBar(ctx, w, 0.05 * h, { font: F, size: 0.03 * h, pad: 0.03 * w });
  } }));

  // Two panes hinged on a spine behind the glass, opened toward you like a book.
  const PW = 0.6, PH = 0.6, SPINE_Z = -0.13;
  const panes = [-1, 1].map((side, i) => {
    const pivot = new THREE.Group(); pivot.position.set(0, 0.05, SPINE_Z); group.add(pivot);
    const app = { id: i ? 'messages' : 'photos', focused: false };
    const m = tp(PW, PH, 0.03, 760, (ctx, w, h) => drawApp(ctx, w, h, app.id, app.focused));
    m.material.transparent = false; m.material.depthWrite = true;
    m.position.x = side * (PW / 2 + 0.008); pivot.add(m);
    const d = { kind: 'pane', side, pivot, m, app, a: new Spring(0.38, 120, 14), z: new Spring(SPINE_Z, 120, 14), s: new Spring(1, 120, 14) };
    tag(m, d); targets.push(m);
    return d;
  });
  // Spine: a slim divider handle between the pages.
  const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.14, 4, 12), new THREE.MeshStandardMaterial({ color: 0xc4c6d0, roughness: 0.4 }));
  spine.position.set(0, 0.05, SPINE_Z + 0.01); group.add(spine);

  // Floating taskbar with solid app icons, in front of the glass.
  const bar = new THREE.Group(); bar.position.set(0, -0.33, 0.08); group.add(bar);
  bar.add(new THREE.Mesh(slabGeo(0.66, 0.1, 0.02, 0.05, 0.006), new THREE.MeshPhysicalMaterial({ color: 0x272a2f, roughness: 0.35, clearcoat: 1, transparent: true, opacity: 0.92 })));
  const ids = ['photos', 'messages', 'gmail', 'maps', 'youtube', 'keep'];
  const barIcons = ids.map((id, i) => {
    const m = appIcon(id, 0.07, i % 4, i % 2 ? 'cookie' : 'circle', 0.024);
    m.position.set(-0.25 + i * 0.1, 0, 0.022); bar.add(m);
    const d = { kind: 'bar', id, m, z: new Spring(0.022, 320, 12) };
    tag(m, d); targets.push(m);
    return d;
  });
  let focus = null, lastPane = panes[0];
  const repaint = () => panes.forEach((p) => { p.app.focused = focus === p; p.m.userData.tex.redraw(); });

  return {
    group, targets,
    update(dt, t, hit) {
      const p = pickOf(hit);
      if (p?.kind === 'pane') lastPane = p;
      for (const P of panes) {
        const hov = p === P;
        if (focus) { P.a.to = focus === P ? 0.02 : 0.75; P.z.to = SPINE_Z + (focus === P ? 0.1 : -0.02); P.s.to = focus === P ? 1.12 : 0.92; }
        else { P.a.to = hov ? 0.18 : 0.38; P.z.to = SPINE_Z + (hov ? 0.03 : 0); P.s.to = 1; }
        P.pivot.rotation.y = -P.side * P.a.step(dt);
        P.pivot.position.z = P.z.step(dt);
        if (focus !== P) P.pivot.position.x = damp(P.pivot.position.x, 0, 6, dt);
        P.pivot.scale.setScalar(P.s.step(dt));
      }
      // When one pane is focused, slide it to the middle so it faces you squarely.
      if (focus) focus.pivot.position.x = damp(focus.pivot.position.x, -focus.side * (PW / 2) * focus.s.v, 6, dt);
      for (const d of barIcons) { d.z.to = 0.022 + (p === d ? 0.045 : 0); d.m.position.z = d.z.step(dt); }
      group.rotation.y = Math.sin(t * 0.25) * 0.06;
    },
    click(hit) {
      const p = pickOf(hit);
      if (p?.kind === 'pane') { focus = focus === p ? null : p; repaint(); return; }
      if (p?.kind === 'bar') {
        const target = focus || lastPane;
        target.app.id = p.id; p.z.vel += 1.2; repaint();
        return;
      }
      if (focus) { focus = null; repaint(); }
    },
  };
}

// =====================================================================================================
// 4. Monitor, reimagined: a ChromeOS desktop whose windows sit at tiers of depth, Gemini floating forward.
// =====================================================================================================
function drawWindow(ctx, w, h, kind, front) {
  const u = h / 100;
  fillRR(ctx, 0, 0, w, h, 3.5 * u, kind === 'files' ? '#1d2024' : '#f8f9fc');
  const dark = kind === 'files';
  fillRR(ctx, 0, 0, w, 10 * u, 3.5 * u, dark ? '#272a2f' : '#e7ebf3'); ctx.fillStyle = dark ? '#272a2f' : '#e7ebf3'; ctx.fillRect(0, 6 * u, w, 4 * u);
  if (front) { rr(ctx, 2, 2, w - 4, h - 4, 3.5 * u); ctx.strokeStyle = C.pri; ctx.lineWidth = 5; ctx.stroke(); }
  const title = { docs: 'Kyoto weekend · Docs', photos: 'Photos', files: 'Files · Spatial UI' }[kind];
  T(ctx, title, 3 * u, 6.8 * u, 3.6 * u, 500, dark ? C.on : '#1f1f1f');
  for (let i = 0; i < 3; i++) { ctx.fillStyle = dark ? C.onv : '#5f6368'; ctx.beginPath(); ctx.arc(w - (3 + i * 4) * u, 5 * u, 0.9 * u, 0, Math.PI * 2); ctx.fill(); }
  if (kind === 'docs') {
    fillRR(ctx, 8 * u, 14 * u, w - 16 * u, h - 16 * u, 0.8 * u, '#fff');
    T(ctx, 'Kyoto weekend', 13 * u, 25 * u, 6 * u, 500, '#1f1f1f');
    for (let i = 0; i < 12; i++) fillRR(ctx, 13 * u, 31 * u + i * 4.6 * u, (w - 26 * u) * (i % 4 === 3 ? 0.55 : 0.95), 1.6 * u, 0.8 * u, '#d7dbe2');
  } else if (kind === 'photos') {
    T(ctx, 'Recent', 3 * u, 19 * u, 4 * u, 600, '#1f1f1f');
    const gw = (w - 6 * u - 3 * 1.2 * u) / 4;
    for (let i = 0; i < 12; i++) { const x = 3 * u + (i % 4) * (gw + 1.2 * u), y = 23 * u + Math.floor(i / 4) * (gw + 1.2 * u); if (y + gw > h) break; ctx.save(); rr(ctx, x, y, gw, gw, 1.5 * u); ctx.clip(); photo(ctx, i + 2, x, y, gw, gw, i % 2 === 0); ctx.restore(); }
  } else {
    ['Glass layers', 'Material shapes', 'Depth tiers', 'Prototype', 'Icons 3D', 'Specs'].forEach((s, i) => {
      const x = 4 * u + (i % 3) * 33 * u, y = 18 * u + Math.floor(i / 3) * 38 * u;
      fillRR(ctx, x, y, 26 * u, 20 * u, 3 * u, [C.priC, C.terC, C.secC][i % 3]);
      glyph(ctx, 'note', x + 13 * u, y + 10 * u, 9 * u, '#fff');
      T(ctx, s, x + 13 * u, y + 27 * u, 3.4 * u, 500, C.on, 'center');
    });
  }
}
function layoutMonitor() {
  const group = new THREE.Group(), targets = [];
  const W = 1.34, H = 0.72, DEPTH = 0.24, Y = 0.07;
  const mon = portal(W, H, 0.02, { depth: DEPTH, bezel: 0.016, color: 0x2b2e34, back: (ctx, w, h) => {
    blobs(ctx, w, h, '#1b2433', [[0.1, 0.2, 0.6, '#3a6ea5'], [0.8, 0.2, 0.5, '#7a5aa6'], [0.6, 1, 0.5, '#2e7d74']]);
  } });
  mon.position.y = Y; group.add(mon);
  // stand
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.03), metal(0x2b2e34, 0.35, 0.6));
  neck.position.set(0, Y - H / 2 - 0.07, -DEPTH - 0.02); group.add(neck);
  const foot = new THREE.Mesh(slabGeo(0.36, 0.16, 0.016, 0.03), metal(0x2b2e34, 0.35, 0.6));
  foot.rotation.x = -Math.PI / 2; foot.position.set(0, Y - H / 2 - 0.15, -DEPTH + 0.04); group.add(foot);

  // Windows at three depth tiers; the front tier is the active window.
  const TIERS = [-0.05, -0.11, -0.17];
  const wins = [['docs', 0.6, 0.44, -0.28, 0.1], ['photos', 0.48, 0.36, 0.0, 0.0], ['files', 0.44, 0.3, 0.1, 0.17]].map(([kind, w, h, x, y], i) => {
    const st = { front: i === 0 };
    const m = tp(w, h, 0.012, 640, (ctx, W2, H2) => drawWindow(ctx, W2, H2, kind, st.front));
    m.material.transparent = false; m.material.depthWrite = true;
    m.position.set(x, Y + y, TIERS[i]); group.add(m);
    const d = { kind: 'win', id: kind, m, st, z: new Spring(TIERS[i], 140, 15), lift: new Spring(0, 220, 16) };
    tag(m, d); targets.push(m);
    return d;
  });
  let order = [0, 1, 2];
  const toFront = (i) => { order = [i, ...order.filter((x) => x !== i)]; wins.forEach((w, k) => { w.st.front = order[0] === k; w.m.userData.tex.redraw(); }); };

  // Gemini side panel, floating in front of the glass on the right.
  let gemOpen = true;
  const gem = tp(0.32, 0.5, 0.03, 700, (ctx, w, h) => {
    const u = h / 100;
    fillRR(ctx, 0, 0, w, h, 6 * u, 'rgba(29,32,36,0.96)');
    const gr = ctx.createLinearGradient(0, 0, w, 0); GEM.forEach((c, k) => gr.addColorStop(k / 3, c));
    ctx.strokeStyle = gr; ctx.lineWidth = 0.8 * u; rr(ctx, 1, 1, w - 2, h - 2, 6 * u); ctx.stroke();
    glyph(ctx, 'sparkle', 8 * u, 8 * u, 6 * u, '#8fb4ff'); T(ctx, 'Gemini', 14 * u, 10 * u, 4.4 * u, 500, C.on);
    T(ctx, 'Hello, Joe', 6 * u, 24 * u, 7 * u, 500, '#a8c8ff');
    wrapText(ctx, gemOpen ? 'I can see your three windows. Want me to turn the Kyoto doc into a day-by-day plan with photos?' : 'Ask about anything on screen.', 6 * u, 32 * u, w - 12 * u, 4.6 * u, 3.4 * u, 400, C.onv, 5);
    (gemOpen ? ['Make a day-by-day plan', 'Add photos from Kyoto', 'Summarize Files'] : []).forEach((s, i) => { pill(ctx, 6 * u, 58 * u + i * 9 * u, w - 12 * u, 7 * u, C.schh); T(ctx, s, 10 * u, 62.8 * u + i * 9 * u, 3.2 * u, 500, C.on); });
    pill(ctx, 5 * u, h - 11 * u, w - 10 * u, 7.5 * u, C.schh); T(ctx, 'Ask Gemini', 10 * u, h - 6 * u, 3.2 * u, 400, C.onv);
  });
  gem.position.set(0.46, Y + 0.03, 0.08); group.add(gem);
  const gemD = { kind: 'gem', z: new Spring(0.08, 200, 15) }; tag(gem, gemD); targets.push(gem);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('#6d8cff'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.35, toneMapped: false }));
  halo.scale.set(0.46, 0.62, 1); halo.position.set(0.46, Y + 0.03, 0.06); group.add(halo);

  // Shelf with solid app icons, just in front of the glass.
  const shelf = new THREE.Group(); shelf.position.set(0, Y - H / 2 + 0.045, 0.03); group.add(shelf);
  shelf.add(new THREE.Mesh(slabGeo(0.5, 0.062, 0.014, 0.031, 0.005), new THREE.MeshPhysicalMaterial({ color: 0x1c1f24, roughness: 0.35, clearcoat: 1 })));
  const shelfIds = [['chrome', null], ['docs', 0], ['photos', 1], ['files', 2], ['gmail', null], ['youtube', null], ['settings', null]];
  const shelfIcons = shelfIds.map(([id, win], i) => {
    const m = appIcon(id, 0.046, i % 4, 'circle', 0.016);
    m.position.set(-0.195 + i * 0.065, 0, 0.014); shelf.add(m);
    const d = { kind: 'shelf', win, m, z: new Spring(0.014, 320, 12) };
    tag(m, d); targets.push(m);
    return d;
  });

  return {
    group, targets,
    update(dt, t, hit) {
      const p = pickOf(hit);
      order.forEach((wi, tier) => {
        const w = wins[wi];
        w.z.to = TIERS[tier]; w.lift.to = p === w && tier > 0 ? 0.025 : 0;
        w.m.position.z = w.z.step(dt) + w.lift.step(dt);
        w.m.renderOrder = 3 - tier;
      });
      gemD.z.to = 0.08 + (p === gemD ? 0.03 : 0); gem.position.z = gemD.z.step(dt);
      halo.material.opacity = 0.28 + 0.12 * Math.sin(t * 2.2);
      for (const d of shelfIcons) { d.z.to = 0.014 + (p === d ? 0.035 : 0); d.m.position.z = d.z.step(dt); }
      group.rotation.y = Math.sin(t * 0.22) * 0.06;
    },
    click(hit) {
      const p = pickOf(hit);
      if (p?.kind === 'win') toFront(wins.indexOf(p));
      else if (p?.kind === 'gem') { gemOpen = !gemOpen; gem.userData.tex.redraw(); gemD.z.vel += 0.8; }
      else if (p?.kind === 'shelf') { p.z.vel += 1.2; if (p.win !== null) toFront(p.win); }
    },
  };
}

// =====================================================================================================
// 5. Home view, reimagined: Google TV on the living-room screen, poster rows on a curved wall.
// =====================================================================================================
const TITLES = ['Northern Lights', 'The Long Orbit', 'Coastline', 'Night Market', 'Red Canyon', 'Bloom', 'Deep Field', 'Harbour', 'Summit', 'Neon Rain', 'Tidepool', 'Paper Moon', 'Glasswork', 'First Light'];
function layoutHome() {
  const group = new THREE.Group(), targets = [];
  const W = 1.48, H = 0.8, DEPTH = 0.32, Y = 0.04;
  const tv = portal(W, H, 0.012, { depth: DEPTH, bezel: 0.012, color: 0x15171a, back: (ctx, w, h) => {
    ctx.fillStyle = '#07090c'; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.55; photo(ctx, 1, 0, 0, w, h * 0.7, false); ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(7,9,12,0.2)'); g.addColorStop(0.6, 'rgba(7,9,12,0.85)'); g.addColorStop(1, '#07090c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  } });
  tv.position.y = Y; group.add(tv);
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.12), metal(0x2b2d31, 0.35));
    f.position.set(s * W * 0.38, Y - H / 2 - 0.03, -0.1); f.rotation.x = 0.2; group.add(f);
  }

  // Top navigation pills and the hero title, layered just behind the glass.
  const nav = tp(0.9, 0.06, 0, 120, (ctx, w, h) => {
    let x = 16;
    ['For you', 'Live', 'Movies', 'Shows', 'Apps', 'Library'].forEach((s, i) => {
      ctx.font = `500 ${h * 0.42}px ${F}`; const tw = ctx.measureText(s).width;
      if (i === 0) pill(ctx, x - 14, h * 0.12, ctx.measureText(s).width + 28, h * 0.76, '#e8eaf0');
      T(ctx, s, x, h * 0.65, h * 0.42, 500, i === 0 ? '#111' : '#c9d1dc');
      x += tw + 56;
    });
  });
  nav.position.set(-0.22, Y + 0.34, -0.04); group.add(nav);
  const hero = tp(0.5, 0.16, 0, 300, (ctx, w, h) => {
    const k = h / 160;
    T(ctx, 'Northern Lights', 0, 56 * k, 54 * k, 600, '#fff');
    T(ctx, 'Documentary · 2026 · 4K · Dolby Vision', 0, 92 * k, 22 * k, 400, '#c9d1dc');
    pill(ctx, 0, 110 * k, 170 * k, 44 * k, '#fff'); glyph(ctx, 'play', 30 * k, 132 * k, 20 * k, '#111'); T(ctx, 'Watch now', 50 * k, 140 * k, 22 * k, 600, '#111');
  });
  hero.position.set(-0.43, Y + 0.215, -0.16); group.add(hero);

  // Poster rows on a curved wall: the middle sits deepest, the ends curve toward you.
  const R = 0.9, CZ = 0.7;
  let shuffle = 0;
  const posters = [];
  for (let row = 0; row < 2; row++) {
    const lbl = label3d(row ? 'Because you watched Deep Field' : 'Top picks for you', { height: 0.022, font: F, weight: 500, color: '#e8eaf0' });
    lbl.position.set(-0.52 + (row ? 0.06 : 0), Y + (row ? -0.115 : 0.085), -0.12); group.add(lbl);
    for (let i = 0; i < 7; i++) {
      const idx = row * 7 + i, th = -0.66 + i * 0.22;
      const tex = canvasTex(360, 210, (ctx, w, h) => {
        const n = (idx + shuffle) % TITLES.length;
        ctx.save(); rr(ctx, 0, 0, w, h, 18); ctx.clip(); photo(ctx, n, 0, 0, w, h, n % 2 === 0);
        const g = ctx.createLinearGradient(0, h * 0.5, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        T(ctx, TITLES[n], 18, h - 22, 30, 600, '#fff'); ctx.restore();
      });
      const m = panel(0.19, 0.11, 0.012, tex);
      const ring = new THREE.Mesh(screenGeo(0.204, 0.124, 0.018), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
      ring.position.z = -0.002;
      const pg = new THREE.Group(); pg.add(ring, m); group.add(pg);
      const home = new THREE.Vector3(R * Math.sin(th), Y + (row ? -0.2 : 0.0), CZ - R * Math.cos(th));
      const d = { kind: 'poster', idx, pg, ring, tex, home, ry: -th, f: new Spring(0, 200, 14), wave: 0 };
      pg.position.copy(home); pg.rotation.y = d.ry;
      tag(pg, d); targets.push(pg); posters.push(d);
    }
  }

  // Details card that opens from a poster.
  let details = null;
  const card = tp(0.66, 0.36, 0.03, 600, () => {});
  card.visible = false; card.position.set(0, Y, 0.12); group.add(card);
  const cardT = new Spring(0, 160, 16);
  const paintCard = (n) => {
    const c = card.userData.tex.image.getContext('2d'), w = c.canvas.width, h = c.canvas.height, u = h / 100;
    c.clearRect(0, 0, w, h);
    fillRR(c, 0, 0, w, h, 7 * u, C.sc);
    c.save(); rr(c, 3 * u, 3 * u, w * 0.45, h - 6 * u, 5 * u); c.clip(); photo(c, n, 3 * u, 3 * u, w * 0.45, h - 6 * u, true); c.restore();
    const X = w * 0.5;
    T(c, TITLES[n], X, 18 * u, 9 * u, 600, C.on);
    T(c, '2026 · 1h 52m · 4K', X, 27 * u, 4.4 * u, 400, C.onv);
    wrapText(c, 'A film you can lean into: on a 3D TV the poster wall curves around the room and the one you pick steps out to meet you.', X, 38 * u, w * 0.46, 6 * u, 4.4 * u, 400, C.onv, 4);
    pill(c, X, 70 * u, 30 * u, 12 * u, C.pri); glyph(c, 'play', X + 7 * u, 76 * u, 5 * u, C.onPri); T(c, 'Watch', X + 12 * u, 78 * u, 4.6 * u, 600, C.onPri);
    pill(c, X + 33 * u, 70 * u, 30 * u, 12 * u, C.schh); glyph(c, 'plus', X + 40 * u, 76 * u, 5 * u, C.on); T(c, 'Watchlist', X + 44 * u, 78 * u, 4.2 * u, 500, C.on);
    card.userData.tex.needsUpdate = true;
  };
  card.userData.pick = { kind: 'card' };

  // Gemini orb for voice, floating forward in the corner.
  const orb = new THREE.Group(); orb.position.set(0.6, Y - 0.3, 0.12); group.add(orb);
  const glows = GEM.map((c) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(c), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.8 })); s.scale.setScalar(0.12); orb.add(s); return s; });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.022, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  orb.add(core);
  const orbD = { kind: 'orb' }; tag(core, orbD); targets.push(core);
  const ask = label3d('“Find something cozy for tonight”', { height: 0.024, font: F, weight: 500, color: '#dfe6ff' });
  ask.position.set(0.34, Y - 0.3, 0.12); ask.material.opacity = 0; group.add(ask);
  let askT = 0, listen = 0;

  return {
    group, targets,
    update(dt, t, hit) {
      const p = pickOf(hit);
      for (const d of posters) {
        d.f.to = p === d && !details ? 1 : 0;
        const f = d.f.step(dt);
        d.wave = Math.max(0, d.wave - dt);
        const wv = Math.sin(clamp(d.wave, 0, 0.6) / 0.6 * Math.PI) * 0.05;
        d.pg.position.set(d.home.x * (1 - 0.15 * f), d.home.y + wv, d.home.z + f * (0.2 - d.home.z) * 0.7);
        d.pg.rotation.y = d.ry * (1 - f);
        d.pg.scale.setScalar(1 + 0.4 * f);
        d.ring.material.opacity = f;
      }
      listen = damp(listen, askT > 0 ? 1 : 0, 4, dt);
      glows.forEach((s, i) => { const a = t * (0.9 + i * 0.3) + i * 1.6; s.position.set(Math.cos(a) * 0.018, Math.sin(a * 1.2) * 0.018, 0); s.scale.setScalar(0.11 + 0.02 * Math.sin(t * 2 + i) + listen * 0.05); });
      orb.position.z = 0.12 + (p === orbD ? 0.03 : 0);
      askT = Math.max(0, askT - dt); ask.material.opacity = clamp(askT, 0, 1);
      const o = cardT.step(dt);
      card.visible = o > 0.01; card.scale.setScalar(Math.max(0.05, 0.3 + 0.7 * o)); card.material.opacity = clamp(o * 1.4, 0, 1);
      if (cardT.to === 0 && o < 0.02) details = null;
      group.rotation.y = Math.sin(t * 0.2) * 0.05;
    },
    click(hit) {
      const p = pickOf(hit);
      if (details) { cardT.to = 0; const i = targets.indexOf(card); if (i >= 0) targets.splice(i, 1); return; }
      if (p?.kind === 'poster') { details = p; paintCard((p.idx + shuffle) % TITLES.length); cardT.v = 0; cardT.to = 1; targets.push(card); }
      else if (p?.kind === 'orb') {
        askT = 3.2; shuffle = (shuffle + 5) % TITLES.length;
        posters.forEach((d, i) => { d.wave = 0.6 + (i % 7) * 0.08; d.tex.redraw(); });
      }
    },
  };
}

// =====================================================================================================
// =====================================================================================================
// Spatial OS: Android XR's Home Space, made for a glasses-free screen. You look through the display into
// an environment; app panels stand on a curved arc in depth, a launcher orbit of Material shapes circles
// in front, Quick Settings float nearest, and the Gemini orb summons help forward.
// =====================================================================================================
const OS_PANELS = [
  { id: 'youtube', name: 'YouTube', tint: '#ff4e45' },
  { id: 'chrome', name: 'Chrome', tint: '#8ab4ff' },
  { id: 'photos', name: 'Photos', tint: '#ffd27a' },
  { id: 'maps', name: 'Maps', tint: '#9cd67e' },
  { id: 'gmail', name: 'Gmail', tint: '#f2b8b5' },
];
function drawOSPanel(ctx, w, h, p, i, focused) {
  const k = w / 640;
  ctx.fillStyle = '#16181d'; ctx.fillRect(0, 0, w, h);
  // title bar
  fillShape(ctx, 30 * k, 28 * k, 13 * k, 'cookie', p.tint);
  T(ctx, p.name, 52 * k, 36 * k, 22 * k, 600, C.on);
  ['search', 'plus'].forEach((g, j) => glyph(ctx, g, w - (32 + j * 40) * k, 28 * k, 18 * k, C.onv));
  const top = 56 * k, ih = h - top - 14 * k;
  if (p.id === 'youtube') {
    photo(ctx, 6, 14 * k, top, w - 28 * k, ih * 0.66, true);
    fillShape(ctx, w / 2, top + ih * 0.33, 34 * k, 'pill', 'rgba(255,0,0,0.9)'); glyph(ctx, 'play', w / 2 + 3 * k, top + ih * 0.33, 30 * k, '#fff');
    T(ctx, 'Aurora over the fjords · 4K', 16 * k, top + ih * 0.8, 22 * k, 600, C.on); T(ctx, 'Nature Lab · 2.1M views', 16 * k, top + ih * 0.94, 16 * k, 400, C.onv);
  } else if (p.id === 'chrome') {
    pill(ctx, 14 * k, top, w - 28 * k, 34 * k, C.sch); T(ctx, 'android.com/xr', 34 * k, top + 23 * k, 16 * k, 400, C.onv);
    T(ctx, 'Spatial apps, on any screen', 16 * k, top + 78 * k, 30 * k, 600, C.on);
    wrapText(ctx, 'Panels you can arrange in depth, an environment behind the glass, and Gemini that brings the right window to you.', 16 * k, top + 112 * k, w - 32 * k, 24 * k, 17 * k, 400, C.onv, 3);
    photo(ctx, 2, 16 * k, top + 190 * k, w - 32 * k, ih - 196 * k, false);
  } else if (p.id === 'photos') {
    for (let j = 0; j < 12; j++) { const cw = (w - 40 * k) / 4, ch = (ih - 20 * k) / 3; photo(ctx, j, 14 * k + (j % 4) * (cw + 4 * k), top + Math.floor(j / 4) * (ch + 6 * k), cw, ch, j % 3 === 0); }
  } else if (p.id === 'maps') {
    ctx.fillStyle = '#1d2a22'; ctx.fillRect(14 * k, top, w - 28 * k, ih);
    ctx.strokeStyle = '#2f4436'; ctx.lineWidth = 10 * k;
    for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.moveTo(14 * k, top + j * ih / 5); ctx.lineTo(w - 14 * k, top + j * ih / 5 + 30 * k); ctx.stroke(); }
    ctx.strokeStyle = '#8ab4ff'; ctx.lineWidth = 7 * k; ctx.beginPath(); ctx.moveTo(60 * k, top + ih * 0.85); ctx.lineTo(250 * k, top + ih * 0.5); ctx.lineTo(w - 90 * k, top + ih * 0.25); ctx.stroke();
    fillShape(ctx, w - 90 * k, top + ih * 0.25, 14 * k, 'circle', '#ff5449');
    pill(ctx, 20 * k, top + 10 * k, 230 * k, 46 * k, 'rgba(22,24,29,0.92)'); T(ctx, '18 min · Ritual Coffee', 38 * k, top + 40 * k, 17 * k, 600, C.on);
  } else {
    [['Ana Reyes', 'Kyoto trip, day 2 plan'], ['Pixel Team', 'Your Android XR tips'], ['Theo', 'Climbing Saturday?'], ['Calendar', 'Design review moved']].forEach(([a, b], j) => {
      const y = top + j * (ih / 4);
      fillShape(ctx, 36 * k, y + 30 * k, 20 * k, 'circle', [C.priC, C.terC, C.grnC, C.secC][j]);
      T(ctx, a[0], 36 * k, y + 37 * k, 18 * k, 600, C.on, 'center');
      T(ctx, a, 70 * k, y + 26 * k, 19 * k, 600, C.on); T(ctx, b, 70 * k, y + 50 * k, 16 * k, 400, C.onv);
    });
  }
  if (focused) { ctx.strokeStyle = p.tint; ctx.lineWidth = 6 * k; rr(ctx, 3 * k, 3 * k, w - 6 * k, h - 6 * k, 22 * k); ctx.stroke(); }
}
function layoutOS() {
  const group = new THREE.Group(), targets = [];
  let night = false, focus = -1, arc = 0, dragStart = null, summoned = false;

  // Environment behind the glass: a sky wall and a floor with a grid that runs back into it.
  const env = tp(2.2, 1.2, 0, 700, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (night) { g.addColorStop(0, '#05070f'); g.addColorStop(0.6, '#13183a'); g.addColorStop(1, '#1d2148'); }
    else { g.addColorStop(0, '#6f9fe0'); g.addColorStop(0.55, '#f2c7a5'); g.addColorStop(1, '#e7a07a'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (night) {
      for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`; ctx.fillRect(Math.random() * w, Math.random() * h * 0.6, 2, 2); }
      ctx.globalAlpha = 0.45; const a = ctx.createLinearGradient(0, h * 0.1, w, h * 0.4); a.addColorStop(0, 'rgba(80,255,180,0)'); a.addColorStop(0.5, 'rgba(80,255,180,0.8)'); a.addColorStop(1, 'rgba(120,120,255,0)');
      ctx.fillStyle = a; ctx.beginPath(); ctx.moveTo(0, h * 0.35); ctx.bezierCurveTo(w * 0.3, h * 0.05, w * 0.6, h * 0.45, w, h * 0.15); ctx.lineTo(w, h * 0.3); ctx.bezierCurveTo(w * 0.6, h * 0.55, w * 0.3, h * 0.2, 0, h * 0.45); ctx.fill(); ctx.globalAlpha = 1;
    } else { ctx.fillStyle = 'rgba(255,245,225,0.95)'; ctx.beginPath(); ctx.arc(w * 0.7, h * 0.42, h * 0.07, 0, Math.PI * 2); ctx.fill(); }
    [[night ? '#1a1d36' : '#8a7aa8', 0.62], [night ? '#121428' : '#5e5a86', 0.7], [night ? '#0b0c1a' : '#3d3d63', 0.8]].forEach(([c, b], i) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= 40; x++) ctx.lineTo((x / 40) * w, h * b - Math.abs(Math.sin(x * 0.45 + i * 1.7)) * h * 0.12 - Math.sin(x * 0.13 + i) * h * 0.05);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    });
  }, { transparent: false });
  env.material.depthWrite = true; env.position.z = -0.34; group.add(env);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.36), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#20232c'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = 'rgba(160,190,255,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 24; i++) { ctx.beginPath(); ctx.moveTo((i / 24) * w, 0); ctx.lineTo((i / 24) * w, h); ctx.stroke(); }
    for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(0, (i / 6) * h); ctx.lineTo(w, (i / 6) * h); ctx.stroke(); }
  }), transparent: true, opacity: 0.8, toneMapped: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.43, -0.16); group.add(floor);

  // App panels on a curved arc around you.
  const R = 1.0, CZ = 0.74, PW = 0.34, PH = 0.23;
  const panels = OS_PANELS.map((p, i) => {
    const m = tp(PW, PH, 0.03, 420, (ctx, w, h) => drawOSPanel(ctx, w, h, p, i, focus === i), { transparent: false });
    m.material.depthWrite = true;
    const bar = new THREE.Mesh(screenGeo(0.07, 0.008, 0.004), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
    bar.position.set(0, -PH / 2 - 0.018, 0); m.add(bar);
    m.userData.p = { th: new Spring(0, 90, 14), x: new Spring(0, 110, 15), z: new Spring(-0.3, 110, 15), ry: new Spring(0, 110, 15), k: new Spring(1, 110, 15), y: new Spring(0, 110, 15) };
    tag(m, { panel: i }); group.add(m); targets.push(m);
    return m;
  });

  // Launcher orbit: solid Material-shape icons circling in front of the glass.
  const ORBIT = [['youtube', 0, 'cookie', 0], ['chrome', 1, 'circle', 1], ['photos', 2, 'clover', 2], ['maps', 3, 'squircle', 3], ['gmail', 0, 'sunny', 4], ['music', 1, 'circle', -1], ['gemini', 2, 'cookie', -2], ['settings', 3, 'clover', -3]];
  const orbit = new THREE.Group(); orbit.position.set(0, -0.33, 0.02); group.add(orbit);
  const orbitIcons = ORBIT.map(([id, tone, shape, act]) => {
    const ic = appIcon(id, 0.075, tone, shape === 'sunny' ? 'cookie' : shape); tag(ic, { app: act }); orbit.add(ic); targets.push(ic); return ic;
  });
  let orbitA = 0;

  // Gemini orb: layered glows around a shifting sphere.
  const orb = new THREE.Group(); orb.position.set(0.66, 0.2, 0.08); group.add(orb);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.045, 32, 20), new THREE.MeshStandardMaterial({ color: 0x8f6df0, emissive: 0x4b8bff, emissiveIntensity: 1.1, roughness: 0.2 }));
  orb.add(core); tag(core, { orb: true }); targets.push(core);
  const halos = GEM.map((c, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(c), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(0.16 + i * 0.03); orb.add(s); return s; });
  const answer = tp(0.42, 0.2, 0.03, 420, (ctx, w, h) => {
    const k = w / 420;
    fillRR(ctx, 0, 0, w, h, 26 * k, 'rgba(22,24,29,0.95)');
    glyph(ctx, 'sparkle', 26 * k, 30 * k, 22 * k, GEM[0]); T(ctx, 'Gemini', 46 * k, 38 * k, 19 * k, 600, C.on);
    T(ctx, '“Get me to coffee before my 10:00”', 20 * k, 76 * k, 17 * k, 500, '#a8c8ff');
    wrapText(ctx, 'Ritual Coffee is 18 min away. I brought Maps forward and moved your review notes next to it.', 20 * k, 108 * k, w - 40 * k, 22 * k, 16 * k, 400, C.onv, 3);
    ['Start route', 'Order ahead', 'Remind me'].forEach((s, j) => { pill(ctx, (20 + j * 132) * k, h - 50 * k, 122 * k, 34 * k, j ? C.sch : C.priC); T(ctx, s, (81 + j * 132) * k, h - 27 * k, 14 * k, 600, j ? C.on : C.onPriC, 'center'); });
  });
  answer.position.set(0.36, 0.02, 0.15); answer.visible = false; group.add(answer); tag(answer, { orb: true }); targets.push(answer);

  // Quick Settings floating nearest, along the top.
  const QSO = [['wifi', 'Wi-Fi', 'wifi'], ['sun', 'Environment', 'env'], ['person', 'Recenter', 'center'], ['moon', 'Focus', 'focus']];
  const qsState = { wifi: true, env: false, focus: false };
  const qs = QSO.map(([g, label, key], i) => {
    const m = tp(0.18, 0.05, 0.025, 120, (ctx, w, h) => {
      const on = key === 'env' ? night : key === 'center' ? false : qsState[key];
      pill(ctx, 0, 0, w, h, on ? C.pri : 'rgba(39,42,47,0.95)');
      glyph(ctx, key === 'env' && night ? 'moon' : g, h * 0.55, h / 2, h * 0.5, on ? C.onPri : C.on);
      T(ctx, key === 'env' ? (night ? 'Night sky' : 'Desert dusk') : label, h * 1.05, h * 0.64, h * 0.36, 600, on ? C.onPri : C.on);
    });
    m.position.set(-0.52 + i * 0.195, 0.39, 0.16); tag(m, { qs: key }); group.add(m); targets.push(m);
    return m;
  });

  function layout(hit, dt, t) {
    const hovered = pickOf(hit)?.panel;
    let slot = 0;
    const n = panels.length - (focus >= 0 ? 1 : 0);
    panels.forEach((m, i) => {
      const p = m.userData.p;
      if (i === focus) {
        p.x.to = summoned ? -0.22 : 0; p.y.to = 0.02; p.z.to = 0.02; p.ry.to = summoned ? 0.15 : 0; p.k.to = 1.4;
      } else {
        const th = (slot - (n - 1) / 2) * 0.37 + arc; slot++;
        p.x.to = R * Math.sin(th); p.z.to = CZ - R * Math.cos(th); p.ry.to = -th; p.y.to = 0.06 + (hovered === i ? 0.015 : 0); p.k.to = hovered === i ? 1.06 : 1;
        if (focus >= 0) p.z.to -= 0.05;
      }
      m.position.set(p.x.step(dt), p.y.step(dt) + Math.sin(t * 0.8 + i) * 0.004, p.z.step(dt));
      m.rotation.y = p.ry.step(dt); m.scale.setScalar(p.k.step(dt));
    });
  }
  const refreshPanels = () => panels.forEach((m) => m.userData.tex.redraw());
  return {
    group, targets,
    enter() { panels.forEach((m) => { m.userData.p.z.v = -0.33; }); },
    update(dt, t, hit) {
      layout(hit, dt, t);
      orbitA += dt * 0.25;
      orbitIcons.forEach((ic, i) => {
        const a = orbitA + (i / orbitIcons.length) * Math.PI * 2, front = (Math.sin(a) + 1) / 2;
        const hov = pickOf(hit) && hitIn(hit, ic);
        ic.position.set(Math.cos(a) * 0.52, Math.sin(t * 1.5 + i) * 0.006 + (hov ? 0.02 : 0), Math.sin(a) * 0.09);
        ic.scale.setScalar((0.7 + front * 0.45) * (hov ? 1.15 : 1)); ic.rotation.y = -Math.cos(a) * 0.5;
      });
      core.material.emissive.setHSL(0.62 + Math.sin(t * 0.7) * 0.1, 0.8, 0.5);
      halos.forEach((s, i) => { s.scale.setScalar((0.16 + i * 0.03) * (1 + 0.12 * Math.sin(t * 2 + i))); s.material.rotation = t * 0.3 * (i % 2 ? 1 : -1); });
      orb.position.y = 0.2 + Math.sin(t * 1.1) * 0.01;
      answer.visible = summoned;
    },
    click(hit) {
      const d = pickOf(hit);
      if (!d) { if (focus >= 0) { focus = -1; summoned = false; refreshPanels(); } return; }
      if (d.panel !== undefined) { focus = focus === d.panel ? -1 : d.panel; if (focus < 0) summoned = false; refreshPanels(); }
      else if (d.app !== undefined) { if (d.app >= 0) { focus = d.app; refreshPanels(); } else if (d.app === -2) { summoned = !summoned; focus = summoned ? 3 : -1; refreshPanels(); } }
      else if (d.orb) { summoned = !summoned; focus = summoned ? 3 : -1; refreshPanels(); }
      else if (d.qs) {
        if (d.qs === 'env') { night = !night; env.userData.tex.redraw(); }
        else if (d.qs === 'center') { arc = 0; focus = -1; summoned = false; refreshPanels(); }
        else qsState[d.qs] = !qsState[d.qs];
        qs.forEach((m) => m.userData.tex.redraw());
      }
    },
    drag(dx) { if (dragStart === null) dragStart = arc; arc = clamp(dragStart + dx * 0.003, -0.6, 0.6); },
    dragEnd() { dragStart = null; },
  };
}
const hitIn = (hit, obj) => { for (let o = hit?.object; o; o = o.parent) if (o === obj) return true; return false; };

export const layouts = [
  {
    key: 'icons', name: 'Pixel home screen in 3D', short: 'App grid', tagline: 'Today’s traditional layout, every icon a solid object',
    blurb: 'The Pixel 11 Pro home screen exactly as it is laid out today: status bar, At a Glance, the expressive clock and weather widgets, a 4-column grid of themed icons, the dock and the search pill. Here every element is a real object, layered by importance: wallpaper at the back, widgets and icons standing off it, the dock and search pill highest.',
    points: ['Themed icons in Material shapes (circle, cookie, clover, squircle) as solid slabs', 'Widgets are thick tonal shapes; the cookie clock updates live', 'Dock and search pill float a level above the grid', 'Opening an app is a container transform out of its icon'],
    how: 'Hover an icon to lift it with a springy overshoot. Click it to open the app; click again to close.',
    hint: 'Hover an icon · click to open',
    build: layoutIcons,
  },
  {
    key: 'phone', name: 'Material Spaces', short: 'Phone', tagline: 'A phone you look into, with an app drawer stacked in depth',
    blurb: 'Reimagined for a 3D phone: the screen becomes a shallow room. Widgets sit at Material’s tonal elevation levels as real distances, the now-playing pill floats highest, and the app drawer is a stack of themed pages receding behind the glass that you flip through.',
    points: ['Elevation level = distance from the glass: level 1 sits back, level 5 floats out', 'At a Glance in big expressive type at the top of the room', 'App drawer pages stack into the depth; the front one is live', 'Wallpaper sits at the back wall, so the whole phone has parallax'],
    how: 'Hover a widget to lift it. Click or drag the drawer stack to flip pages; click an icon on the front page to bounce it.',
    hint: 'Click or drag the drawer stack',
    build: layoutPhone,
  },
  {
    key: 'tablet', name: 'Open-book split screen', short: 'Tablet', tagline: 'Two apps as the pages of a book, a taskbar floating in front',
    blurb: 'Reimagined for a 3D tablet: split screen becomes an open book. The two apps hinge on a spine behind the glass and angle toward you, which makes the split obvious and each app easier to read. The taskbar floats in front of the glass with solid icons you can drop into either page.',
    points: ['Panes hinge from a spine set into the screen', 'Hover flattens a page toward you; click focuses it full-width', 'Taskbar icons are solid and float above the glass', 'Clicking a taskbar app loads it into the page you last looked at'],
    how: 'Hover a page to open it toward you, click to focus it. Click a taskbar icon to load that app into a page.',
    hint: 'Click a page to focus · click a taskbar app',
    build: layoutTablet,
  },
  {
    key: 'monitor', name: 'Tiered desktop', short: 'Monitor', tagline: 'ChromeOS windows at depth tiers, Gemini floating forward',
    blurb: 'Reimagined for a 3D desk monitor: overlapping windows stop fighting for the same plane. The active window sits nearest, background windows step back in tiers so you can still read them, and the Gemini panel floats in front of the glass beside your work.',
    points: ['Three depth tiers: active, recent, background', 'Hovering a background window lifts it so you can peek', 'Gemini panel floats forward with a soft halo and context chips', 'Shelf icons are solid and bring their window to the front'],
    how: 'Click a window (or its shelf icon) to bring it to the front tier. Click the Gemini panel to toggle its suggestions.',
    hint: 'Click a window to bring it forward',
    build: layoutMonitor,
  },
  {
    key: 'home', name: 'Curved poster wall', short: 'Home view', tagline: 'Google TV in the living room, with a poster wall that wraps toward you',
    blurb: 'Reimagined for a 3D TV: the Google TV home becomes a curved wall of posters behind the glass, centre deepest and ends curving toward the room. Focus lifts a poster out of the wall to meet you, details open in front of the screen, and the Gemini orb floats in the corner for voice.',
    points: ['Rows curve around the room instead of scrolling flat', 'Focus pops a poster out with a white focus ring', 'Details open as a card in front of the glass', 'Gemini orb glows while listening and re-deals the wall'],
    how: 'Hover a poster to pop it out, click to open its details (click again to close). Click the Gemini orb to ask for something new.',
    hint: 'Hover a poster · click the Gemini orb',
    build: layoutHome,
  },
  {
    key: 'os', name: 'Android XR, for screens', short: 'Android XR for screens', tagline: 'Home Space seen through the glass: panels on an arc, Gemini at your side',
    blurb: 'A new Android layout borrowed from Android XR but made for a glasses-free screen. The display becomes a window into a space: an environment sits behind the glass, app panels stand on a curved arc around you, a launcher orbit of Material shapes circles in front, Quick Settings float nearest and the Gemini orb brings the right panel to you.',
    points: ['Environment behind the glass (desert dusk or a night sky with aurora)', 'App panels on a curved arc; the focused one steps forward to the glass', 'Launcher orbit: solid Material-shape icons circling in front', 'Gemini orb summons Maps forward with an answer card beside it', 'Quick Settings float in front: environment, recenter, focus'],
    how: 'Click a panel to bring it forward (click again to send it back). Drag sideways to swing the arc. Click an orbiting icon to open its app, the Gemini orb for help, and the Quick Settings pills to change the environment or recenter.',
    hint: 'Click a panel · drag the arc · click the Gemini orb',
    build: layoutOS,
  },
];
