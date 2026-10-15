// Apple: 3D apps for the device carousel. Each device's screen behaves like a glasses-free 3D screen:
// a FaceTime caller leans out of the iPhone, weather happens above it, notifications stack out of the
// glass, Activity rings float off the Watch, and so on. See main.js "3D apps on the device screens".
//
// Every app is build(box) → { group, targets, update(dt, t, hit, ext), click(hit), enter() }, built at the
// screen centre with +z out of the glass. box = { w, h } of the screen in carousel units.

import * as THREE from 'three';
import { Spring, damp, clamp, FONT, fillRR, strokeRR, text, grad, glyph } from '../kit.js';
import * as P from '../pop3d.js';
import { icon3d } from '../icons3d.js';
import { appIcon, lg } from './apple.js';

const F = FONT.apple;
const unit = (box, k = 1) => Math.min(box.w, box.h * 0.62) * k;
// The act tag of whatever was touched (walks up from the hit mesh).
const actOf = (hit) => { for (let o = hit?.object; o; o = o.parent) if (o.userData.act) return o.userData; return null; };
const hovered = (hit, obj) => { for (let o = hit?.object; o; o = o.parent) if (o === obj) return true; return false; };

// A Liquid Glass card: translucent slab with the glass face drawn by lg(), then draw() on top.
function gcard(w, h, draw, { px = 300, tint = 'rgba(44,48,60,0.62)', r = Math.min(w, h) * 0.24 } = {}) {
  const c = P.card3d(w, h, (ctx, cw, ch, t) => {
    ctx.clearRect(0, 0, cw, ch);
    lg(ctx, 2, 2, cw - 4, ch - 4, Math.min(cw, ch) * 0.24, { tint, rim: 0.7 });
    draw?.(ctx, cw, ch, t);
  }, { depth: Math.min(w, h) * 0.06, color: 0x8890a0, opacity: 0.18, px, r });
  return c;
}
// A round glass button with a glyph (accept, end, mute…).
function disc(size, color, g, act, { rot = 0, side } = {}) {
  const ic = icon3d({
    shape: 'circle', size, depth: size * 0.32, px: 160,
    side: side ?? new THREE.Color(color).multiplyScalar(0.65).getHex(),
    face: (c, w, h) => {
      c.fillStyle = color; c.fillRect(0, 0, w, h);
      c.fillStyle = grad(c, 0, 0, 0, h * 0.55, ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']); c.fillRect(0, 0, w, h * 0.55);
      if (g !== 'none') { c.save(); c.translate(w / 2, h / 2); c.rotate(rot); glyph(c, g, 0, 0, w * 0.5, '#fff'); c.restore(); }
    },
  });
  ic.userData.act = act;
  return ic;
}
// Show/hide with a springy scale, then hide for real (so it cannot be touched).
function popper(obj, k = 200) {
  const s = new Spring(0, k, 16);
  obj.scale.setScalar(0.001);
  return { s, set(on) { s.to = on ? 1 : 0; }, step(dt, extra = 1) { const v = Math.max(0.001, s.step(dt)); obj.scale.setScalar(v * extra); obj.visible = v > 0.02; return v; } };
}
const fade = (obj, a) => obj.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = (o.userData.baseOpacity ??= o.material.opacity) * a; } });

// =====================================================================================================
// FaceTime: the caller leans out of the screen; Liquid Glass controls float in front.
// =====================================================================================================
export function faceTime(box, { name = 'Maya Chen', label = 'FaceTime Video', look = { skin: 0xe2b28f, hair: 0x2b1d14, shirt: 0x3d6fd6 }, k = 1 } = {}) {
  const K = unit(box, k), g = new THREE.Group();
  const person = P.bust({ ...look, s: K * 0.62 }); g.add(person);
  const halo = P.glow(0x30d158, K * 1.6, 0); halo.position.set(0, box.h * 0.06, 0.004); g.add(halo);
  let state = 'ringing', since = 0, muted = false, callT = 0;
  const status = () => (state === 'ringing' ? `${label}…` : state === 'live' ? `${Math.floor(callT / 60)}:${String(Math.floor(callT % 60)).padStart(2, '0')}${muted ? ' · muted' : ''}` : 'Call ended');
  const card = gcard(K * 1.1, K * 0.26, (c, w, h) => {
    const s = h / 100;
    text(c, name, w / 2, 46 * s, { size: 30 * s, weight: 700, font: F, align: 'center' });
    text(c, status(), w / 2, 80 * s, { size: 21 * s, weight: 500, font: F, align: 'center', color: 'rgba(255,255,255,0.78)' });
  });
  card.position.set(0, box.h * 0.38, 0.06); g.add(card);
  const y = -box.h * 0.36;
  const accept = disc(K * 0.24, '#30d158', 'phone', 'accept'); accept.position.set(K * 0.34, y, 0.08);
  const end = disc(K * 0.24, '#ff3b30', 'phone', 'end', { rot: 2.36 }); end.position.set(-K * 0.34, y, 0.08);
  const mute = disc(K * 0.2, '#5b5f69', 'mic', 'mute'); mute.position.set(0, y, 0.08);
  const flip = disc(K * 0.2, '#5b5f69', 'camera', 'flip'); flip.position.set(K * 0.34, y, 0.08);
  g.add(accept, end, mute, flip);
  const pA = popper(accept), pE = popper(end), pM = popper(mute), pF = popper(flip);
  const z = new Spring(0.01, 90, 13), sc = new Spring(0.8, 90, 12), spin = new Spring(0, 60, 9);
  let redraw = 0;
  const setState = (s) => { state = s; since = 0; card.userData.tex.redraw(); };
  return {
    group: g, targets: [accept, end, mute, flip, person],
    enter() { setState('ringing'); callT = 0; },
    update(dt, t, hit) {
      since += dt;
      if (state === 'live') callT += dt;
      if (state === 'ended' && since > 1.8) setState('ringing');
      z.to = state === 'live' ? 0.09 : state === 'ringing' ? 0.02 + Math.sin(t * 3) * 0.006 : 0.0;
      sc.to = state === 'live' ? 1.05 : state === 'ringing' ? 0.8 : 0.35;
      person.position.set(0, box.h * 0.04, z.step(dt));
      person.scale.setScalar(Math.max(0.05, sc.step(dt)));
      person.rotation.y = spin.step(dt);
      person.userData.talking = state === 'live';
      P.updateAll(person, dt, t);
      halo.material.opacity = state === 'ringing' ? 0.25 + 0.2 * Math.sin(t * 5) : state === 'live' ? 0.12 : 0;
      pA.set(state === 'ringing'); pE.set(state !== 'ended'); pM.set(state === 'live'); pF.set(state === 'live');
      pA.step(dt, (state === 'ringing' ? 1 + 0.08 * Math.sin(t * 7) : 1) * (hovered(hit, accept) ? 1.15 : 1));
      pE.step(dt, hovered(hit, end) ? 1.15 : 1); pM.step(dt, hovered(hit, mute) ? 1.15 : 1); pF.step(dt, hovered(hit, flip) ? 1.15 : 1);
      if ((redraw -= dt) <= 0 && state === 'live') { redraw = 1; card.userData.tex.redraw(); }
    },
    click(hit) {
      const a = actOf(hit)?.act;
      if (a === 'accept' || (!a && state === 'ringing')) { setState('live'); callT = 0; }
      else if (a === 'end') setState('ended');
      else if (a === 'mute') { muted = !muted; card.userData.tex.redraw(); }
      else if (a === 'flip' || (!a && state === 'live')) spin.to += Math.PI * 2;
      else if (state === 'ended') setState('ringing');
    },
  };
}

