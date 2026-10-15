// Google: "3D screen" apps for the device carousel. Each device gets a few Material 3 Expressive apps that
// grow out of its glass where depth genuinely helps: weather you can see, a caller who leans out of the
// phone, notifications that stack toward you, a map with real buildings, rings and a heartbeat on the watch.
//
// Contract (main.js): apps[i].build(box) → { group, targets, update(dt, t, hit, ext), click(hit), enter() }.
// box = { w, h } of the device screen; the group sits at the screen centre with +z out of the glass.
// Nothing here touches google.js bindings at module load (google.js imports this file), only inside builds.

import * as THREE from 'three';
import { glyph, Spring, damp, screenGeo } from '../kit.js';
import { cloud, sun, precipitation, bolt, bust, heart, rings, city, depthPhoto, glow, card3d, bigText, stagger, updateAll } from '../pop3d.js';
import { C, GEM, F, T, wrapText, fillShape, pill, photo } from './google.js';

// ---- shared bits ---------------------------------------------------------------------------------------
const hitIn = (hit, obj) => { for (let o = hit?.object; o; o = o.parent) if (o === obj) return true; return false; };
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05, ...o });
const emis = (color, k = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4, ...o });

// Wrap a builder in the common app shell: staggered pop-in of registered pieces, prop animation, clicks.
// build(g, box, api) returns { targets, update?(dt, t, hit, since), click?(hit), enter?() }.
// api.pop(obj, i) registers obj to spring in as the i-th piece (its current scale is the resting scale).
function app(build) {
  return (box) => {
    const g = new THREE.Group(), pops = [];
    let since = 0;
    const api = { pop: (o, i = pops.length) => { o.userData.rest = o.scale.clone(); pops.push([o, i]); o.scale.multiplyScalar(0.001); return o; } };
    // A dark scrim over the device screen so the 3D content reads against it (round on the watch).
    const round = Math.abs(box.w - box.h) < 0.03 * Math.max(box.w, box.h);
    const scrim = new THREE.Mesh(round ? new THREE.CircleGeometry(box.w / 2, 48) : screenGeo(box.w, box.h, Math.min(box.w, box.h) * 0.08),
      new THREE.MeshBasicMaterial({ color: 0x05060a, transparent: true, opacity: 0, depthWrite: false }));
    scrim.position.z = 0.0015; scrim.renderOrder = -1; g.add(scrim);
    const o = build(g, box, api) || {};
    return {
      group: g,
      targets: o.targets || [],
      enter() { since = 0; scrim.material.opacity = 0; o.enter?.(); },
      update(dt, t, hit, ext) {
        since += dt;
        scrim.material.opacity = damp(scrim.material.opacity, 0.7, 4, dt);
        for (const [p, i] of pops) { const k = Math.max(0.001, stagger(since, i, 0.09, 0.45)); p.scale.copy(p.userData.rest).multiplyScalar(k); }
        o.update?.(dt, t, hit, since);
        updateAll(g, dt, t);
      },
      click(hit) { o.click?.(hit); },
    };
  };
}

// A Material surface card; draw(ctx, w, h) paints inside a tonal container.
function mcard(w, h, draw, { fill = C.sch, r, depth = 0.008, px = 300 } = {}) {
  return card3d(w, h, (ctx, cw, ch, t) => { ctx.fillStyle = fill; ctx.fillRect(0, 0, cw, ch); draw?.(ctx, cw, ch, t); }, { r: r ?? Math.min(w, h) * 0.14, depth, px, color: 0x1a1d22 });
}
// A round M3 button with a glyph.
function mbutton(d, glyphName, bg, fg = '#fff', depth = d * 0.22) {
  return card3d(d, d, (ctx, w, h) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); glyph(ctx, glyphName, w / 2, h / 2, w * 0.46, fg, w * 0.06); }, { r: d / 2, depth, px: 160, color: 0x15171b });
}
// A pill chip with a label.
function mchip(w, h, label, { bg = C.secC, fg = C.onSecC, glyphName = null } = {}) {
  return card3d(w, h, (ctx, cw, ch) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
    let x = cw / 2;
    if (glyphName) { glyph(ctx, glyphName, ch * 0.62, ch / 2, ch * 0.5, fg, ch * 0.05); x = cw / 2 + ch * 0.3; }
    T(ctx, label, x, ch * 0.64, ch * 0.42, 600, fg, 'center');
  }, { r: h / 2, depth: h * 0.22, px: 120, color: 0x15171b });
}
function swapText(g, old, str, opts, pos) {
  if (old) { g.remove(old); old.geometry.dispose(); old.material.map?.dispose(); old.material.dispose(); }
  const m = bigText(str, { font: F, ...opts });
  m.position.copy(pos);
  g.add(m);
  return m;
}
const setColor = (obj, hex) => obj.traverse((o) => { if (o.material?.color) o.material.color.set(hex); });