// =====================================================================================================
// Weather: the forecast happens above the screen. Click a day (or anywhere) to change it.
// =====================================================================================================
const DAYS = [
  { d: 'Today', t: 72, hi: 78, lo: 58, c: 'Sunny', g: 'sun', sun: 1, clouds: 0 },
  { d: 'Thu', t: 66, hi: 70, lo: 55, c: 'Partly Cloudy', g: 'cloud', sun: 1, clouds: 2 },
  { d: 'Fri', t: 58, hi: 61, lo: 50, c: 'Rain', g: 'cloud', clouds: 3, rain: 1 },
  { d: 'Sat', t: 54, hi: 57, lo: 47, c: 'Thunderstorms', g: 'flash', clouds: 3, rain: 1, storm: 1 },
  { d: 'Sun', t: 31, hi: 34, lo: 24, c: 'Snow', g: 'moon', clouds: 3, snow: 1 },
];
export function weather(box, { k = 1, place = 'Cupertino' } = {}) {
  const K = unit(box, k), g = new THREE.Group(), targets = [];
  const sky = new THREE.Group(); sky.position.set(0, box.h * 0.3, 0.09); g.add(sky);
  const sun = P.sun(K * 0.12); sun.position.set(-K * 0.2, K * 0.08, -0.02); sky.add(sun);
  const clouds = [[K * 0.06, 0, 0.03, 0.18], [-K * 0.22, -K * 0.05, 0.05, 0.14], [K * 0.28, K * 0.06, 0.0, 0.13]].map(([x, y, z, s]) => {
    const c = P.cloud(K * s, 0xf2f4f8); c.position.set(x, y, z); sky.add(c); return c;
  });
  const cloudMats = clouds.map((c) => c.children[0].material);
  const rain = P.precipitation({ w: K * 0.6, h: K * 0.42, d: 0.05, count: 80 }); rain.position.set(0, -K * 0.27, 0.03); sky.add(rain);
  const snow = P.precipitation({ w: K * 0.6, h: K * 0.42, d: 0.05, count: 70, snow: true }); snow.position.set(0, -K * 0.27, 0.03); sky.add(snow);
  const bolt = P.bolt(K * 0.3); bolt.position.set(K * 0.02, -K * 0.16, 0.05); sky.add(bolt);
  const temps = DAYS.map((d) => {
    const m = new THREE.Group();
    const big = P.bigText(`${d.t}°`, { height: K * 0.36, font: F, weight: 300 }); m.add(big);
    const lab = P.bigText(`${d.c} · H:${d.hi}° L:${d.lo}°`, { height: K * 0.075, font: F, weight: 600 }); lab.position.y = -K * 0.2; m.add(lab);
    const pl = P.bigText(place, { height: K * 0.08, font: F, weight: 600 }); pl.position.y = K * 0.2; m.add(pl);
    m.position.set(0, -box.h * 0.02, 0.06); m.visible = false; g.add(m); return m;
  });
  const cw = box.w * 0.185, cards = DAYS.map((d, i) => {
    const c = gcard(cw, box.h * 0.15, (ctx, w, h) => {
      const s = h / 100;
      text(ctx, d.d, w / 2, 26 * s, { size: 18 * s, weight: 700, font: F, align: 'center' });
      glyph(ctx, d.g, w / 2, 54 * s, 30 * s, d.g === 'sun' ? '#ffd60a' : d.g === 'flash' ? '#ffe14d' : '#fff');
      text(ctx, `${d.t}°`, w / 2, 90 * s, { size: 22 * s, weight: 600, font: F, align: 'center' });
    }, { px: 200 });
    c.position.set((i - 2) * cw * 1.08, -box.h * 0.36, 0.03); c.userData.act = 'day'; c.userData.i = i;
    c.userData.z = new Spring(0.03, 180, 16);
    g.add(c); targets.push(c); return c;
  });
  const S = { sun: new Spring(1), c: clouds.map(() => new Spring(0)), rain: new Spring(0), snow: new Spring(0), storm: new Spring(0) };
  let day = 0, auto = 0, hold = 0;
  const setDay = (i) => {
    day = (i + DAYS.length) % DAYS.length; const d = DAYS[day];
    temps.forEach((m, j) => (m.visible = j === day));
    S.sun.to = d.sun ? 1 : 0; S.c.forEach((s, j) => (s.to = j < (d.clouds || 0) ? 1 : 0));
    S.rain.to = d.rain ? 1 : 0; S.snow.to = d.snow ? 1 : 0; S.storm.to = d.storm ? 1 : 0;
    cloudMats.forEach((m) => m.color.set(d.storm || d.rain ? 0x8a919e : d.snow ? 0xe8ecf2 : 0xf4f6fb));
    auto = 0;
  };
  setDay(0);
  return {
    group: g, targets,
    enter() { setDay(0); hold = 0; },
    update(dt, t, hit) {
      if ((hold -= dt) <= 0 && (auto += dt) > 2.2) setDay(day + 1);
      sun.scale.setScalar(Math.max(0.001, S.sun.step(dt))); sun.visible = sun.scale.x > 0.02;
      clouds.forEach((c, j) => { const v = Math.max(0.001, S.c[j].step(dt)); c.scale.setScalar(v); c.visible = v > 0.02; });
      rain.visible = S.rain.step(dt) > 0.3; snow.visible = S.snow.step(dt) > 0.3; bolt.visible = S.storm.step(dt) > 0.3;
      P.updateAll(sky, dt, t);
      if (!DAYS[day].storm) bolt.visible = false;
      sky.rotation.y = Math.sin(t * 0.4) * 0.15;
      cards.forEach((c, i) => {
        c.userData.z.to = i === day ? 0.075 : hovered(hit, c) ? 0.055 : 0.03;
        c.position.z = c.userData.z.step(dt);
        c.scale.setScalar(i === day ? 1.12 : 1);
      });
    },
    click(hit) { const a = actOf(hit); hold = 6; setDay(a?.act === 'day' ? a.i : day + 1); },
  };
}

// =====================================================================================================
// Notifications that stack out of the glass. Click once to expand, again to dismiss.
// =====================================================================================================
const NOTES = {
  phone: [
    ['messages', 'Maya', 'Prototype looks amazing in 3D!'],
    ['calendar', 'Design review', '10:00 AM · Studio B'],
    ['mail', 'DisplayXR', 'Your build is ready to test'],
    ['fitness', 'Activity', 'Close your Move ring: 120 cal to go'],
  ],
  lock: [
    ['wallet', 'Apple Pay', 'Blue Bottle Coffee · $5.25'],
    ['home', 'Home', 'Front door unlocked by Sam'],
    ['messages', 'Design Team', 'Island stack v3 is up'],
    ['weather', 'Weather', 'Rain starting in 15 minutes'],
  ],
  mac: [
    ['messages', 'Maya', 'Can we test on the panel at 2?'],
    ['calendar', 'Spatial UI review', 'In 10 minutes · Studio B'],
    ['mail', 'Build bot', 'displayxr-spatial-ui deployed'],
  ],
};
export function notifications(box, kind = 'phone') {
  const list = NOTES[kind], mac = kind === 'mac';
  const w = mac ? box.w * 0.36 : box.w * 1.02, h = mac ? box.h * 0.13 : box.h * 0.13;
  const g = new THREE.Group(), targets = [];
  const base = (i) => mac
    ? new THREE.Vector3(box.w * 0.29, box.h * 0.36 - i * h * 1.12, 0.1 - i * 0.025)
    : new THREE.Vector3(0, -box.h * 0.2 + i * h * 1.02, 0.12 - i * 0.032);
  const cards = list.map(([id, title, body], i) => {
    const flags = { open: false };
    const c = gcard(w, h, (ctx, cw, ch) => {
      const s = ch / 100;
      appIcon(ctx, id, 14 * s, 14 * s, 48 * s);
      text(ctx, title, 76 * s, 36 * s, { size: 22 * s, weight: 700, font: F });
      text(ctx, 'now', cw - 18 * s, 34 * s, { size: 16 * s, weight: 500, font: F, align: 'right', color: 'rgba(255,255,255,0.6)' });
      text(ctx, body, 76 * s, 66 * s, { size: 19 * s, weight: 500, font: F, color: 'rgba(255,255,255,0.9)' });
      if (flags.open) text(ctx, 'Reply   ·   Mark as Read   ·   Open', 76 * s, 90 * s, { size: 15 * s, weight: 700, font: F, color: '#64d2ff' });
    }, { px: 220 });
    c.userData = { ...c.userData, act: 'note', i, flags, gone: false, x: new Spring(0, 120, 14), z: new Spring(0, 160, 15), s: new Spring(1, 160, 14), a: new Spring(0, 60, 12) };
    g.add(c); targets.push(c); return c;
  });
  let since = 0, empty = 0;
  const reset = () => { since = 0; empty = 0; cards.forEach((c) => { c.userData.flags.open = false; c.userData.gone = false; c.userData.x.v = 0; c.userData.a.v = 0; c.userData.tex.redraw(); }); };
  return {
    group: g, targets,
    enter: reset,
    update(dt, t, hit) {
      since += dt;
      cards.forEach((c, i) => {
        const u = c.userData, b = base(i), on = P.stagger(since, list.length - 1 - i, 0.18, 0.45);
        u.x.to = u.gone ? box.w * 1.1 : 0;
        u.z.to = (u.flags.open ? 0.06 : 0) + (hovered(hit, c) ? 0.02 : 0);
        u.s.to = u.flags.open ? 1.16 : 1;
        u.a.to = u.gone ? 0 : 1;
        c.position.set(b.x + u.x.step(dt), b.y, b.z * on + u.z.step(dt));
        c.scale.setScalar(Math.max(0.01, u.s.step(dt) * (0.6 + 0.4 * on)));
        const a = clamp(u.a.step(dt) * on, 0, 1); fade(c, a); c.visible = a > 0.03;
      });
      if (cards.every((c) => c.userData.gone) && (empty += dt) > 1) reset();
    },
    click(hit) {
      const a = actOf(hit);
      const c = a?.act === 'note' ? cards[a.i] : cards.find((x) => !x.userData.gone);
      if (!c) return;
      if (!c.userData.flags.open) { cards.forEach((x) => { if (x.userData.flags.open) { x.userData.flags.open = false; x.userData.tex.redraw(); } }); c.userData.flags.open = true; }
      else { c.userData.gone = true; c.userData.flags.open = false; }
      c.userData.tex.redraw();
    },
  };
}

// =====================================================================================================
// Now Playing: album art floats forward over a live waveform. Click art for next, button to pause.
// =====================================================================================================
const TRACKS = [
  { title: 'Glass Horizons', artist: 'Aurora Lane', c: ['#ff9f0a', '#ff375f', '#5e5ce6'] },
  { title: 'Depth of Field', artist: 'The Parallax', c: ['#30d158', '#64d2ff', '#0a84ff'] },
  { title: 'Night Weave', artist: 'Lenticular', c: ['#bf5af2', '#ff375f', '#1c1c1e'] },
];
export function nowPlaying(box, { k = 1 } = {}) {
  const K = unit(box, k), g = new THREE.Group();
  let tr = 0, playing = true, prog = 0.3;
  const art = P.card3d(K * 0.66, K * 0.66, (c, w, h) => {
    const T = TRACKS[tr];
    c.fillStyle = grad(c, 0, 0, w, h, T.c); c.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(w * (0.2 + i * 0.15), h * (0.7 - i * 0.08), w * (0.3 - i * 0.04), 0, Math.PI * 2); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = w * 0.02; c.stroke(); }
    text(c, T.title.toUpperCase(), w * 0.08, h * 0.9, { size: w * 0.075, weight: 800, font: F, spacing: 2 });
  }, { depth: K * 0.03, color: 0x111111, px: 360, r: K * 0.05 });
  art.position.set(0, box.h * 0.14, 0.11); art.userData.act = 'art'; g.add(art);
  const info = gcard(K * 1.05, K * 0.26, (c, w, h) => {
    const s = h / 100, T = TRACKS[tr];
    text(c, T.title, 24 * s, 40 * s, { size: 26 * s, weight: 700, font: F });
    text(c, T.artist, 24 * s, 68 * s, { size: 20 * s, weight: 500, font: F, color: 'rgba(255,255,255,0.7)' });
    fillRR(c, 24 * s, 82 * s, w - 48 * s, 6 * s, 3 * s, 'rgba(255,255,255,0.25)');
    fillRR(c, 24 * s, 82 * s, (w - 48 * s) * prog, 6 * s, 3 * s, '#fff');
  });
  info.position.set(0, -box.h * 0.16, 0.06); g.add(info);
  const wave = P.bars({ n: 16, w: K * 0.9, h: K * 0.2, colors: [new THREE.Color(TRACKS[0].c[0]).getHex(), new THREE.Color(TRACKS[0].c[1]).getHex()] });
  wave.position.set(0, -box.h * 0.38, 0.05); g.add(wave);
  const btn = disc(K * 0.2, '#f2f2f7', 'pause', 'play', { side: 0x9a9aa0 }); btn.position.set(K * 0.42, -box.h * 0.16, 0.1); g.add(btn);
  const btnPlay = disc(K * 0.2, '#f2f2f7', 'play', 'play', { side: 0x9a9aa0 }); btnPlay.position.copy(btn.position); btnPlay.visible = false; g.add(btnPlay);
  const spin = new Spring(0, 80, 10);
  let redraw = 0;
  return {
    group: g, targets: [art, btn, btnPlay],
    update(dt, t, hit) {
      art.rotation.y = (playing ? Math.sin(t * 0.8) * 0.25 : 0) + spin.step(dt);
      art.position.z = 0.11 + (hovered(hit, art) ? 0.025 : 0);
      if (playing) { P.updateAll(wave, dt, t); prog = (prog + dt * 0.02) % 1; }
      btn.visible = playing; btnPlay.visible = !playing;
      if ((redraw -= dt) <= 0) { redraw = 0.5; info.userData.tex.redraw(); }
    },
    click(hit) {
      const a = actOf(hit)?.act;
      if (a === 'play') playing = !playing;
      else { tr = (tr + 1) % TRACKS.length; prog = 0; spin.to += Math.PI * 2; art.userData.tex.redraw(); info.userData.tex.redraw(); }
    },
  };
}