// =====================================================================================================
// Weather: Pixel Weather style. Real clouds, sun, rain and snow over the phone; tap to step the days.
// =====================================================================================================
const DAYS = [
  { d: 'Today', t: 72, hi: 76, lo: 58, k: 'sun', label: 'Sunny' },
  { d: 'Thu', t: 64, hi: 67, lo: 55, k: 'partly', label: 'Partly cloudy' },
  { d: 'Fri', t: 57, hi: 59, lo: 51, k: 'rain', label: 'Showers' },
  { d: 'Sat', t: 52, hi: 55, lo: 47, k: 'storm', label: 'Thunderstorms' },
  { d: 'Sun', t: 34, hi: 36, lo: 28, k: 'snow', label: 'Snow flurries' },
];
const weather = app((g, box, api) => {
  const u = Math.min(box.w, box.h * 0.6), targets = [];
  let day = 0, temp = null;
  const sky = new THREE.Group(); sky.position.set(0, box.h * 0.1, 0.07); g.add(api.pop(sky, 0));
  const S = sun(u * 0.15); S.position.set(u * 0.14, u * 0.12, -0.01); sky.add(S);
  const clouds = [[-u * 0.12, u * 0.02, 0.03, 0.22], [u * 0.16, -u * 0.04, 0.05, 0.17], [-u * 0.02, u * 0.16, 0.0, 0.19]].map(([x, y, z, s]) => {
    const c = cloud(u * s); c.position.set(x, y, z); sky.add(c); return c;
  });
  const rain = precipitation({ w: u * 0.8, h: u * 0.55, d: u * 0.3, count: 120 }); rain.position.set(0, -u * 0.3, 0.02); sky.add(rain);
  const snow = precipitation({ w: u * 0.8, h: u * 0.55, d: u * 0.3, count: 70, snow: true }); snow.position.copy(rain.position); sky.add(snow);
  const zap = bolt(u * 0.32); zap.position.set(u * 0.02, -u * 0.2, 0.04); sky.add(zap);
  sky.userData.hit = new THREE.Mesh(new THREE.SphereGeometry(u * 0.42, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  sky.add(sky.userData.hit); targets.push(sky.userData.hit);

  const tempPos = new THREE.Vector3(-box.w * 0.12, box.h * 0.36, 0.1);
  const info = mcard(box.w * 0.92, box.h * 0.11, (ctx, w, h) => {
    const d = DAYS[day];
    T(ctx, d.label, h * 0.32, h * 0.46, h * 0.3, 600, C.on);
    T(ctx, `H:${d.hi}°  L:${d.lo}°  ·  Mountain View`, h * 0.32, h * 0.8, h * 0.2, 400, C.onv);
  }, { fill: 'rgba(29,32,36,0.92)' });
  info.position.set(0, -box.h * 0.16, 0.05); g.add(api.pop(info, 2)); targets.push(info);

  const chips = DAYS.map((d, i) => {
    const c = card3d(box.w * 0.17, box.h * 0.13, (ctx, w, h) => {
      const on = i === day;
      ctx.fillStyle = on ? C.pri : C.sch; ctx.fillRect(0, 0, w, h);
      T(ctx, d.d, w / 2, h * 0.24, h * 0.14, 600, on ? C.onPri : C.onv, 'center');
      glyph(ctx, d.k === 'sun' ? 'sun' : d.k === 'snow' ? 'sparkle' : d.k === 'storm' ? 'flash' : 'cloud', w / 2, h * 0.5, h * 0.24, on ? C.onPri : '#ffd27a');
      T(ctx, `${d.t}°`, w / 2, h * 0.86, h * 0.2, 600, on ? C.onPri : C.on, 'center');
    }, { r: box.w * 0.06, depth: 0.008, px: 220, color: 0x1a1d22 });
    c.position.set((i - 2) * box.w * 0.19, -box.h * 0.33, 0.03); c.userData.day = i;
    g.add(api.pop(c, 3 + i)); targets.push(c);
    return c;
  });

  function apply() {
    const k = DAYS[day].k;
    S.visible = k === 'sun' || k === 'partly';
    S.position.set(k === 'sun' ? 0 : u * 0.14, k === 'sun' ? u * 0.06 : u * 0.12, -0.01);
    clouds.forEach((c, i) => {
      c.visible = k !== 'sun' && (k !== 'partly' || i < 2);
      setColor(c, k === 'storm' ? 0x6b7180 : k === 'rain' ? 0x9aa3b2 : 0xf2f4f8);
    });
    rain.visible = k === 'rain' || k === 'storm';
    snow.visible = k === 'snow';
    zap.visible = k === 'storm';
    temp = swapText(g, temp, `${DAYS[day].t}°`, { height: box.h * 0.17, weight: 500, color: '#ffffff' }, tempPos);
    info.userData.tex.redraw(); chips.forEach((c) => c.userData.tex.redraw());
  }
  apply();
  const bob = new Spring(0, 160, 12);
  return {
    targets,
    update(dt, t) {
      sky.rotation.y = Math.sin(t * 0.4) * 0.25;
      bob.step(dt); sky.position.z = 0.07 + bob.v * 0.04;
      if (temp) temp.position.z = tempPos.z + Math.sin(t * 1.2) * 0.006;
    },
    click(hit) {
      const c = chips.find((x) => hitIn(hit, x));
      day = c ? c.userData.day : (day + 1) % DAYS.length;
      bob.vel = 6; apply();
    },
  };
});

// =====================================================================================================
// Google Meet: an incoming video call. The caller leans out of the phone; accept, mute or end.
// =====================================================================================================
function meetApp({ name = 'Maya Chen', shirt = 0x3d6fd6, hair = 0x2b1d16, skin = 0xd9a07d } = {}) {
  return app((g, box, api) => {
    const u = Math.min(box.w, box.h * 0.55), targets = [];
    let state = 'ring', callT = 0;
    const person = bust({ s: u * 0.55, shirt, hair, skin }); person.position.set(0, box.h * 0.02, 0.06); person.userData.talking = false;
    g.add(api.pop(person, 0));
    const halo = [0, 1].map((i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(u * 0.36, u * 0.012, 10, 64), emis(0x6dd58c, 0.9, { transparent: true, opacity: 0.7 }));
      m.position.set(0, box.h * 0.08, 0.04); g.add(m); return m;
    });
    const nameCard = mcard(box.w * 0.9, box.h * 0.12, (ctx, w, h) => {
      fillShape(ctx, h * 0.5, h * 0.5, h * 0.32, 'cookie', C.terC);
      T(ctx, name[0], h * 0.5, h * 0.62, h * 0.32, 600, C.onTerC, 'center');
      T(ctx, name, h * 0.95, h * 0.46, h * 0.28, 600, C.on);
      const s = Math.floor(callT), sub = state === 'ring' ? 'Google Meet · Incoming video call' : `Google Meet · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      T(ctx, sub, h * 0.95, h * 0.78, h * 0.19, 400, state === 'ring' ? C.onv : '#9cd67e');
    }, { fill: 'rgba(29,32,36,0.94)' });
    nameCard.position.set(0, box.h * 0.38, 0.05); g.add(api.pop(nameCard, 1));
    const d = box.w * 0.24;
    const btn = (glyphName, bg, x, kind) => { const b = mbutton(d, glyphName, bg); b.position.set(x, -box.h * 0.34, 0.12); b.userData.kind = kind; g.add(api.pop(b, 2)); targets.push(b); return b; };
    const accept = btn('phone', '#1e8e3e', box.w * 0.24, 'accept');
    const decline = btn('phone', '#d93025', -box.w * 0.24, 'end');
    decline.userData.face.rotation.z = Math.PI * 0.75;
    const mic = btn('mic', C.schh, -box.w * 0.3, 'mic');
    const cam = btn('camera', C.schh, 0, 'cam');
    const end = btn('phone', '#d93025', box.w * 0.3, 'end');
    end.userData.face.rotation.z = Math.PI * 0.75;
    // self view (picture-in-picture)
    const self = mcard(box.w * 0.3, box.h * 0.2, (ctx, w, h) => {
      const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4b5c78'); gr.addColorStop(1, '#22293a');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.arc(w / 2, h * 0.45, w * 0.17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5b7b5a'; ctx.beginPath(); ctx.ellipse(w / 2, h * 1.02, w * 0.36, h * 0.34, 0, Math.PI, 0); ctx.fill();
      T(ctx, 'You', w * 0.1, h * 0.9, h * 0.11, 600, '#fff');
    }, { r: box.w * 0.05 });
    self.position.set(box.w * 0.34, -box.h * 0.12, 0.09); g.add(self);
    let muted = false;
    const setState = (s) => {
      state = s; callT = 0;
      person.userData.talking = s === 'call';
      accept.visible = decline.visible = s === 'ring';
      mic.visible = cam.visible = end.visible = self.visible = s === 'call';
      halo.forEach((h) => (h.visible = s === 'ring'));
      nameCard.userData.tex.redraw();
    };
    setState('ring');
    const lean = new Spring(0, 120, 14);
    let secs = 0;
    return {
      targets,
      enter() { setState('ring'); },
      update(dt, t, hit) {
        if (state === 'ring') halo.forEach((h, i) => { const p = ((t * 0.9 + i * 0.5) % 1); h.scale.setScalar(0.8 + p * 0.7); h.material.opacity = 0.7 * (1 - p); h.position.z = 0.04 + p * 0.06; });
        else { callT += dt; secs += dt; if (secs > 1) { secs = 0; nameCard.userData.tex.redraw(); } }
        lean.to = state === 'call' ? 1 : 0;
        const l = lean.step(dt);
        person.position.z = 0.06 + l * 0.05; person.position.y = box.h * 0.02 + l * box.h * 0.04;
        if (state === 'ring') accept.position.y = -box.h * 0.34 + Math.abs(Math.sin(t * 5)) * box.h * 0.02;
        for (const b of targets) { const k = b.visible && hitIn(hit, b) ? 1.15 : 1; b.userData.hover = damp(b.userData.hover ?? 1, k, 12, dt); b.userData.rest?.setScalar(b.userData.hover); }
      },
      click(hit) {
        const b = targets.find((x) => x.visible && hitIn(hit, x));
        if (!b) return;
        if (b.userData.kind === 'accept') setState('call');
        else if (b.userData.kind === 'end') setState('ring');
        else if (b.userData.kind === 'mic') { muted = !muted; setColor(mic.userData.body, muted ? 0xd93025 : 0x15171b); person.userData.talking = true; }
        else if (b.userData.kind === 'cam') self.visible = !self.visible;
      },
    };
  });
}

// =====================================================================================================
// Notifications: a stack that leans out toward you. Tap to expand, tap again to dismiss.
// =====================================================================================================
// (Functions, not constants: google.js imports this module, so C is not ready at load time.)
const NOTES_ = () => [
  { app: 'Messages', g: 'message', title: 'Maya', body: 'Are we still on for 7? I booked the table.', more: 'Reply  ·  Mark as read', c: [C.priC, C.onPriC] },
  { app: 'Gmail', g: 'mail', title: 'Your flight to Tokyo', body: 'Boarding pass ready · NH 7 · Gate 12', more: 'Add to Wallet  ·  Archive', c: ['#5c2b29', '#ffdad6'] },
  { app: 'Calendar', g: 'calendar', title: 'Design review', body: 'In 10 min · Room 4B · with 6 others', more: 'Join with Meet  ·  Directions', c: [C.secC, C.onSecC] },
  { app: 'Shopping', g: 'store', title: 'Package arriving', body: 'Out for delivery, 2 stops away', more: 'Track  ·  Leave at door', c: [C.grnC, '#c8f0b0'] },
];
const notifications = app((g, box, api) => {
  const NOTES = NOTES_();
  const targets = [];
  const W = box.w * 1.04, H = box.h * 0.17;
  const cards = NOTES.map((n, i) => {
    const c = mcard(W, H, (ctx, w, h) => {
      fillShape(ctx, h * 0.32, h * 0.3, h * 0.17, 'circle', n.c[0]);
      glyph(ctx, n.g, h * 0.32, h * 0.3, h * 0.18, n.c[1]);
      T(ctx, `${n.app} · now`, h * 0.58, h * 0.34, h * 0.13, 500, C.onv);
      T(ctx, n.title, h * 0.18, h * 0.62, h * 0.18, 600, C.on);
      T(ctx, n.body, h * 0.18, h * 0.84, h * 0.14, 400, C.onv);
    }, { fill: '#2a2d33', px: 260 });
    const s = { y: new Spring(0, 140, 15), z: new Spring(0, 140, 15), x: new Spring(0, 120, 14), k: new Spring(1, 160, 14), expanded: false, gone: false };
    c.userData.s = s; c.userData.i = i;
    g.add(api.pop(c, i)); targets.push(c);
    return c;
  });
  const extra = mcard(W * 0.9, H * 0.42, (ctx, w, h) => T(ctx, '', w / 2, h * 0.65, h * 0.4, 600, C.pri, 'center'), { fill: C.priC });
  extra.visible = false; g.add(extra);
  let resetT = 0;
  const layout = (hit) => {
    let slot = 0;
    for (const c of cards) {
      const s = c.userData.s;
      if (s.gone) { s.x.to = box.w * 1.4; s.z.to = 0.12; continue; }
      const hov = hitIn(hit, c) ? 0.025 : 0;
      s.x.to = 0; s.y.to = box.h * 0.3 - slot * H * 1.08 - (s.expanded ? 0 : 0);
      s.z.to = 0.15 - slot * 0.035 + hov + (s.expanded ? 0.04 : 0);
      s.k.to = s.expanded ? 1.12 : 1;
      slot++;
    }
  };
  return {
    targets,
    enter() { cards.forEach((c) => { const s = c.userData.s; s.gone = false; s.expanded = false; s.x.v = 0; }); },
    update(dt, t, hit) {
      layout(hit);
      let alive = 0, open = null;
      for (const c of cards) {
        const s = c.userData.s;
        c.position.set(s.x.step(dt), s.y.step(dt), s.z.step(dt));
        if (c.userData.rest) c.userData.rest.setScalar(s.k.step(dt));
        c.rotation.y = s.gone ? -0.5 : 0;
        if (!s.gone) alive++;
        if (s.expanded && !s.gone) open = c;
      }
      extra.visible = !!open;
      if (open) {
        const n = NOTES[open.userData.i];
        if (extra.userData.which !== n) {
          extra.userData.which = n;
          const ctx = extra.userData.tex.image.getContext('2d'), w = ctx.canvas.width, h = ctx.canvas.height;
          ctx.clearRect(0, 0, w, h); ctx.fillStyle = C.priC; ctx.fillRect(0, 0, w, h); T(ctx, n.more, w / 2, h * 0.64, h * 0.38, 600, C.onPriC, 'center'); extra.userData.tex.needsUpdate = true;
        }
        extra.position.set(0, open.position.y - H * 0.78, open.position.z + 0.01);
      }
      if (!alive) { resetT += dt; if (resetT > 1.2) { resetT = 0; cards.forEach((c) => { c.userData.s.gone = false; c.userData.s.expanded = false; c.userData.s.x.v = -box.w * 1.2; }); } }
    },
    click(hit) {
      const c = cards.find((x) => !x.userData.s.gone && hitIn(hit, x));
      if (!c) return;
      const s = c.userData.s;
      if (s.expanded) { s.gone = true; s.expanded = false; }
      else { cards.forEach((x) => (x.userData.s.expanded = false)); s.expanded = true; }
    },
  };
});

// =====================================================================================================
// Maps Immersive View on the Fold: a city block rises out of the inner screen with a live route.
// =====================================================================================================
const MODES = [['Walk', '12 min', 'walk'], ['Transit', '18 min', 'transit'], ['Drive', '9 min', 'drive']];
const immersiveMaps = app((g, box, api) => {
  const targets = [];
  let mode = 0;
  const holder = new THREE.Group(); holder.position.set(0, -box.h * 0.04, 0.04); holder.rotation.x = 0.95; g.add(api.pop(holder, 0));
  const routeCols = [0x4b8bff, 0x9cd67e, 0xffb44d];
  const c = city({ w: box.w * 0.8, d: box.h * 0.5, route: routeCols[0], seed: 11 }); holder.add(c);
  const hitPlate = new THREE.Mesh(new THREE.BoxGeometry(box.w * 0.8, 0.04, box.h * 0.5), new THREE.MeshBasicMaterial({ visible: false })); hitPlate.position.y = 0.02; holder.add(hitPlate); targets.push(hitPlate);
  const eta = mcard(box.w * 0.46, box.h * 0.13, (ctx, w, h) => {
    const [m, tm] = MODES[mode];
    fillShape(ctx, h * 0.48, h * 0.5, h * 0.3, 'cookie', C.priC); glyph(ctx, 'map', h * 0.48, h * 0.5, h * 0.3, C.onPriC);
    T(ctx, tm, h * 0.92, h * 0.5, h * 0.3, 600, C.on); T(ctx, `${m} · fastest route`, h * 0.92, h * 0.8, h * 0.17, 400, C.onv);
  }, { fill: 'rgba(29,32,36,0.94)' });
  eta.position.set(-box.w * 0.22, box.h * 0.36, 0.14); g.add(api.pop(eta, 1)); targets.push(eta);
  const chips = MODES.map(([m], i) => {
    const ch = mchip(box.w * 0.22, box.h * 0.07, m, { bg: i === mode ? C.pri : C.secC, fg: i === mode ? C.onPri : C.onSecC });
    ch.position.set((i - 1) * box.w * 0.25, -box.h * 0.4, 0.1); ch.userData.mode = i; g.add(api.pop(ch, 2 + i)); targets.push(ch);
    return ch;
  });
  const tube = c.children.find((o) => o.geometry?.type === 'TubeGeometry');
  return {
    targets,
    update(dt, t) { holder.rotation.z = Math.sin(t * 0.3) * 0.25; },
    click(hit) {
      const ch = chips.find((x) => hitIn(hit, x));
      mode = ch ? ch.userData.mode : (mode + 1) % MODES.length;
      if (tube) { tube.material.color.set(routeCols[mode]); tube.material.emissive.set(routeCols[mode]); }
      chips.forEach((x, i) => { const on = i === mode; const ctx = x.userData.tex.image.getContext('2d'), w = ctx.canvas.width, h = ctx.canvas.height; ctx.clearRect(0, 0, w, h); ctx.fillStyle = on ? C.pri : C.secC; ctx.fillRect(0, 0, w, h); T(ctx, MODES[i][0], w / 2, h * 0.64, h * 0.42, 600, on ? C.onPri : C.onSecC, 'center'); x.userData.tex.needsUpdate = true; });
      eta.userData.tex.redraw();
    },
  };
});

// =====================================================================================================
// Google Photos, Cinematic: a memory pulled apart into sky, land and subject; tap for the next one.
// =====================================================================================================
const MEMORIES = [['Big Sur', '2025'], ['Kyoto', 'Spring 2026'], ['Joshua Tree', '2024'], ['Lake Tahoe', 'Winter']];
function cinematic(scale = 0.86) {
  return app((g, box, api) => {
    const targets = [];
    let idx = 0;
    const W = box.w * scale, H = Math.min(box.h * 0.62, W * 0.72);
    const ph = depthPhoto({ w: W, h: H, gap: 0.035, draw: (ctx, w, h, layer) => {
      if (layer === 0) { photo(ctx, idx, 0, 0, w, h, true); return; }
      ctx.clearRect(0, 0, w, h);
      if (layer === 1) {
        ctx.fillStyle = ['#2b2140', '#20334a', '#3a2a22', '#1d2b3a'][idx % 4];
        ctx.beginPath(); ctx.moveTo(0, h);
        for (let k = 0; k <= 20; k++) ctx.lineTo((k / 20) * w, h * 0.72 - Math.sin(k * 0.6 + idx) * h * 0.06);
        ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      } else {
        // a person looking out, the photo's subject
        const x = w * (0.3 + 0.1 * (idx % 2)), y = h * 0.62;
        ctx.fillStyle = '#121019';
        ctx.beginPath(); ctx.arc(x, y, h * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x, y + h * 0.22, h * 0.1, h * 0.17, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - h * 0.1, y + h * 0.22, h * 0.2, h * 0.3);
      }
    } });
    ph.position.set(0, box.h * 0.06, 0.02); g.add(api.pop(ph, 0));
    const hitM = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ visible: false })); hitM.position.z = 0.08; ph.add(hitM); targets.push(hitM);
    const title = mcard(W * 0.62, box.h * 0.1, (ctx, w, h) => {
      glyph(ctx, 'photos', h * 0.5, h * 0.5, h * 0.42, '#ffd27a');
      T(ctx, MEMORIES[idx][0], h * 0.95, h * 0.5, h * 0.3, 600, C.on); T(ctx, `Memories · ${MEMORIES[idx][1]}`, h * 0.95, h * 0.8, h * 0.18, 400, C.onv);
    }, { fill: 'rgba(29,32,36,0.94)' });
    title.position.set(-W * 0.12, -box.h * 0.3, 0.12); g.add(api.pop(title, 1)); targets.push(title);
    return {
      targets,
      update(dt, t) { ph.rotation.y = Math.sin(t * 0.5) * 0.18; ph.rotation.x = Math.sin(t * 0.37) * 0.06; },
      click() { idx = (idx + 1) % MEMORIES.length; ph.children.forEach((m) => m.material?.map?.redraw?.()); title.userData.tex.redraw(); },
    };
  });
}

// =====================================================================================================
// Pixel Watch: Fitbit Today. Solid rings, a beating heart and step tiles float off the round face.
// =====================================================================================================
const fitbit = app((g, box, api) => {
  const u = box.w, targets = [];
  let workout = false, steps = 8412;
  const R = rings({ r: u * 0.32, tube: u * 0.03, colors: [0x4b8bff, 0x6dd58c, 0xffb44d], fracs: [0.78, 0.62, 0.9] });
  R.position.z = 0.03; g.add(api.pop(R, 0)); targets.push(R);
  const H = heart(u * 0.32, 0xff4f6d, 72); H.position.set(-u * 0.85, u * 0.28, 0.08); g.add(api.pop(H, 1)); targets.push(H);
  let bpm = null; const bpmPos = new THREE.Vector3(-u * 0.85, -u * 0.02, 0.08);
  const setBpm = () => { bpm = swapText(g, bpm, `${workout ? 138 : 72} bpm`, { height: u * 0.13, weight: 600, color: '#ffb4c0' }, bpmPos); };
  setBpm();
  const stepCard = mcard(u * 0.62, u * 0.42, (ctx, w, h) => {
    fillShape(ctx, h * 0.24, h * 0.24, h * 0.15, 'cookie', C.grnC); glyph(ctx, 'fitness', h * 0.24, h * 0.24, h * 0.17, '#c8f0b0');
    T(ctx, steps.toLocaleString(), h * 0.1, h * 0.66, h * 0.24, 600, C.on); T(ctx, 'steps today', h * 0.1, h * 0.86, h * 0.13, 400, C.onv);
  }, { fill: C.sch });
  stepCard.position.set(u * 0.88, u * 0.18, 0.07); stepCard.rotation.y = -0.35; g.add(api.pop(stepCard, 2)); targets.push(stepCard);
  const sleep = mcard(u * 0.62, u * 0.3, (ctx, w, h) => {
    T(ctx, 'Sleep 7h 42m', h * 0.14, h * 0.42, h * 0.24, 600, C.on); T(ctx, 'Readiness 84 · good', h * 0.14, h * 0.78, h * 0.18, 400, '#a8c8ff');
  }, { fill: C.secC });
  sleep.position.set(u * 0.88, -u * 0.3, 0.05); sleep.rotation.y = -0.35; g.add(api.pop(sleep, 3));
  let spin = 0;
  return {
    targets,
    update(dt, t) { spin = damp(spin, 0, 2, dt); R.rotation.z += spin * dt; },
    click(hit) {
      if (hitIn(hit, H)) { workout = !workout; H.userData.bpm = workout ? 138 : 72; setBpm(); }
      else if (hitIn(hit, stepCard)) { steps += 250; stepCard.userData.tex.redraw(); }
      else spin = 9;
    },
  };
});

// Pixel Watch: Wear OS tiles fanned out in an arc around the round face.
const TILES_ = () => [
  { t: 'Weather', g: 'sun', a: '72°', b: 'Sunny · H 76', c: [C.priC, C.onPriC] },
  { t: 'Timer', g: 'clock', a: '4:32', b: 'Pasta', c: [C.terC, C.onTerC] },
  { t: 'YT Music', g: 'music', a: 'Glass Horizons', b: 'Aurora Lane', c: [C.secC, C.onSecC] },
  { t: 'Calendar', g: 'calendar', a: '10:00', b: 'Design review', c: [C.grnC, '#c8f0b0'] },
];
const wearTiles = app((g, box, api) => {
  const TILES = TILES_();
  const u = box.w, targets = [];
  let focus = 0;
  const tiles = TILES.map((d, i) => {
    const c = mcard(u * 0.7, u * 0.7, (ctx, w, h) => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      fillShape(ctx, w / 2, h / 2, w * 0.48, 'circle', '#16181d');
      fillShape(ctx, w / 2, h * 0.3, w * 0.11, 'cookie', d.c[0]); glyph(ctx, d.g, w / 2, h * 0.3, w * 0.12, d.c[1]);
      T(ctx, d.a, w / 2, h * 0.6, w * (d.a.length > 6 ? 0.08 : 0.16), 600, '#fff', 'center');
      T(ctx, d.b, w / 2, h * 0.74, w * 0.07, 400, C.onv, 'center');
      T(ctx, d.t, w / 2, h * 0.88, w * 0.06, 600, d.c[1], 'center');
    }, { r: u * 0.35, fill: '#000', px: 320 });
    c.userData.i = i; c.userData.p = { x: new Spring(0, 120, 14), z: new Spring(0, 120, 14), k: new Spring(1, 120, 14) };
    g.add(api.pop(c, i)); targets.push(c);
    return c;
  });
  return {
    targets,
    update(dt, t, hit, since) {
      tiles.forEach((c, i) => {
        let o = i - focus; if (o > 2) o -= 4; if (o < -1) o += 4;
        const p = c.userData.p;
        p.x.to = o * u * 0.72; p.z.to = o === 0 ? 0.11 : 0.04 - Math.abs(o) * 0.02; p.k.to = o === 0 ? 1.15 : 0.8;
        c.position.set(p.x.step(dt), (o === 0 ? 0 : -u * 0.05), p.z.step(dt));
        c.rotation.y = -o * 0.35;
        if (c.userData.rest) c.userData.rest.setScalar(p.k.step(dt) * (hitIn(hit, c) ? 1.05 : 1));
      });
    },
    click(hit) { const c = tiles.find((x) => hitIn(hit, x)); focus = c && c.userData.i !== focus ? c.userData.i : (focus + 1) % TILES.length; },
  };
});

// =====================================================================================================
// Pixel Tablet: a family Meet call. Three faces lean out; tap one to make them the speaker.
// =====================================================================================================
const PEOPLE = [['Grandma Rosa', 0xb85c7a, 0xcfcfd4, 0xe3b58f], ['Leo', 0x2f8f5b, 0x3a2414, 0xc68d68], ['Aiko', 0x6d5cd6, 0x151217, 0xf0c9a5]];
const familyCall = app((g, box, api) => {
  const targets = [];
  let speaker = 1;
  const tw = box.w * 0.3, th = box.h * 0.62;
  const tiles = PEOPLE.map(([name, shirt, hair, skin], i) => {
    const t = new THREE.Group(); t.position.x = (i - 1) * box.w * 0.32;
    const frame = mcard(tw, th, (ctx, w, h) => {
      const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, ['#3b4b6b', '#2f4a3f', '#4a3b5e'][i]); gr.addColorStop(1, '#16181d');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      pill(ctx, w * 0.06, h * 0.86, w * 0.88, h * 0.1, 'rgba(0,0,0,0.45)');
      T(ctx, name, w / 2, h * 0.935, h * 0.05, 600, '#fff', 'center');
    }, { r: box.w * 0.03, fill: '#1d2024' });
    t.add(frame);
    const b = bust({ s: tw * 0.75, shirt, hair, skin }); b.position.set(0, -th * 0.05, 0.02); b.userData.talking = false; t.add(b);
    t.userData = { ...t.userData, i, b, z: new Spring(0, 120, 14), k: new Spring(1, 120, 14) };
    g.add(api.pop(t, i)); targets.push(t);
    return t;
  });
  const bar = mcard(box.w * 0.5, box.h * 0.11, (ctx, w, h) => {
    [['mic', C.schh], ['camera', C.schh], ['sparkle', C.priC], ['phone', '#d93025']].forEach(([gl, bg], i) => { fillShape(ctx, h * 0.6 + i * (w - h * 1.2) / 3, h / 2, h * 0.36, 'circle', bg); glyph(ctx, gl, h * 0.6 + i * (w - h * 1.2) / 3, h / 2, h * 0.34, '#fff'); });
  }, { fill: 'rgba(29,32,36,0.94)' });
  bar.position.set(0, -box.h * 0.42, 0.1); g.add(api.pop(bar, 3));
  return {
    targets,
    update(dt, t, hit) {
      tiles.forEach((tl) => {
        const s = tl.userData, on = s.i === speaker;
        s.b.userData.talking = on;
        s.z.to = on ? 0.13 : 0.03 + (hitIn(hit, tl) ? 0.03 : 0); s.k.to = on ? 1.12 : 0.92;
        tl.position.z = s.z.step(dt); if (tl.userData.rest) tl.userData.rest.setScalar(s.k.step(dt));
        tl.rotation.y = on ? 0 : (s.i - speaker) * -0.18;
      });
    },
    click(hit) { const tl = tiles.find((x) => hitIn(hit, x)); speaker = tl ? tl.userData.i : (speaker + 1) % 3; },
  };
});

// =====================================================================================================
// Chromebook: Gemini explains bike gears with a real 3D model you can explode.
// =====================================================================================================
function gear(r, teeth, color) {
  const g = new THREE.Group(), m = std(color, { metalness: 0.7, roughness: 0.3 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.12, 48), m); disc.rotation.x = Math.PI / 2; g.add(disc);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2, tooth = new THREE.Mesh(new THREE.BoxGeometry(r * 0.16, r * 0.18, r * 0.12), m);
    tooth.position.set(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, 0); tooth.rotation.z = a; g.add(tooth);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, r * 0.2, 24), std(0x2b2f36, { metalness: 0.6 })); hub.rotation.x = Math.PI / 2; g.add(hub);
  return g;
}
const geminiGears = app((g, box, api) => {
  const targets = [];
  let exploded = false, speed = 1;
  const rig = new THREE.Group(); rig.position.set(box.w * 0.18, 0, 0.08); g.add(api.pop(rig, 0));
  const big = gear(box.h * 0.22, 28, 0xc9ced6), small = gear(box.h * 0.11, 14, 0x8ab4ff);
  big.position.x = -box.h * 0.12; small.position.x = box.h * 0.24; rig.add(big, small);
  const chain = new THREE.Mesh(new THREE.TorusGeometry(box.h * 0.18, box.h * 0.006, 8, 80), std(0x30343c, { metalness: 0.8 })); chain.scale.x = 1.55; chain.position.x = box.h * 0.04; rig.add(chain);
  const hitM = new THREE.Mesh(new THREE.SphereGeometry(box.h * 0.33, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); rig.add(hitM); targets.push(hitM);
  rig.add(glow(0x8f6df0, box.h * 0.8, 0.25));
  const answer = mcard(box.w * 0.36, box.h * 0.62, (ctx, w, h) => {
    const k = w / 360;
    glyph(ctx, 'sparkle', 26 * k, 34 * k, 22 * k, GEM[0]); T(ctx, 'Gemini', 46 * k, 42 * k, 20 * k, 600, C.on);
    T(ctx, '“How do bike gears work?”', 20 * k, 84 * k, 17 * k, 500, '#a8c8ff');
    wrapText(ctx, exploded ? 'Exploded view: the chainring (big), the cog (blue) and the chain that links them. Shifting moves the chain to a different cog.' : 'A big chainring turns a small cog. 28 teeth to 14 means the wheel turns twice for every pedal stroke: more speed, more effort.', 20 * k, 122 * k, w - 40 * k, 26 * k, 17 * k, 400, C.onv, 8);
    pill(ctx, 20 * k, h - 64 * k, w - 40 * k, 44 * k, C.priC); T(ctx, exploded ? 'Put it back together' : 'Show exploded view', w / 2, h - 35 * k, 16 * k, 600, C.onPriC, 'center');
  }, { fill: 'rgba(29,32,36,0.95)', px: 600 });
  answer.position.set(-box.w * 0.3, 0, 0.1); answer.rotation.y = 0.25; g.add(api.pop(answer, 1)); targets.push(answer);
  const ex = new Spring(0, 90, 13);
  return {
    targets,
    update(dt, t) {
      speed = damp(speed, 1, 1.5, dt);
      big.rotation.z -= dt * 0.8 * speed; small.rotation.z -= dt * 1.6 * speed;
      ex.to = exploded ? 1 : 0; const e = ex.step(dt);
      big.position.z = -e * 0.05; small.position.z = e * 0.06; chain.position.z = e * 0.01; chain.material.opacity = 1;
      rig.rotation.y = -0.3 + Math.sin(t * 0.4) * 0.25 + e * 0.4;
    },
    click(hit) { if (hitIn(hit, answer)) { exploded = !exploded; answer.userData.tex.redraw(); } else speed = 5; },
  };
});

// Chromebook: a Sheets chart that stands up as 3D bars; tap to switch the metric.
const METRICS = [['Revenue ($M)', [[3.1, 3.6, 4.2, 5.0], [2.2, 2.4, 2.9, 3.3], [1.4, 1.9, 2.1, 2.8]]], ['Active users (M)', [[1.2, 1.5, 1.9, 2.4], [2.6, 2.7, 3.1, 3.4], [0.8, 1.3, 1.7, 2.6]]]];
const sheetsChart = app((g, box, api) => {
  const targets = [];
  let metric = 0;
  const plot = new THREE.Group(); plot.position.set(0, -box.h * 0.18, 0.03); plot.rotation.x = 0.5; plot.rotation.y = -0.45; g.add(api.pop(plot, 0));
  const W = box.w * 0.55, D = box.h * 0.35;
  plot.add(new THREE.Mesh(new THREE.BoxGeometry(W, 0.004, D), std(0x2a2d33)));
  const cols = [0x8ab4ff, 0x9cd67e, 0xf2b8b5], bars = [];
  for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(W * 0.12, 1, D * 0.18), std(cols[r], { roughness: 0.35 }));
    b.position.set((q - 1.5) * W * 0.23, 0, (r - 1) * D * 0.3); b.userData.h = new Spring(0.001, 90, 12); b.userData.rq = [r, q]; plot.add(b); bars.push(b);
  }
  const hitM = new THREE.Mesh(new THREE.BoxGeometry(W, box.h * 0.5, D), new THREE.MeshBasicMaterial({ visible: false })); hitM.position.y = box.h * 0.2; plot.add(hitM); targets.push(hitM);
  const title = mcard(box.w * 0.5, box.h * 0.13, (ctx, w, h) => {
    fillShape(ctx, h * 0.5, h * 0.5, h * 0.32, 'squircle', C.grnC); glyph(ctx, 'grid', h * 0.5, h * 0.5, h * 0.3, '#c8f0b0');
    T(ctx, METRICS[metric][0], h * 0.95, h * 0.48, h * 0.28, 600, C.on); T(ctx, 'Q1–Q4 · 3 regions · tap to switch', h * 0.95, h * 0.78, h * 0.17, 400, C.onv);
  }, { fill: 'rgba(29,32,36,0.95)' });
  title.position.set(-box.w * 0.18, box.h * 0.33, 0.1); g.add(api.pop(title, 1)); targets.push(title);
  const scale = box.h * 0.085;
  return {
    targets,
    enter() { bars.forEach((b) => (b.userData.h.v = 0.001)); },
    update(dt, t) {
      bars.forEach((b) => { const [r, q] = b.userData.rq; b.userData.h.to = METRICS[metric][1][r][q] * scale; const h = Math.max(0.001, b.userData.h.step(dt)); b.scale.y = h; b.position.y = h / 2; });
      plot.rotation.y = -0.45 + Math.sin(t * 0.35) * 0.2;
    },
    click() { metric = (metric + 1) % METRICS.length; title.userData.tex.redraw(); },
  };
});

// =====================================================================================================
// Google TV: a match you can see as a pitch, with a replay that arcs the ball into the goal.
// =====================================================================================================
const sports = app((g, box, api) => {
  const targets = [];
  let score = [2, 1], replay = -1;
  const pitch = new THREE.Group(); pitch.position.set(0, -box.h * 0.12, 0.05); pitch.rotation.x = -1.05; g.add(api.pop(pitch, 0));
  const PW = box.w * 0.7, PH = box.h * 0.75;
  const grass = card3d(PW, PH, (ctx, w, h) => {
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#2f8f46' : '#2a8240'; ctx.fillRect(0, (i / 10) * h, w, h / 10); }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = w * 0.006;
    ctx.strokeRect(w * 0.04, h * 0.04, w * 0.92, h * 0.92); ctx.beginPath(); ctx.moveTo(w * 0.04, h / 2); ctx.lineTo(w * 0.96, h / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.12, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(w * 0.3, h * 0.04, w * 0.4, h * 0.14); ctx.strokeRect(w * 0.3, h * 0.82, w * 0.4, h * 0.14);
  }, { r: 0.01, depth: 0.006, px: 500, color: 0x1e5e30 });
  pitch.add(grass); targets.push(grass);
  const players = [];
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(new THREE.CapsuleGeometry(box.h * 0.012, box.h * 0.03, 4, 8), std(i < 5 ? 0x4b8bff : 0xf2f2f2, { roughness: 0.6 }));
    p.rotation.x = Math.PI / 2; p.userData.o = [Math.random() * PW * 0.8 - PW * 0.4, Math.random() * PH * 0.8 - PH * 0.4, Math.random() * 6];
    pitch.add(p); players.push(p);
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(box.h * 0.012, 16, 12), std(0xffffff, { roughness: 0.3 })); pitch.add(ball);
  const trail = glow(0xfff2a8, box.h * 0.08, 0.6); ball.add(trail);
  const board = mcard(box.w * 0.36, box.h * 0.16, (ctx, w, h) => {
    T(ctx, 'GTV FC', w * 0.17, h * 0.4, h * 0.17, 600, '#a8c8ff', 'center'); T(ctx, 'Rovers', w * 0.83, h * 0.4, h * 0.17, 600, '#eee', 'center');
    T(ctx, `${score[0]}  –  ${score[1]}`, w / 2, h * 0.6, h * 0.42, 700, '#fff', 'center');
    T(ctx, replay >= 0 ? 'REPLAY' : "78'  · LIVE", w / 2, h * 0.9, h * 0.15, 600, replay >= 0 ? '#ffd27a' : '#ff8a80', 'center');
  }, { fill: 'rgba(17,19,24,0.94)' });
  board.position.set(0, box.h * 0.34, 0.14); g.add(api.pop(board, 1)); targets.push(board);
  return {
    targets,
    update(dt, t) {
      players.forEach((p, i) => { const [x, y, ph] = p.userData.o; p.position.set(x + Math.sin(t * 0.7 + ph) * PW * 0.06, y + Math.cos(t * 0.5 + ph) * PH * 0.05, box.h * 0.025); });
      if (replay >= 0) {
        replay += dt / 1.6;
        const k = Math.min(1, replay);
        ball.position.set(-PW * 0.1 * (1 - k), -PH * 0.1 + k * PH * 0.48, box.h * 0.012 + Math.sin(k * Math.PI) * box.h * 0.25);
        trail.visible = true;
        if (replay >= 1) { replay = -1; score[0]++; board.userData.tex.redraw(); }
      } else { trail.visible = false; ball.position.set(Math.sin(t * 1.3) * PW * 0.2, Math.cos(t * 0.9) * PH * 0.15, box.h * 0.012); }
    },
    click() { if (replay < 0) { replay = 0; board.userData.tex.redraw(); } },
  };
});

// Google TV: posters pop out of the row; the focused one carries its title card.
const POSTERS = ['Northern Lights', 'The Long Orbit', 'Coastline', 'Night Market', 'Red Canyon'];
const posterPop = app((g, box, api) => {
  const targets = [];
  let focus = 2, idle = 0;
  const pw = box.w * 0.15, ph = pw * 1.45;
  const cards = POSTERS.map((name, i) => {
    const c = card3d(pw, ph, (ctx, w, h) => { photo(ctx, i, 0, 0, w, h, true); const gr = ctx.createLinearGradient(0, h * 0.5, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.8)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); T(ctx, name, w * 0.08, h * 0.92, h * 0.07, 600, '#fff'); }, { r: pw * 0.08, depth: 0.006, px: 360 });
    c.userData.i = i; c.userData.s = { z: new Spring(0, 130, 13), k: new Spring(1, 130, 13) };
    c.position.set((i - 2) * box.w * 0.18, -box.h * 0.05, 0.03); g.add(api.pop(c, i)); targets.push(c);
    return c;
  });
  const info = mcard(box.w * 0.34, box.h * 0.15, (ctx, w, h) => {
    T(ctx, POSTERS[focus], h * 0.2, h * 0.42, h * 0.26, 600, C.on); T(ctx, 'Top pick for you · 4K · Dolby Vision', h * 0.2, h * 0.74, h * 0.16, 400, C.onv);
  }, { fill: 'rgba(17,19,24,0.94)' });
  g.add(api.pop(info, 6));
  let shown = -1;
  return {
    targets,
    update(dt, t, hit) {
      const h = cards.find((c) => hitIn(hit, c));
      if (h) { focus = h.userData.i; idle = 0; } else { idle += dt; if (idle > 1.6) { idle = 0; focus = (focus + 1) % cards.length; } }
      if (shown !== focus) { shown = focus; info.userData.tex.redraw(); }
      cards.forEach((c, i) => { const s = c.userData.s, on = i === focus; s.z.to = on ? 0.15 : 0.03; s.k.to = on ? 1.35 : 1; c.position.z = s.z.step(dt); if (c.userData.rest) c.userData.rest.setScalar(s.k.step(dt)); });
      const f = cards[focus];
      info.position.set(f.position.x, f.position.y - ph * 0.85, f.position.z + 0.02);
    },
    click(hit) { const c = cards.find((x) => hitIn(hit, x)); focus = c ? c.userData.i : (focus + 1) % cards.length; idle = -2; },
  };
});

// =====================================================================================================
// Nest Hub: Google Home as a tiny 3D house; tap lights and the thermostat.
// =====================================================================================================
const homeHouse = app((g, box, api) => {
  const targets = [];
  let temp = 70;
  const house = new THREE.Group(); house.position.set(-box.w * 0.08, -box.h * 0.12, 0.05); house.rotation.set(0.75, -0.5, 0); g.add(api.pop(house, 0));
  const W = box.w * 0.6, D = box.h * 0.75, wallH = box.h * 0.12;
  house.add(new THREE.Mesh(new THREE.BoxGeometry(W, 0.006, D), std(0xd8cdbd)));
  const wall = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), std(0xf1ede6, { roughness: 0.8 })); m.position.set(x, wallH / 2, z); house.add(m); };
  wall(W, 0.008, 0, -D / 2); wall(0.008, D, -W / 2, 0); wall(0.008, D * 0.55, 0, -D * 0.22); wall(W * 0.5, 0.008, W * 0.25, D * 0.05);
  const lights = [[-W * 0.25, -D * 0.2], [W * 0.25, -D * 0.25], [-W * 0.2, D * 0.25], [W * 0.25, D * 0.28]].map(([x, z], i) => {
    const on = i !== 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(box.h * 0.035, 16, 12), emis(0xffd27a, on ? 1.2 : 0.05));
    bulb.position.set(x, wallH * 1.1, z); bulb.userData.on = on; house.add(bulb); targets.push(bulb);
    const pool = glow(0xffd27a, box.h * 0.4, on ? 0.45 : 0); pool.position.copy(bulb.position); house.add(pool); bulb.userData.pool = pool;
    return bulb;
  });
  const thermo = new THREE.Group(); thermo.position.set(box.w * 0.34, box.h * 0.05, 0.12); g.add(api.pop(thermo, 1));
  const dial = new THREE.Mesh(new THREE.TorusGeometry(box.h * 0.14, box.h * 0.022, 16, 64), emis(0xff9f43, 0.6)); thermo.add(dial);
  const face = new THREE.Mesh(new THREE.CircleGeometry(box.h * 0.13, 48), std(0x111318)); face.position.z = -0.002; thermo.add(face); targets.push(face);
  let tLabel = null;
  const setTemp = () => { tLabel = swapText(thermo, tLabel, `${temp}°`, { height: box.h * 0.12, weight: 500, color: '#ffffff' }, new THREE.Vector3(0, 0, 0.01)); };
  setTemp();
  const status = mcard(box.w * 0.4, box.h * 0.16, (ctx, w, h) => {
    const on = lights.filter((l) => l.userData.on).length;
    fillShape(ctx, h * 0.45, h * 0.5, h * 0.3, 'cookie', C.priC); glyph(ctx, 'home', h * 0.45, h * 0.5, h * 0.3, C.onPriC);
    T(ctx, 'Home', h * 0.9, h * 0.46, h * 0.28, 600, C.on); T(ctx, `${on} lights on · heating to ${temp}°`, h * 0.9, h * 0.76, h * 0.17, 400, C.onv);
  }, { fill: 'rgba(29,32,36,0.95)' });
  status.position.set(-box.w * 0.22, box.h * 0.36, 0.1); g.add(api.pop(status, 2));
  return {
    targets,
    update(dt, t) { house.rotation.y = -0.5 + Math.sin(t * 0.35) * 0.2; dial.rotation.z = Math.sin(t) * 0.1; },
    click(hit) {
      const b = lights.find((x) => hitIn(hit, x));
      if (b) { b.userData.on = !b.userData.on; b.material.emissiveIntensity = b.userData.on ? 1.2 : 0.05; b.userData.pool.material.opacity = b.userData.on ? 0.45 : 0; }
      else if (hitIn(hit, face)) { temp = temp >= 74 ? 68 : temp + 1; setTemp(); }
      status.userData.tex.redraw();
    },
  };
});

// =====================================================================================================
// Android XR glasses: Gemini directions as a real 3D arrow, and live translation bubbles.
// =====================================================================================================
const STEPS = [['Turn right', 'Valencia St', '350 ft', -1], ['Continue', 'Valencia St', '0.2 mi', 0], ['Turn left', '16th St', '120 ft', 1], ['Arrive', 'Ritual Coffee', 'on the left', 0]];
function arrowMesh(s) {
  const sh = new THREE.Shape();
  [[-0.12, -0.5], [0.12, -0.5], [0.12, 0.05], [0.3, 0.05], [0, 0.5], [-0.3, 0.05], [-0.12, 0.05]].forEach(([x, y], i) => (i ? sh.lineTo(x * s, y * s) : sh.moveTo(x * s, y * s)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: s * 0.12, bevelEnabled: true, bevelThickness: s * 0.03, bevelSize: s * 0.03, bevelSegments: 3 });
  geo.center();
  return new THREE.Mesh(geo, emis(0x4b8bff, 0.7, { roughness: 0.25 }));
}
const xrNav = app((g, box, api) => {
  const targets = [];
  let step = 0, dist = null;
  const a = arrowMesh(box.h * 0.9); a.position.set(-box.w * 0.22, 0, 0.08); g.add(api.pop(a, 0)); targets.push(a);
  a.add(glow(0x4b8bff, box.h * 1.4, 0.35));
  const card = mcard(box.w * 0.55, box.h * 0.42, (ctx, w, h) => {
    const [act, st] = STEPS[step];
    glyph(ctx, 'sparkle', h * 0.15, h * 0.18, h * 0.12, '#8fb4ff'); T(ctx, 'Gemini', h * 0.28, h * 0.22, h * 0.11, 500, '#dfe6f5');
    T(ctx, act, h * 0.1, h * 0.55, h * 0.18, 600, '#fff'); T(ctx, st, h * 0.1, h * 0.82, h * 0.16, 400, '#c4c6d0');
  }, { fill: 'rgba(14,16,22,0.9)' });
  card.position.set(box.w * 0.2, -box.h * 0.05, 0.05); g.add(api.pop(card, 1)); targets.push(card);
  const dPos = new THREE.Vector3(box.w * 0.2, box.h * 0.32, 0.1);
  const apply = () => { const [, , d, turn] = STEPS[step]; dist = swapText(g, dist, d, { height: box.h * 0.2, weight: 600, color: '#ffffff' }, dPos); a.userData.turn = turn; card.userData.tex.redraw(); };
  apply();
  const rot = new Spring(0, 90, 12);
  return {
    targets,
    update(dt, t) { rot.to = -(a.userData.turn || 0) * Math.PI / 2; a.rotation.z = rot.step(dt); a.rotation.x = -0.5; a.position.y = Math.sin(t * 2) * box.h * 0.04; },
    click() { step = (step + 1) % STEPS.length; apply(); },
  };
});
const PHRASES = [['¿Dónde está la estación?', 'Where is the station?'], ['Dos cafés, por favor.', 'Two coffees, please.'], ['¿Cuánto cuesta?', 'How much is it?']];
const xrTranslate = app((g, box, api) => {
  const targets = [];
  let i = 0;
  const bubble = (fill, fg, sub, z, y, which) => {
    const c = mcard(box.w * 0.95, box.h * 0.3, (ctx, w, h) => { T(ctx, sub, h * 0.2, h * 0.34, h * 0.17, 600, fg === '#fff' ? '#c4dcff' : C.onv); T(ctx, PHRASES[i][which], h * 0.2, h * 0.72, h * 0.24, 600, fg); }, { fill, r: box.h * 0.12 });
    c.position.set(which ? box.w * 0.08 : -box.w * 0.08, y, z); g.add(api.pop(c, which)); targets.push(c); return c;
  };
  const a = bubble('#2a2d33', C.on, 'Heard · Spanish', 0.03, box.h * 0.2, 0);
  const b = bubble('#1b5fd1', '#fff', 'Gemini · English', 0.1, -box.h * 0.16, 1);
  return {
    targets,
    update(dt, t) { b.position.z = 0.1 + Math.sin(t * 1.5) * 0.008; },
    click() { i = (i + 1) % PHRASES.length; a.userData.tex.redraw(); b.userData.tex.redraw(); },
  };
});

// ---- per-device app lists (google.js attaches these to its devices) ------------------------------------------
const A = (name, blurb, build) => ({ name, blurb, build });
export const GOOGLE_APPS = {
  pixel: [
    A('3D Weather', 'Pixel Weather with real clouds, sun, rain and snow above the phone. Tap a day to change the sky.', weather),
    A('Google Meet', 'An incoming video call: the caller leans out of the phone with the call controls floating in front. Accept, mute, end.', meetApp()),
    A('Notifications', 'Notifications stack toward you, newest nearest. Tap one to expand it, tap again to swipe it away.', notifications),
  ],
  fold: [
    A('Maps Immersive View', 'Google Maps’ Immersive View on the inner screen: real buildings, a live route and the ETA floating above. Tap a mode to reroute.', immersiveMaps),
    A('Cinematic photos', 'Google Photos memories pulled apart into sky, land and subject. Tap for the next memory.', cinematic(0.8)),
    A('Google Meet', 'A video call that leans out of the big screen. Accept, mute, end.', meetApp({ name: 'Leo Park', shirt: 0x2f8f5b, hair: 0x3a2414, skin: 0xc68d68 })),
  ],
  watch: [
    A('Fitbit Today', 'Activity rings, a beating heart and step tiles float off the round face. Tap the heart to start a workout.', fitbit),
    A('Wear OS tiles', 'Tiles fan out around the watch in an arc instead of hiding off-screen. Tap one to bring it forward.', wearTiles),
  ],
  tablet: [
    A('Family call', 'A Meet call with the family: everyone leans out of their tile and the speaker comes forward. Tap someone to focus them.', familyCall),
    A('Cinematic photos', 'Google Photos memories in layers. Tap for the next memory.', cinematic(0.7)),
    A('3D Weather', 'The week’s weather as real clouds and rain above the tablet. Tap a day.', weather),
  ],
  chromebook: [
    A('Gemini explains', 'Ask Gemini and the answer comes with a 3D model you can explode and spin.', geminiGears),
    A('Sheets in 3D', 'A Sheets chart stands up as 3D bars by quarter and region. Tap to switch the metric.', sheetsChart),
  ],
  tv: [
    A('Live sports', 'The match as a pitch you look down on, with a replay that arcs the ball into the goal. Tap for the replay.', sports),
    A('Poster pop', 'Google TV posters lift out of the row as focus moves; the focused one carries its details.', posterPop),
  ],
  hub: [
    A('Google Home', 'The house as a tiny 3D model: tap lights to switch them, tap the thermostat to warm up.', homeHouse),
    A('3D Weather', 'Weather across the room as real clouds and sun. Tap a day.', weather),
  ],
  glasses: [
    A('Gemini directions', 'Turn-by-turn as a solid arrow and a distance you can read at a glance. Tap for the next step.', xrNav),
    A('Live translate', 'What you hear, and Gemini’s translation floating nearer. Tap for the next phrase.', xrTranslate),
  ],
};