// =====================================================================================================
// Messages with Tapbacks: reactions pop out of the bubbles in 3D.
// =====================================================================================================
export function tapback(box) {
  const g = new THREE.Group(), targets = [];
  const msgs = [['Shipping the 3D build tonight', false], ['Can I see it on the panel?', true], ['The weather pops out of the phone!', false], ['No way 😮', true]];
  const moods = ['love', 'smile', 'wow'];
  const bubbles = msgs.map(([m, me], i) => {
    const w = box.w * 0.82, h = box.h * 0.1;
    const c = P.card3d(w, h, (ctx, cw, ch) => {
      fillRR(ctx, 0, 0, cw, ch, ch / 2, me ? '#0a84ff' : '#3a3a3c');
      text(ctx, m.replace(' 😮', ''), cw * 0.07, ch * 0.62, { size: ch * 0.36, weight: 500, font: F });
    }, { depth: 0.006, color: me ? 0x0a64c8 : 0x2a2a2c, r: h / 2, px: 160 });
    c.position.set(me ? box.w * 0.1 : -box.w * 0.1, box.h * (0.3 - i * 0.18), 0.03 + i * 0.025);
    c.userData = { ...c.userData, act: 'bubble', i, me, n: 0, base: c.position.clone() };
    g.add(c); targets.push(c);
    return c;
  });
  const balls = [];
  const react = (b) => {
    const u = b.userData, mood = moods[u.n++ % moods.length];
    const e = P.emojiBall(box.w * 0.075, mood === 'love' ? 0xff6b8a : 0xffcc33, mood);
    e.position.set(u.base.x + (u.me ? -1 : 1) * box.w * 0.38, u.base.y + box.h * 0.06, u.base.z + 0.06);
    e.userData.s = new Spring(0, 220, 10); e.userData.s.to = 1; e.userData.life = 0;
    g.add(e); balls.push(e);
    if (balls.length > 4) { const old = balls.shift(); g.remove(old); }
  };
  let auto = 0, since = 0;
  return {
    group: g, targets,
    enter() { since = 0; auto = 1; },
    update(dt, t, hit) {
      since += dt;
      bubbles.forEach((b, i) => { const on = P.stagger(since, i, 0.25); b.scale.setScalar(Math.max(0.01, on)); b.position.z = b.userData.base.z + (hovered(hit, b) ? 0.03 : 0); });
      if ((auto -= dt) <= 0) { auto = 1.6; react(bubbles[(Math.random() * bubbles.length) | 0]); }
      balls.forEach((e) => { e.scale.setScalar(Math.max(0.01, e.userData.s.step(dt))); P.updateAll(e, dt, t); });
    },
    click(hit) { const a = actOf(hit); react(a?.act === 'bubble' ? bubbles[a.i] : bubbles[0]); auto = 4; },
  };
}

// =====================================================================================================
// Maps: a 3D city with the route rises out of the fold. Click to turn the block and pick another route.
// =====================================================================================================
const ROUTES = [['12 min', '3.4 mi via Market St'], ['15 min', '4.1 mi via Embarcadero'], ['9 min', 'Bike · 1.9 mi via The Wiggle']];
export function maps(box) {
  const g = new THREE.Group();
  let r = 0;
  const cityHolder = new THREE.Group(); cityHolder.position.set(box.w * 0.08, -box.h * 0.1, 0.07); g.add(cityHolder);
  const city = P.city({ w: box.w * 0.6, d: box.w * 0.38 }); city.rotation.x = 0.95; cityHolder.add(city);
  const eta = gcard(box.w * 0.52, box.h * 0.17, (c, w, h) => {
    const s = h / 100;
    text(c, ROUTES[r][0], 22 * s, 50 * s, { size: 38 * s, weight: 800, font: F, color: '#30d158' });
    text(c, ROUTES[r][1], 22 * s, 82 * s, { size: 19 * s, weight: 600, font: F });
  });
  eta.position.set(-box.w * 0.18, box.h * 0.36, 0.08); g.add(eta);
  const turn = new Spring(0, 60, 11);
  return {
    group: g, targets: [cityHolder, eta],
    update(dt, t) { city.rotation.z = turn.step(dt) + Math.sin(t * 0.4) * 0.12; P.updateAll(city, dt, t); },
    click() { r = (r + 1) % ROUTES.length; turn.to += Math.PI / 2; eta.userData.tex.redraw(); },
  };
}

// =====================================================================================================
// Spatial Photos: a photo split into its depth layers. Click for the next memory.
// =====================================================================================================
const SCENES = [
  { name: 'Big Sur · Sunset', sky: ['#ffb36b', '#ff6f91', '#6a5cff'], hill: '#2b2350', sub: '#120d24' },
  { name: 'Yosemite · Morning', sky: ['#9fd3ff', '#e6f3ff', '#ffffff'], hill: '#3d6b55', sub: '#1d3a2c' },
  { name: 'Kyoto · Night', sky: ['#0b1238', '#28205e', '#a23b72'], hill: '#1a1430', sub: '#0a0814' },
];
export function spatialPhoto(box) {
  const g = new THREE.Group();
  let sc = 0;
  const photo = P.depthPhoto({
    w: box.w * 0.9, h: box.h * 0.74, gap: 0.04,
    draw: (c, w, h, layer) => {
      const S = SCENES[sc];
      c.clearRect(0, 0, w, h);
      if (layer === 0) { c.fillStyle = grad(c, 0, 0, 0, h, S.sky); c.fillRect(0, 0, w, h); c.beginPath(); c.arc(w * 0.7, h * 0.42, h * 0.1, 0, Math.PI * 2); c.fillStyle = 'rgba(255,245,220,0.9)'; c.fill(); }
      if (layer === 1) { c.fillStyle = S.hill; c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * 0.6); for (let x = 0; x <= w; x += w / 8) c.lineTo(x, h * (0.55 + 0.12 * Math.sin(x / w * 7 + sc))); c.lineTo(w, h); c.fill(); }
      if (layer === 2) {
        c.fillStyle = S.sub;
        c.beginPath(); c.moveTo(0, h); c.quadraticCurveTo(w * 0.25, h * 0.72, w * 0.5, h * 0.86); c.quadraticCurveTo(w * 0.8, h * 0.95, w, h * 0.8); c.lineTo(w, h); c.fill();
        c.beginPath(); c.arc(w * 0.28, h * 0.6, h * 0.06, 0, Math.PI * 2); c.fill(); fillRR(c, w * 0.24, h * 0.66, w * 0.08, h * 0.22, h * 0.03, S.sub);
      }
    },
  });
  photo.position.z = 0.02; g.add(photo);
  const cap = gcard(box.w * 0.6, box.h * 0.1, (c, w, h) => text(c, SCENES[sc].name, w / 2, h * 0.62, { size: h * 0.38, weight: 700, font: F, align: 'center' }), { px: 140 });
  cap.position.set(0, -box.h * 0.42, 0.13); g.add(cap);
  return {
    group: g, targets: [photo, cap],
    update(dt, t) { P.updateAll(photo, dt, t); photo.rotation.y = Math.sin(t * 0.5) * 0.08; },
    click() { sc = (sc + 1) % SCENES.length; photo.children.forEach((m) => m.material.map?.redraw?.()); cap.userData.tex.redraw(); },
  };
}

// =====================================================================================================
// Quick Look: a product model sits on the iPad, in true 3D. Click the swatches to change its finish.
// =====================================================================================================
export function quickLook(box) {
  const K = unit(box), g = new THREE.Group();
  const model = new THREE.Group(); model.position.set(0, box.h * 0.02, 0.1); g.add(model);
  const fabric = new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(K * 0.26, 48, 32), fabric); body.scale.set(1, 0.82, 1); model.add(body);
  const top = new THREE.Mesh(new THREE.CircleGeometry(K * 0.17, 48), new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.15, metalness: 0.4 }));
  top.rotation.x = -Math.PI / 2; top.position.y = K * 0.2; model.add(top);
  const lightRing = new THREE.Mesh(new THREE.TorusGeometry(K * 0.09, K * 0.012, 12, 48), new THREE.MeshStandardMaterial({ color: 0x9b6bff, emissive: 0x9b6bff, emissiveIntensity: 1.2 }));
  lightRing.rotation.x = -Math.PI / 2; lightRing.position.y = K * 0.205; model.add(lightRing);
  const shadow = P.glow(0x000000, K * 0.7, 0.0); model.add(shadow);
  const label = gcard(K * 0.95, K * 0.18, (c, w, h) => { const s = h / 100; text(c, 'Quick Look · 9.8 cm', w / 2, 48 * s, { size: 26 * s, weight: 700, font: F, align: 'center' }); text(c, 'Tap a finish · tap the model to spin', w / 2, 78 * s, { size: 17 * s, weight: 500, font: F, align: 'center', color: 'rgba(255,255,255,0.7)' }); });
  label.position.set(0, box.h * 0.4, 0.06); g.add(label);
  const finishes = [['#e8e8ea', 0xe8e8ea], ['#2c2f3a', 0x2c2f3a], ['#5a8cff', 0x5a8cff], ['#ff9f43', 0xff9f43], ['#f5d6e4', 0xf5d6e4]];
  const swatches = finishes.map(([css, hex], i) => {
    const d = disc(K * 0.13, css, 'none', 'finish', { side: hex }); d.userData.i = i;
    d.position.set((i - 2) * K * 0.19, -box.h * 0.38, 0.07); g.add(d); return d;
  });
  const spin = new Spring(0, 40, 8);
  let cur = 0;
  return {
    group: g, targets: [model, ...swatches],
    update(dt, t, hit) {
      model.rotation.y = t * 0.6 + spin.step(dt); model.rotation.x = 0.25;
      lightRing.material.emissiveIntensity = 0.8 + 0.6 * Math.sin(t * 3);
      swatches.forEach((s, i) => s.scale.setScalar(i === cur ? 1.25 : hovered(hit, s) ? 1.12 : 1));
    },
    click(hit) {
      const a = actOf(hit);
      if (a?.act === 'finish') { cur = a.i; fabric.color.setHex(finishes[cur][1]); }
      else spin.to += Math.PI * 2;
    },
  };
}

// =====================================================================================================
// Freeform: sticky notes on a board at different depths. Click one to bring it to the front.
// =====================================================================================================
export function freeform(box) {
  const g = new THREE.Group(), targets = [];
  const notes = [['Glass sits above content', '#ffd60a', -0.3, 0.22], ['Depth = importance', '#ff9fb2', 0.05, 0.28], ['Controls float in front', '#8fd3ff', 0.3, 0.12], ['Wallpaper goes behind', '#b6f09c', -0.22, -0.18], ['Test on the panel!', '#ffb86b', 0.18, -0.22]];
  let front = 1;
  const cards = notes.map(([t, col, x, y], i) => {
    const s = box.h * 0.26;
    const c = P.card3d(s, s, (ctx, w, h) => { ctx.fillStyle = col; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 0, w, h * 0.12); const words = t.split(' '); let line = '', yy = h * 0.36; for (const wd of words) { const next = line ? line + ' ' + wd : wd; ctx.font = `700 ${h * 0.13}px ${F}`; if (ctx.measureText(next).width > w * 0.82) { text(ctx, line, w * 0.09, yy, { size: h * 0.13, weight: 700, color: '#1c1c1e', font: F }); line = wd; yy += h * 0.17; } else line = next; } text(ctx, line, w * 0.09, yy, { size: h * 0.13, weight: 700, color: '#1c1c1e', font: F }); }, { depth: 0.004, color: new THREE.Color(col).multiplyScalar(0.8).getHex(), r: s * 0.04, px: 240 });
    c.position.set(x * box.w, y * box.h, 0.03 + i * 0.012); c.rotation.z = (i % 2 ? 1 : -1) * 0.06;
    c.userData = { ...c.userData, act: 'note', i, z: new Spring(0.03, 140, 14) };
    g.add(c); targets.push(c); return c;
  });
  // connectors between notes, a hand-drawn feel in white
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
  const lines = [[0, 1], [1, 2], [0, 3], [3, 4], [2, 4]].map(([a, b]) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), mat); l.userData.ab = [a, b]; g.add(l); return l; });
  const _m = new THREE.Vector3();
  return {
    group: g, targets,
    update(dt, t, hit) {
      cards.forEach((c, i) => { c.userData.z.to = i === front ? 0.15 : 0.03 + i * 0.015 + (hovered(hit, c) ? 0.03 : 0); c.position.z = c.userData.z.step(dt); c.scale.setScalar(i === front ? 1.12 : 1); });
      lines.forEach((l) => { const [a, b] = l.userData.ab, A = cards[a].position, B = cards[b].position; _m.copy(A).add(B).multiplyScalar(0.5); _m.z += 0.03; l.geometry.setFromPoints([A, _m, B]); });
    },
    click(hit) { const a = actOf(hit); front = a?.act === 'note' ? a.i : (front + 1) % cards.length; },
  };
}

// =====================================================================================================
// Keynote: a 3D column chart builds out of the slide. Click for the next build.
// =====================================================================================================
const SERIES = [
  { t: 'Glasses-free 3D sessions', v: [0.3, 0.45, 0.4, 0.62, 0.78, 0.95], c: [0x64d2ff, 0x0a84ff] },
  { t: 'Apps with depth', v: [0.2, 0.3, 0.55, 0.5, 0.7, 0.85], c: [0x30d158, 0x64d2ff] },
  { t: 'Time in 3D (min/day)', v: [0.5, 0.35, 0.6, 0.8, 0.65, 0.9], c: [0xff9f0a, 0xff375f] },
];
export function keynote(box) {
  const g = new THREE.Group();
  let s = 0;
  const stage = new THREE.Group(); stage.position.set(0, -box.h * 0.2, 0.05); stage.rotation.x = 0.42; g.add(stage);
  const W = box.w * 0.8, D = box.h * 0.35;
  const base = new THREE.Mesh(new THREE.BoxGeometry(W, 0.006, D), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.1, clearcoat: 1 }));
  stage.add(base);
  const cols = SERIES[0].v.map((v, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(W / 9, 1, D * 0.5), new THREE.MeshPhysicalMaterial({ color: 0x0a84ff, roughness: 0.25, clearcoat: 1 }));
    m.position.x = (i - 2.5) * (W / 6.4); m.userData.h = new Spring(0.001, 120, 12); stage.add(m); return m;
  });
  const title = gcard(box.w * 0.62, box.h * 0.14, (c, w, h) => text(c, SERIES[s].t, w / 2, h * 0.62, { size: h * 0.34, weight: 800, font: F, align: 'center' }), { px: 160 });
  title.position.set(0, box.h * 0.34, 0.07); g.add(title);
  const c0 = new THREE.Color(), c1 = new THREE.Color();
  const build = () => {
    const S = SERIES[s]; c0.setHex(S.c[0]); c1.setHex(S.c[1]);
    cols.forEach((m, i) => { m.userData.h.v = 0.001; m.userData.h.to = S.v[i] * box.h * 0.55; m.material.color.copy(c0).lerp(c1, i / 5); });
    title.userData.tex.redraw();
  };
  build();
  return {
    group: g, targets: [stage, title],
    enter: build,
    update(dt, t) {
      cols.forEach((m) => { const h = Math.max(0.001, m.userData.h.step(dt)); m.scale.y = h; m.position.y = h / 2; });
      stage.rotation.y = Math.sin(t * 0.4) * 0.2;
    },
    click() { s = (s + 1) % SERIES.length; build(); },
  };
}

// =====================================================================================================
// Group FaceTime: tiles at depth; the person speaking comes forward. Click a tile to spotlight it.
// =====================================================================================================
const PEOPLE = [
  ['Maya', { skin: 0xe2b28f, hair: 0x2b1d14, shirt: 0x3d6fd6 }], ['Sam', { skin: 0x8d5a3b, hair: 0x111111, shirt: 0x30d158 }],
  ['Alex', { skin: 0xf1c9a5, hair: 0xb5651d, shirt: 0xff9f0a }], ['Jordan', { skin: 0xc68e62, hair: 0x3a2a20, shirt: 0xbf5af2 }],
];
export function groupFaceTime(box) {
  const g = new THREE.Group(), targets = [];
  const tw = box.w * 0.36, th = box.h * 0.36;
  let active = 0, auto = 0, hold = 0;
  const tiles = PEOPLE.map(([n, look], i) => {
    const t = new THREE.Group();
    const frame = gcard(tw, th, (c, w, h) => text(c, n, w * 0.08, h * 0.9, { size: h * 0.11, weight: 700, font: F }), { px: 220, tint: 'rgba(30,34,44,0.7)' });
    t.add(frame);
    const p = P.bust({ ...look, s: th * 0.62 }); p.position.set(0, -th * 0.05, 0.01); t.add(p);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(tw * 1.02, th * 1.02)), new THREE.LineBasicMaterial({ color: 0x30d158 }));
    rim.position.z = 0.012; t.add(rim);
    t.position.set((i % 2 ? 1 : -1) * tw * 0.56, (i < 2 ? 1 : -1) * th * 0.56, 0.03);
    t.userData = { act: 'tile', i, p, rim, base: t.position.clone(), z: new Spring(0.03, 120, 13), s: new Spring(1, 120, 13) };
    g.add(t); targets.push(t); return t;
  });
  return {
    group: g, targets,
    update(dt, t, hit) {
      if ((hold -= dt) <= 0 && (auto += dt) > 2.2) { auto = 0; active = (active + 1) % tiles.length; }
      tiles.forEach((tile, i) => {
        const u = tile.userData, on = i === active;
        u.z.to = on ? 0.12 : 0.03 + (hovered(hit, tile) ? 0.02 : 0); u.s.to = on ? 1.18 : 0.95;
        tile.position.set(u.base.x * (on ? 0.8 : 1), u.base.y * (on ? 0.8 : 1), u.z.step(dt)); tile.scale.setScalar(u.s.step(dt));
        u.rim.visible = on; u.p.userData.talking = on;
        P.updateAll(u.p, dt, t);
      });
    },
    click(hit) { const a = actOf(hit); if (a?.act === 'tile') { active = a.i; hold = 6; } else active = (active + 1) % tiles.length; },
  };
}

// =====================================================================================================
// Apple Watch apps: rings, heart rate and the Smart Stack rise off the little screen.
// =====================================================================================================
export function watchRings(box) {
  const K = Math.min(box.w, box.h), g = new THREE.Group();
  const holder = new THREE.Group(); holder.position.z = 0.05; g.add(holder);
  const r = P.rings({ r: K * 0.44, tube: K * 0.05 }); holder.add(r);
  const cal = P.bigText('412 CAL', { height: K * 0.16, color: '#fa114f', font: F, weight: 800 }); cal.position.set(0, K * 0.72, 0.06); g.add(cal);
  const min = P.bigText('24 MIN · 10 HRS', { height: K * 0.12, color: '#a6ff00', font: F, weight: 700 }); min.position.set(0, -K * 0.72, 0.06); g.add(min);
  const spin = new Spring(0, 50, 8);
  return {
    group: g, targets: [holder],
    update(dt, t) { P.updateAll(r, dt, t); holder.rotation.z = spin.step(dt); holder.position.z = 0.05 + Math.sin(t * 1.5) * 0.008; },
    click() { spin.to -= Math.PI * 2; },
  };
}
export function watchHeart(box) {
  const K = Math.min(box.w, box.h), g = new THREE.Group();
  const BPMS = [72, 96, 128];
  let b = 0;
  const heart = P.heart(K * 0.7, 0xff2d55, BPMS[0]); heart.position.set(0, K * 0.08, 0.07); g.add(heart);
  const nums = BPMS.map((v) => { const m = P.bigText(`${v} BPM`, { height: K * 0.17, color: '#ff375f', font: F, weight: 800 }); m.position.set(0, K * 0.66, 0.07); m.visible = false; g.add(m); return m; });
  nums[0].visible = true;
  // a scrolling ECG trace under the heart
  const N = 90, pts = new Float32Array(N * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const ecg = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff375f })); ecg.position.set(0, -K * 0.62, 0.05); g.add(ecg);
  const beatAt = (x) => { const p = x % 1; return p < 0.06 ? Math.sin(p / 0.06 * Math.PI) * 0.12 : p > 0.1 && p < 0.14 ? -0.25 : p >= 0.14 && p < 0.2 ? Math.sin((p - 0.14) / 0.06 * Math.PI) * 1 : p > 0.2 && p < 0.24 ? -0.35 : p > 0.4 && p < 0.55 ? Math.sin((p - 0.4) / 0.15 * Math.PI) * 0.22 : 0; };
  return {
    group: g, targets: [heart],
    update(dt, t) {
      P.updateAll(heart, dt, t);
      const rate = BPMS[b] / 60;
      for (let i = 0; i < N; i++) { const x = i / (N - 1); pts[i * 3] = (x - 0.5) * K * 1.3; pts[i * 3 + 1] = beatAt(x * 2.2 - t * rate) * K * 0.16; pts[i * 3 + 2] = 0; }
      geo.attributes.position.needsUpdate = true;
    },
    click() { b = (b + 1) % BPMS.length; heart.userData.bpm = BPMS[b]; nums.forEach((m, i) => (m.visible = i === b)); },
  };
}
export function smartStack(box) {
  const K = Math.min(box.w, box.h), g = new THREE.Group(), targets = [];
  const W = [
    ['Weather', '72° Sunny', 'H:78° L:58°', 'sun', '#ffd60a'],
    ['Timer', '8:42', 'Pasta', 'clock', '#ff9f0a'],
    ['Up Next', 'Design review', '10:00 · Studio B', 'calendar', '#ff453a'],
  ];
  let order = [0, 1, 2];
  const cards = W.map(([a, b, c2, gl, col], i) => {
    const c = gcard(K * 1.2, K * 0.62, (ctx, w, h) => {
      const s = h / 100;
      glyph(ctx, gl, 22 * s, 24 * s, 24 * s, col);
      text(ctx, a.toUpperCase(), 42 * s, 31 * s, { size: 15 * s, weight: 800, font: F, color: col });
      text(ctx, b, 14 * s, 66 * s, { size: 26 * s, weight: 700, font: F });
      text(ctx, c2, 14 * s, 88 * s, { size: 16 * s, weight: 500, font: F, color: 'rgba(255,255,255,0.75)' });
    }, { px: 200, tint: 'rgba(28,30,38,0.96)' });
    c.userData = { ...c.userData, act: 'w', i, y: new Spring(0, 140, 14), z: new Spring(0, 140, 14), s: new Spring(1, 140, 14) };
    g.add(c); targets.push(c); return c;
  });
  const sun = P.sun(K * 0.12); g.add(sun);
  let auto = 0;
  return {
    group: g, targets,
    update(dt, t, hit) {
      if ((auto += dt) > 2) { auto = 0; order.push(order.shift()); }
      cards.forEach((c, i) => {
        const slot = order.indexOf(i), u = c.userData;
        u.y.to = slot * K * 0.24; u.z.to = 0.11 - slot * 0.035 + (hovered(hit, c) ? 0.02 : 0); u.s.to = 1 - slot * 0.08;
        c.position.set(0, u.y.step(dt) - K * 0.1, u.z.step(dt)); c.scale.setScalar(u.s.step(dt));
        c.renderOrder = 10 - slot;
      });
      const wc = cards[0]; sun.position.set(wc.position.x + K * 0.4, wc.position.y + K * 0.18, wc.position.z + 0.04); sun.scale.setScalar(order[0] === 0 ? 1 : 0.6);
      P.updateAll(sun, dt, t);
    },
    click() { order.push(order.shift()); auto = -3; },
  };
}

// =====================================================================================================
// Vision Pro: a volume (a planet you can spin) and a Spatial Persona call.
// =====================================================================================================
export function volumePlanet(box) {
  const K = unit(box), g = new THREE.Group();
  const vol = new THREE.Group(); vol.position.set(0, 0, 0.09); g.add(vol);
  const S = K * 0.85;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S * 1.5, S * 1.1, S * 0.5)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));
  vol.add(edges);
  const tex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); const cols = ['#c99a6b', '#e8d3b0', '#b0794e', '#f1e3c8', '#9c6a44', '#e2c49c', '#c48a5a']; for (let i = 0; i < 18; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(0, i * 256 / 18, 512, 256 / 18 + 1); } x.fillStyle = '#b5523b'; x.beginPath(); x.ellipse(340, 160, 34, 18, 0, 0, Math.PI * 2); x.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const planet = new THREE.Mesh(new THREE.SphereGeometry(S * 0.28, 48, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); vol.add(planet);
  const ring = new THREE.Mesh(new THREE.RingGeometry(S * 0.36, S * 0.52, 80), new THREE.MeshStandardMaterial({ color: 0xe0cfa8, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
  ring.rotation.x = Math.PI / 2 - 0.4; vol.add(ring);
  const moons = [0.6, 0.72].map((r, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(S * 0.035, 16, 12), new THREE.MeshStandardMaterial({ color: 0xdddddd })); m.userData.r = r * S; m.userData.o = i * 2; vol.add(m); return m; });
  const label = gcard(K * 0.9, K * 0.16, (c, w, h) => text(c, 'Saturn · a volume you can spin', w / 2, h * 0.62, { size: h * 0.36, weight: 700, font: F, align: 'center' }), { px: 140 });
  label.position.set(0, -S * 0.72, 0.1); g.add(label);
  const speed = { v: 0.4 };
  return {
    group: g, targets: [vol],
    update(dt, t) {
      speed.v = damp(speed.v, 0.4, 1.2, dt);
      planet.rotation.y += speed.v * dt; ring.rotation.z += speed.v * dt * 0.2;
      moons.forEach((m) => { const a = t * 0.8 + m.userData.o; m.position.set(Math.cos(a) * m.userData.r, Math.sin(a) * m.userData.r * 0.25, Math.sin(a) * m.userData.r * 0.4); });
      vol.rotation.y = Math.sin(t * 0.3) * 0.3;
    },
    click() { speed.v = 6; },
  };
}

// =====================================================================================================
// Apple TV: live sports with a 3D court, and Music.
// =====================================================================================================
export function liveSports(box) {
  const g = new THREE.Group();
  const W = box.w * 0.72, Dp = box.w * 0.38;
  const court = new THREE.Group(); court.position.set(0, -box.h * 0.1, 0.08); court.rotation.x = 0.95; g.add(court);
  const tex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 272; const x = c.getContext('2d'); x.fillStyle = '#c98a4b'; x.fillRect(0, 0, 512, 272); for (let i = 0; i < 24; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'; x.fillRect(i * 22, 0, 22, 272); } x.strokeStyle = '#fff'; x.lineWidth = 4; x.strokeRect(8, 8, 496, 256); x.beginPath(); x.moveTo(256, 8); x.lineTo(256, 264); x.stroke(); x.beginPath(); x.arc(256, 136, 40, 0, Math.PI * 2); x.stroke(); for (const s of [0, 1]) { x.beginPath(); x.arc(s ? 504 : 8, 136, 110, s ? Math.PI / 2 : -Math.PI / 2, s ? Math.PI * 1.5 : Math.PI / 2); x.stroke(); x.fillStyle = s ? 'rgba(10,132,255,0.35)' : 'rgba(255,214,10,0.35)'; x.fillRect(s ? 404 : 8, 96, 100, 80); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.006, Dp), [0, 0, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), 0, 0, 0].map((m) => m || new THREE.MeshStandardMaterial({ color: 0x6b4a2b })));
  court.add(floor);
  const players = [];
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(new THREE.CapsuleGeometry(W * 0.012, W * 0.03, 4, 10), new THREE.MeshStandardMaterial({ color: i < 5 ? 0xffd60a : 0x0a84ff, roughness: 0.5 }));
    p.userData = { o: i * 1.3, a: (i % 5) * 0.12 + 0.1, side: i < 5 ? -1 : 1 }; court.add(p); players.push(p);
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(W * 0.012, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6 })); court.add(ball);
  const score = [98, 94];
  const board = gcard(box.w * 0.46, box.h * 0.17, (c, w, h) => {
    const s = h / 100;
    text(c, 'GSW', w * 0.12, 62 * s, { size: 26 * s, weight: 800, font: F, color: '#ffd60a' });
    text(c, `${score[0]}  –  ${score[1]}`, w / 2, 66 * s, { size: 42 * s, weight: 800, font: F, align: 'center' });
    text(c, 'LAL', w * 0.88, 62 * s, { size: 26 * s, weight: 800, font: F, align: 'right', color: '#64d2ff' });
    text(c, 'Q4 · 2:31 · LIVE', w / 2, 90 * s, { size: 15 * s, weight: 700, font: F, align: 'center', color: '#ff453a' });
  }, { px: 180 });
  board.position.set(0, box.h * 0.36, 0.1); g.add(board);
  let shot = -1, shooter = 0;
  return {
    group: g, targets: [court, board],
    update(dt, t) {
      players.forEach((p) => { const u = p.userData, a = t * 0.9 + u.o; p.position.set(u.side * W * 0.18 + Math.cos(a) * W * u.a, W * 0.03, Math.sin(a * 1.3) * Dp * 0.3); });
      if (shot >= 0) {
        shot += dt / 1.1;
        const from = players[shooter].position, hoopX = W * 0.46 * (players[shooter].userData.side < 0 ? 1 : -1);
        ball.position.set(from.x + (hoopX - from.x) * shot, W * 0.05 + Math.sin(shot * Math.PI) * W * 0.22, from.z * (1 - shot));
        if (shot >= 1) { shot = -1; score[players[shooter].userData.side < 0 ? 0 : 1] += 2 + (Math.random() < 0.4 ? 1 : 0); board.userData.tex.redraw(); }
      } else { const h = players[shooter].position; ball.position.set(h.x + W * 0.02, W * 0.03 + Math.abs(Math.sin(t * 8)) * W * 0.03, h.z); }
      court.rotation.z = Math.sin(t * 0.3) * 0.1;
    },
    click() { if (shot < 0) { shooter = (Math.random() * 10) | 0; shot = 0; } },
  };
}

// =====================================================================================================
// The device → apps map, used by apple.js device entries.
// =====================================================================================================
const app = (name, blurb, build) => ({ name, blurb, build });
export const APPLE_APPS = {
  iphone: [
    app('FaceTime', 'The caller leans out of the screen; the call controls float in front of it in Liquid Glass. Tap accept, mute, flip or end.', (b) => faceTime(b)),
    app('Weather', 'Clouds, sun, rain and snow happen above the phone, with the temperature floating in front. Tap a day to change the forecast.', (b) => weather(b)),
    app('Notifications', 'New notifications stack out of the glass, newest nearest. Tap one to expand it, tap again to clear it.', (b) => notifications(b, 'phone')),
  ],
  lock: [
    app('Notifications', 'Lock Screen notifications cascade out of the glass in depth order. Tap to expand, tap again to clear.', (b) => notifications(b, 'lock')),
    app('Now Playing', 'Album art floats forward over a live 3D waveform. Tap the art for the next track, the button to pause.', (b) => nowPlaying(b)),
    app('Tapback', 'Reactions pop out of message bubbles as little 3D characters. Tap a bubble to react.', (b) => tapback(b)),
  ],
  duo: [
    app('Maps', 'A 3D city block with your route rises out of the unfolded screen. Tap to turn it and pick another route.', (b) => maps(b)),
    app('Spatial Photos', 'A memory split into its depth layers: sky, hills and the people in front. Tap for the next one.', (b) => spatialPhoto(b)),
  ],
  ipad: [
    app('Quick Look', 'A product model sitting on the iPad in true 3D. Tap a finish to change it, tap the model to spin it.', (b) => quickLook(b)),
    app('Freeform', 'Sticky notes on the board at different depths. Tap one to pull it to the front.', (b) => freeform(b)),
    app('Weather', 'The Weather app with its forecast happening above the screen.', (b) => weather(b, { k: 0.8 })),
  ],
  macbook: [
    app('Keynote', 'A 3D column chart builds out of the slide. Tap for the next build.', (b) => keynote(b)),
    app('Group FaceTime', 'Everyone in a tile at their own depth; whoever is speaking comes forward. Tap a tile to spotlight it.', (b) => groupFaceTime(b)),
  ],
  imac: [
    app('Spatial Photos', 'Photos on the big screen with real depth between sky, landscape and subject. Tap for the next memory.', (b) => spatialPhoto(b)),
    app('Notifications', 'Banners slide in at the top right, in front of the desktop. Tap to expand, tap again to clear.', (b) => notifications(b, 'mac')),
    app('Keynote', 'Charts that build in 3D on the 24-inch display.', (b) => keynote(b)),
  ],
  watch: [
    app('Activity', 'The three Activity rings rise off the watch face as solid rings. Tap to spin them.', (b) => watchRings(b)),
    app('Heart Rate', 'A beating 3D heart over a live ECG trace. Tap to change the pace.', (b) => watchHeart(b)),
    app('Smart Stack', 'Widgets stack up off the face, the next one waiting behind. Tap to flip through.', (b) => smartStack(b)),
  ],
  vision: [
    app('Volume', 'A volume holds a real 3D object (Saturn) that you can look around. Tap to spin it.', (b) => volumePlanet(b)),
    app('Spatial Persona', 'A FaceTime call where the other person leans into the room.', (b) => faceTime(b, { name: 'Sam Rivera', label: 'Spatial Persona', look: { skin: 0x8d5a3b, hair: 0x111111, shirt: 0x30d158 } })),
  ],
  tv: [
    app('Live Sports', 'The game on a 3D court in front of the TV, with a floating scoreboard. Tap for a shot.', (b) => liveSports(b)),
    app('Music', 'Album art and the waveform float in front of the living-room screen.', (b) => nowPlaying(b, { k: 1.1 })),
    app('FaceTime', 'FaceTime on the TV: the caller leans into the living room.', (b) => faceTime(b, { name: 'Grandma', label: 'FaceTime on Apple TV', look: { skin: 0xf1c9a5, hair: 0xd8d8d8, shirt: 0xff6b86 } })),
  ],
};
