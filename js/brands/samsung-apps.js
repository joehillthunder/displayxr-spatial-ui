// Samsung: "3D screen" apps for the device carousel. Each device in samsung.js lists a few of these in
// dev.apps; main.js grows the active one out of the device's glass when that device is at the front.
//
// Every app is laid out in "unit space": host() scales a group so the screen's shorter side is 1 unit,
// and squashes z so that about 0.55 units of pop-out stays within ~0.17 scene units in front of the glass.

import * as THREE from 'three';
import * as P from '../pop3d.js';
import { canvasTex, panel, fillRR, strokeRR, text, grad, glyph, FONT, Spring, damp, clamp } from '../kit.js';
import { phone } from '../devices.js';

const F = FONT.samsung;
const BLUE = '#3e82ff';

// ---- shared helpers ------------------------------------------------------------------------------------
function host(box, budget = 0.17) {
  const u = Math.min(box.w, box.h);
  const group = new THREE.Group(), inner = new THREE.Group();
  inner.scale.set(u, u, u * Math.min(1, budget / (0.55 * u)));
  group.add(inner);
  return { group, inner, u, W: box.w / u, H: box.h / u };
}
const actOf = (o) => { for (; o; o = o.parent) if (o.userData && o.userData.act !== undefined) return o; return null; };

// One UI dark card background.
function oneCard(c, w, h, bg = 'rgba(20,22,30,0.94)', rk = 0.22) {
  const r = Math.min(w, h) * rk;
  fillRR(c, 0, 0, w, h, r, bg);
  strokeRR(c, 1.5, 1.5, w - 3, h - 3, r, 'rgba(255,255,255,0.16)', 3);
}
function badge(c, x, y, s, g, cols) {
  c.beginPath(); c.arc(x, y, s / 2, 0, Math.PI * 2); c.fillStyle = grad(c, x, y - s / 2, x, y + s / 2, cols); c.fill();
  glyph(c, g, x, y, s * 0.55, '#fff');
}
// A transparent painted plane (text or icons floating on their own).
function textPlane(w, h, draw, px = 160) {
  const tex = canvasTex(Math.max(8, Math.round(px * w / h)), px, draw);
  const m = panel(w, h, 0, tex, { transparent: true });
  m.userData.tex = tex;
  return m;
}
// A round 3D button (thick disc) with a glyph.
function button(s, color, g, act) {
  const b = P.card3d(s, s, (c, w, h) => {
    c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); c.fillStyle = color; c.fill();
    glyph(c, g, w / 2, h / 2, w * 0.46, '#fff');
  }, { r: s / 2 - 0.001, depth: s * 0.22, color: new THREE.Color(color).multiplyScalar(0.6).getHex(), px: 160 });
  b.userData.act = act;
  return b;
}
// Intro: grows the listed objects in one after another (call from update with the time since enter).
function intro(list, since) { list.forEach((o, i) => o.scale.setScalar(Math.max(0.001, P.stagger(since, i, 0.1, 0.45)))); }

// =====================================================================================================
// 3D Weather (Samsung Weather): the forecast as a little sky in front of the screen.
// =====================================================================================================
const DAYS = [
  { d: 'Today', c: 'sun', hi: 72, lo: 55, txt: 'Sunny' },
  { d: 'Thu', c: 'cloud', hi: 66, lo: 54, txt: 'Partly cloudy' },
  { d: 'Fri', c: 'rain', hi: 61, lo: 52, txt: 'Showers · 80%' },
  { d: 'Sat', c: 'storm', hi: 58, lo: 49, txt: 'Thunderstorms' },
  { d: 'Sun', c: 'snow', hi: 34, lo: 27, txt: 'Snow in Tahoe' },
];
const COND_GLYPH = { sun: 'sun', cloud: 'cloud', rain: 'cloud', storm: 'flash', snow: 'cloud' };

export const weather = (city = 'San Jose') => ({
  name: '3D Weather',
  blurb: 'Samsung Weather as a little sky over the screen: the sun, clouds, rain or snow for each day, with the temperature floating in front. Tap the sky or a day to step through the week.',
  build(box) {
    const { group, inner, W, H } = host(box);
    const S = Math.min(W, 1.15);
    const sky = new THREE.Group(); sky.position.set(0, Math.min(H * 0.17, 0.32), 0); inner.add(sky);
    const sets = {};
    const mk = (k, fill) => { const g = new THREE.Group(); fill(g); g.visible = false; g.userData.sp = new Spring(0, 110, 13); sky.add(g); sets[k] = g; };
    mk('sun', (g) => { const s = P.sun(0.13 * S); s.position.set(0.14 * S, 0.06, 0.32); g.add(s); const c = P.cloud(0.08 * S); c.position.set(-0.08 * S, -0.2, 0.2); g.add(c); });
    mk('cloud', (g) => { const s = P.sun(0.09 * S); s.position.set(0.24 * S, 0.13, 0.1); g.add(s); [[-0.15, 0, 0.34, 0.14], [0.18, -0.07, 0.24, 0.11]].forEach(([x, y, z, c]) => { const m = P.cloud(c * S); m.position.set(x * S, y, z); g.add(m); }); });
    mk('rain', (g) => { const c = P.cloud(0.16 * S, 0xc9d2e3); c.position.set(0, 0.12, 0.3); g.add(c); const r = P.precipitation({ w: 0.5 * S, h: 0.42, d: 0.2, count: 110 }); r.position.set(0, -0.14, 0.3); g.add(r); });
    mk('storm', (g) => { const c = P.cloud(0.17 * S, 0x7d8596); c.position.set(0, 0.14, 0.3); g.add(c); const b = P.bolt(0.3 * S); b.position.set(0.02, -0.1, 0.36); g.add(b); const r = P.precipitation({ w: 0.5 * S, h: 0.42, d: 0.2, count: 80 }); r.position.set(0, -0.14, 0.28); g.add(r); });
    mk('snow', (g) => { const c = P.cloud(0.15 * S); c.position.set(0, 0.14, 0.3); g.add(c); const r = P.precipitation({ w: 0.56 * S, h: 0.48, d: 0.26, count: 90, snow: true }); r.position.set(0, -0.12, 0.3); g.add(r); });
    const temps = DAYS.map((d) => { const m = P.bigText(`${d.hi}°`, { height: 0.24 * S, font: F }); m.position.set(-0.3 * S, -0.06, 0.44); m.visible = false; sky.add(m); return m; });
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.42 * S, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0, 0.3); hit.userData.act = 'sky'; sky.add(hit);

    let day = 0;
    const cw = Math.min(W * 0.94, 1.7), ch = 0.36;
    const strip = P.card3d(cw, ch, (c, w, h) => {
      oneCard(c, w, h);
      text(c, `${city} · ${DAYS[day].txt}`, w * 0.05, h * 0.25, { size: h * 0.15, weight: 700, font: F });
      text(c, `H ${DAYS[day].hi}°  L ${DAYS[day].lo}°`, w * 0.95, h * 0.25, { size: h * 0.13, weight: 600, font: F, align: 'right', color: 'rgba(255,255,255,0.7)' });
      DAYS.forEach((d, i) => {
        const x = w * (0.1 + (i * 0.8) / (DAYS.length - 1));
        if (i === day) fillRR(c, x - w * 0.075, h * 0.36, w * 0.15, h * 0.58, h * 0.14, 'rgba(62,130,255,0.55)');
        text(c, d.d, x, h * 0.52, { size: h * 0.12, weight: 600, align: 'center', font: F, color: 'rgba(255,255,255,0.85)' });
        glyph(c, COND_GLYPH[d.c], x, h * 0.68, h * 0.15, d.c === 'sun' ? '#ffd257' : '#cfe0ff');
        text(c, `${d.hi}°`, x, h * 0.9, { size: h * 0.12, weight: 700, align: 'center', font: F });
      });
    }, { px: 300, depth: 0.03 });
    strip.position.set(0, -Math.min(H * 0.3, 0.52), 0.14); strip.userData.act = 'strip'; inner.add(strip);

    const setDay = (i) => { day = (i + DAYS.length) % DAYS.length; strip.userData.tex.redraw(); };
    let since = 0;
    return {
      group, targets: [hit, strip],
      enter() { since = 0; },
      update(dt, t, h) {
        since += dt;
        intro([sky, strip], since);
        for (const [k, g] of Object.entries(sets)) {
          const sp = g.userData.sp; sp.to = k === DAYS[day].c ? 1 : 0;
          const v = sp.step(dt); g.visible = v > 0.02; g.children.forEach((o) => o.scale.setScalar(Math.max(0.001, v)));
        }
        temps.forEach((m, i) => (m.visible = i === day));
        sky.rotation.y = Math.sin(t * 0.4) * 0.12 + (h && actOf(h.object)?.userData.act === 'sky' ? 0.08 : 0);
        P.updateAll(sky, dt, t);
      },
      click(h) {
        const a = actOf(h?.object)?.userData.act;
        if (a === 'strip' && h.uv && h.object === strip.userData.face) setDay(Math.round(clamp((h.uv.x - 0.1) / (0.8 / (DAYS.length - 1)), 0, DAYS.length - 1)));
        else setDay(day + 1);
      },
    };
  },
});

// =====================================================================================================
// Video call: the caller leans out of the screen; One UI call buttons float in front.
// =====================================================================================================
export const videoCall = ({ who = 'Mina Park', where = 'Seoul', skin = 0xe2b896, hair = 0x1d1714, shirt = 0x3e82ff } = {}) => ({
  name: 'Video call',
  blurb: `${who} calls in 3D: her head and shoulders lean out of the glass instead of sitting flat in a rectangle. Answer or decline, then mute, flip the camera or hang up; tap her to send a reaction.`,
  build(box) {
    const { group, inner, W, H } = host(box, 0.18);
    const S = Math.min(W, 1.05);
    const y0 = Math.min(H * 0.1, 0.22);
    const portal = new THREE.Mesh(new THREE.TorusGeometry(0.42 * S, 0.014, 12, 80), new THREE.MeshStandardMaterial({ color: BLUE, emissive: BLUE, emissiveIntensity: 1.1 }));
    portal.position.set(0, y0, 0.01); inner.add(portal);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42 * S, 64), new THREE.MeshBasicMaterial({ color: 0x0b1530, transparent: true, opacity: 0.85 }));
    disc.position.set(0, y0, 0.004); inner.add(disc);
    const person = P.bust({ s: 0.62 * S, skin, hair, shirt });
    person.userData.act = 'bust';
    const holder = new THREE.Group(); holder.position.set(0, y0 - 0.1 * S, 0); holder.add(person); inner.add(holder);
    const zs = new Spring(-0.6, 60, 11);

    let state = 'incoming', liveSec = 0, muted = false;
    const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const cardW = Math.min(W * 0.92, 1.3);
    const nameCard = P.card3d(cardW, 0.3, (c, w, h) => {
      oneCard(c, w, h);
      badge(c, h * 0.5, h * 0.5, h * 0.62, 'person', ['#ff9a5a', '#f0612a']);
      text(c, who, h * 0.95, h * 0.44, { size: h * 0.24, weight: 700, font: F });
      const sub = state === 'incoming' ? `Incoming video call · ${where}` : state === 'live' ? `${muted ? 'Muted · ' : ''}${mmss(liveSec)} · HD` : 'Call ended · tap to call back';
      text(c, sub, h * 0.95, h * 0.76, { size: h * 0.16, weight: 500, font: F, color: state === 'live' ? '#7fe3a6' : 'rgba(255,255,255,0.7)' });
    }, { px: 220, depth: 0.03 });
    nameCard.position.set(0, y0 + 0.62 * S, 0.24); nameCard.userData.act = 'card'; inner.add(nameCard);

    const bs = 0.26 * S, by = y0 - 0.74 * S;
    const btn = {
      decline: button(bs, '#ff3b30', 'phone', 'decline'), accept: button(bs, '#22c55e', 'phone', 'accept'),
      mute: button(bs, '#3a3f4b', 'mic', 'mute'), flip: button(bs, '#3a3f4b', 'camera', 'flip'), end: button(bs, '#ff3b30', 'phone', 'end'),
    };
    Object.values(btn).forEach((b) => { b.position.set(0, by, 0.3); b.userData.sp = new Spring(0, 160, 15); inner.add(b); });
    const pip = P.card3d(0.28 * S, 0.4 * S, (c, w, h) => {
      fillRR(c, 0, 0, w, h, w * 0.16, grad(c, 0, 0, 0, h, ['#2b3550', '#121826']));
      c.fillStyle = '#d9a37f'; c.beginPath(); c.arc(w / 2, h * 0.42, w * 0.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4fdc9a'; c.beginPath(); c.ellipse(w / 2, h * 0.92, w * 0.38, h * 0.24, 0, Math.PI, 0); c.fill();
      text(c, 'You', w * 0.1, h * 0.12, { size: h * 0.08, weight: 700, font: F });
    }, { px: 200, depth: 0.02 });
    pip.position.set(Math.min(W * 0.4, 0.58), y0 - 0.32 * S, 0.2); inner.add(pip);
    const flying = [];

    const layout = () => {
      const shown = state === 'incoming' ? ['decline', 'accept'] : state === 'live' ? ['mute', 'flip', 'end'] : [];
      Object.entries(btn).forEach(([k, b]) => {
        const i = shown.indexOf(k);
        b.userData.sp.to = i >= 0 ? 1 : 0;
        if (i >= 0) b.position.x = (i - (shown.length - 1) / 2) * bs * 1.6;
      });
      nameCard.userData.tex.redraw();
    };
    const setState = (s) => { state = s; if (s === 'live') liveSec = 0; person.userData.talking = s === 'live' && !muted; layout(); };
    layout();
    let since = 0, tick = 0;
    return {
      group, targets: [person, nameCard, ...Object.values(btn)],
      enter() { since = 0; setState('incoming'); zs.v = -0.6; },
      update(dt, t, h) {
        since += dt; if (state === 'live') liveSec += dt;
        if (state === 'incoming' && since > 2.4) setState('live');   // auto-answers during the tour
        zs.to = state === 'incoming' ? -0.04 + Math.sin(t * 3) * 0.03 : state === 'live' ? 0.24 : -0.75;
        holder.position.z = zs.step(dt); holder.visible = holder.position.z > -0.7;
        portal.scale.setScalar(state === 'incoming' ? 1 + Math.sin(t * 7) * 0.05 : 1);
        portal.material.emissiveIntensity = state === 'ended' ? 0.25 : 1.1;
        Object.values(btn).forEach((b) => {
          const v = b.userData.sp.step(dt); b.visible = v > 0.02; b.scale.setScalar(Math.max(0.001, v));
          b.position.z = 0.3 + (h && actOf(h.object) === b ? 0.06 : 0);
        });
        pip.visible = state === 'live';
        if (state === 'live' && (tick -= dt) <= 0) { tick = 1; nameCard.userData.tex.redraw(); }
        for (let i = flying.length - 1; i >= 0; i--) {
          const f = flying[i]; f.age += dt;
          f.m.position.set(f.x + Math.sin(f.age * 3) * 0.04, y0 + 0.2 + f.age * 0.32, 0.3 + f.age * 0.12);
          f.m.scale.setScalar(Math.max(0.001, Math.min(1, f.age * 4) * (1 - Math.max(0, f.age - 1.4) / 0.6)));
          if (f.age > 2) { inner.remove(f.m); flying.splice(i, 1); }
        }
        P.updateAll(inner, dt, t);
      },
      click(h) {
        const a = actOf(h?.object)?.userData.act;
        if (state === 'ended') { setState('incoming'); since = 0; return; }
        if (a === 'accept') setState('live');
        else if (a === 'decline' || a === 'end') setState('ended');
        else if (a === 'mute') { muted = !muted; person.userData.talking = !muted; nameCard.userData.tex.redraw(); }
        else if (a === 'flip') pip.rotation.y += Math.PI * 2;
        else if (a === 'bust' && state === 'live') {
          const moods = [['love', 0xffcc33], ['smile', 0xffd23f], ['wow', 0xffc12e]], [mood, col] = moods[flying.length % 3];
          const m = P.emojiBall(0.09 * S, col, mood); inner.add(m);
          flying.push({ m, age: 0, x: (Math.random() - 0.5) * 0.4 * S });
        }
      },
    };
  },
});

// =====================================================================================================
// Now Bar and Now Brief: live activities stack out of the screen as a deck of cards.
// =====================================================================================================
const NOW = [
  { g: 'music', title: 'Midnight City', sub: 'M83 · 2:41 / 4:03', more: ['Up next: Wait', 'Playing on Galaxy Buds'], cols: ['#ff6f91', '#7a5cff'] },
  { g: 'car', title: 'Ride arriving · 3 min', sub: 'Gray EV · 7KX 214', more: ['Driver: Jae · 4.9 ★', 'Meet at the north entrance'], cols: ['#3e82ff', '#28c7ff'] },
  { g: 'clock', title: 'Timer · 08:12', sub: 'Pasta', more: ['Next: sauce, 5 min', 'Tap to add a minute'], cols: ['#ffb547', '#f6631a'] },
  { g: 'heart', title: 'Outdoor run', sub: '3.24 km · 138 bpm', more: ['Pace 5\'41"/km', 'Zone 3 · keep going'], cols: ['#4fe0a0', '#12a877'] },
  { g: 'sparkle', title: 'Now Brief', sub: '3 meetings · rain at 4 PM', more: ['Package arrives by 6 PM', 'Leave at 5:20 to beat traffic'], cols: ['#a68bff', '#3e82ff'] },
];
export const nowStack = (items = NOW) => ({
  name: 'Now Bar stack',
  blurb: 'The Now Bar and Now Brief come out of the glass as a deck: the live activity you need is nearest, the rest wait behind it. Tap a card to open it, tap it again to dismiss it.',
  build(box) {
    const { group, inner, W, H } = host(box);
    const cw = Math.min(W * 0.92, 1.25), ch = 0.27;
    let expanded = -1, order = items.map((_, i) => i);
    const cards = items.map((it, i) => {
      const c3 = P.card3d(cw, ch, (c, w, h) => {
        oneCard(c, w, h, 'rgba(18,20,28,0.95)', 0.5);
        badge(c, h * 0.5, h * 0.5, h * 0.66, it.g, it.cols);
        text(c, it.title, h * 0.98, h * 0.44, { size: h * 0.22, weight: 700, font: F });
        text(c, it.sub, h * 0.98, h * 0.74, { size: h * 0.16, weight: 500, font: F, color: 'rgba(255,255,255,0.72)' });
      }, { r: ch / 2 - 0.001, depth: 0.04, px: 200 });
      c3.userData.act = 'card'; c3.userData.i = i;
      const sp = { x: new Spring(0, 140, 16), y: new Spring(0, 140, 16), z: new Spring(0, 140, 16), s: new Spring(1, 140, 16) };
      c3.userData.sp = sp;
      // detail panel that unfolds under an opened card
      const det = textPlane(cw * 0.92, ch * 0.9, (c, w, h) => {
        fillRR(c, 0, 0, w, h, h * 0.3, 'rgba(255,255,255,0.1)');
        it.more.forEach((m, k) => text(c, '• ' + m, w * 0.05, h * (0.4 + k * 0.36), { size: h * 0.22, weight: 600, font: F }));
      }, 140);
      det.position.set(0, -ch * 0.95, -0.01); det.visible = false; c3.add(det); c3.userData.det = det;
      inner.add(c3);
      return c3;
    });
    const base = -Math.min(H * 0.36, 0.62);
    let since = 0, refill = 0;
    const flyAway = [];
    return {
      group, targets: cards,
      enter() { since = 0; expanded = -1; order = items.map((_, i) => i); flyAway.length = 0; cards.forEach((c) => { c.visible = true; c.userData.gone = false; }); },
      update(dt, t, h) {
        since += dt;
        const hov = actOf(h?.object);
        order.forEach((i, slot) => {
          const c = cards[i], sp = c.userData.sp, open = i === expanded;
          const lift = hov === c ? 0.05 : 0;
          sp.x.to = 0;
          sp.y.to = open ? Math.min(H * 0.12, 0.25) : base + slot * 0.2 + (expanded >= 0 ? -0.08 : 0);
          sp.z.to = open ? 0.5 : 0.36 - slot * 0.075 + lift;
          sp.s.to = open ? 1.18 : 1 - slot * 0.04;
          c.userData.det.visible = open;
        });
        cards.forEach((c, i) => {
          const sp = c.userData.sp;
          if (c.userData.gone) { sp.x.to = 1.4; sp.z.to = 0.55; sp.s.to = 0.2; }
          const a = P.stagger(since, order.indexOf(i) < 0 ? 0 : order.length - 1 - order.indexOf(i), 0.1, 0.5);
          c.position.set(sp.x.step(dt), sp.y.step(dt), sp.z.step(dt) * a);
          c.scale.setScalar(Math.max(0.001, sp.s.step(dt) * a));
          if (c.userData.gone && c.position.x > 1.2) c.visible = false;
        });
        if (!order.length && (refill += dt) > 1.2) { refill = 0; this.enter(); }
      },
      click(h) {
        const c = actOf(h?.object);
        if (!c || c.userData.act !== 'card') { expanded = -1; return; }
        const i = c.userData.i;
        if (expanded === i) { c.userData.gone = true; order = order.filter((k) => k !== i); expanded = -1; }
        else expanded = i;
      },
    };
  },
});

// =====================================================================================================
// Galaxy Watch: Samsung Health pops out of the round face.
// =====================================================================================================
export const watchHealth = () => ({
  name: 'Samsung Health',
  blurb: 'The watch face grows a third dimension: activity rings as solid hoops, the heart beating in front of the glass at your live rate, and tiles for steps, sleep and Energy Score floating around the bezel. Tap the heart to measure, tap a tile to bring it forward.',
  build(box) {
    const { group, inner } = host(box, 0.16);
    const ringsG = P.rings({ r: 0.4, tube: 0.04, colors: [0x3fd88a, 0x3e82ff, 0xff7a45], fracs: [0.78, 0.62, 0.9] });
    ringsG.position.z = 0.06; inner.add(ringsG);
    const hrt = P.heart(0.3, 0xff3b5c, 74); hrt.position.set(0, 0.02, 0.32); hrt.userData.act = 'heart'; inner.add(hrt);
    let bpm = 74, measuring = 0, shown = 74;
    const bpmT = textPlane(0.6, 0.2, (c, w, h) => {
      text(c, `${Math.round(shown)}`, w * 0.46, h * 0.82, { size: h * 0.86, weight: 800, font: F, align: 'right' });
      text(c, measuring > 0 ? 'measuring' : 'bpm', w * 0.5, h * 0.82, { size: h * 0.32, weight: 600, font: F, color: '#ff8aa0' });
    });
    bpmT.position.set(0.02, 0.4, 0.36); inner.add(bpmT);
    const TILES = [
      { g: 'person', t: '8,412', s: 'steps', cols: ['#4fdc9a', '#12a877'] },
      { g: 'moon', t: '7h 32m', s: 'sleep · 86', cols: ['#8c7bff', '#4b3fd6'] },
      { g: 'flash', t: '84', s: 'Energy Score', cols: ['#ffb547', '#f6631a'] },
    ];
    let focus = -1;
    const tiles = TILES.map((d, i) => {
      const m = P.card3d(0.52, 0.3, (c, w, h) => {
        oneCard(c, w, h, 'rgba(18,20,28,0.95)', 0.3);
        badge(c, h * 0.36, h * 0.5, h * 0.48, d.g, d.cols);
        text(c, d.t, h * 0.7, h * 0.5, { size: h * 0.23, weight: 800, font: F });
        text(c, d.s, h * 0.72, h * 0.78, { size: h * 0.15, weight: 600, font: F, color: 'rgba(255,255,255,0.7)' });
      }, { px: 160, depth: 0.03 });
      const a = [Math.PI * 0.82, Math.PI * 0.18, -Math.PI * 0.5][i];
      m.userData = { ...m.userData, act: 'tile', i, home: new THREE.Vector3(Math.cos(a) * 0.72, Math.sin(a) * 0.62, 0.2), ry: -Math.cos(a) * 0.4 };
      m.userData.p = { x: new Spring(0), y: new Spring(0), z: new Spring(0), s: new Spring(0.2) };
      inner.add(m);
      return m;
    });
    let since = 0;
    return {
      group, targets: [hrt, ...tiles],
      enter() { since = 0; },
      update(dt, t, h) {
        since += dt;
        intro([ringsG, hrt, bpmT], since);
        const hov = actOf(h?.object);
        tiles.forEach((m, i) => {
          const p = m.userData.p, f = focus === i, home = m.userData.home;
          p.x.to = f ? 0 : home.x; p.y.to = f ? -0.05 : home.y; p.z.to = f ? 0.55 : home.z + (hov === m ? 0.06 : 0) + Math.sin(t * 1.3 + i) * 0.02;
          p.s.to = f ? 1.5 : 1;
          const a = P.stagger(since, i + 2, 0.12, 0.5);
          m.position.set(p.x.step(dt), p.y.step(dt), p.z.step(dt)); m.scale.setScalar(Math.max(0.001, p.s.step(dt) * a));
          m.rotation.y = f ? 0 : m.userData.ry;
        });
        if (measuring > 0) {
          measuring -= dt; shown = 60 + Math.random() * 40;
          if (measuring <= 0) { bpm = 68 + Math.round(Math.random() * 18); shown = bpm; hrt.userData.bpm = bpm; }
          bpmT.userData.tex.redraw();
        }
        P.updateAll(inner, dt, t);
      },
      click(h) {
        const a = actOf(h?.object);
        if (a?.userData.act === 'heart') { measuring = 1.8; focus = -1; }
        else if (a?.userData.act === 'tile') focus = focus === a.userData.i ? -1 : a.userData.i;
        else focus = -1;
      },
    };
  },
});

// Sleep: last night's stages as a 3D hypnogram under a glowing moon.
export const watchSleep = () => ({
  name: 'Sleep score',
  blurb: "Last night's sleep as a little landscape: each stage is a block at its own depth (deep sleep furthest back), under a glowing moon and stars. Tap to replay the night.",
  build(box) {
    const { group, inner } = host(box, 0.16);
    const STAGES = [3, 1, 1, 0, 0, 1, 2, 1, 0, 0, 1, 2, 2, 1, 1, 2, 3, 1, 2, 3];
    const COL = [0x4b3fd6, 0x7a8cff, 0x3fd8c8, 0xffb547];   // deep, light, REM, awake
    const blocks = STAGES.map((s, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.08 + s * 0.1, 0.08), new THREE.MeshStandardMaterial({ color: COL[s], emissive: COL[s], emissiveIntensity: 0.35, roughness: 0.4 }));
      m.position.set(-0.6 + i * 0.063, -0.22 + (0.08 + s * 0.1) / 2, 0.06 + s * 0.08);
      inner.add(m); return m;
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 20), new THREE.MeshStandardMaterial({ color: 0xf1eeff, emissive: 0xbdb6ff, emissiveIntensity: 0.45, roughness: 0.9 }));
    moon.position.set(0.32, 0.36, 0.3);
    const halo = P.glow(0xbdb6ff, 0.6, 0.35); halo.position.set(0.32, 0.36, 0.25); inner.add(moon, halo);
    const n = 60, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 1.4, Math.random() * 0.6, Math.random() * 0.3], i * 3);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.012, transparent: true, opacity: 0.85 }));
    inner.add(stars);
    const score = textPlane(0.9, 0.24, (c, w, h) => {
      text(c, '86', w * 0.04, h * 0.85, { size: h * 0.95, weight: 800, font: F });
      text(c, 'Sleep score · 7h 32m', w * 0.38, h * 0.5, { size: h * 0.24, weight: 700, font: F });
      text(c, 'Deep 1h 18m · REM 1h 41m', w * 0.38, h * 0.82, { size: h * 0.2, weight: 500, font: F, color: 'rgba(255,255,255,0.7)' });
    });
    score.position.set(-0.12, 0.2, 0.34); inner.add(score);
    const hit = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.z = 0.3; hit.userData.act = 'replay'; inner.add(hit);
    let since = 0;
    return {
      group, targets: [hit],
      enter() { since = 0; },
      update(dt, t) {
        since += dt;
        blocks.forEach((m, i) => { const a = P.stagger(since, i, 0.05, 0.35); m.scale.set(1, Math.max(0.001, a), 1); });
        moon.rotation.y = t * 0.2; moon.position.y = 0.36 + Math.sin(t * 0.8) * 0.02;
        stars.material.opacity = 0.6 + 0.3 * Math.sin(t * 2);
        score.scale.setScalar(Math.max(0.001, P.stagger(since, 3, 0.2, 0.5)));
      },
      click() { since = 0; },
    };
  },
});

// =====================================================================================================
// Maps: the route as a little 3D city on the unfolded screen.
// =====================================================================================================
export const route3d = () => ({
  name: '3D route',
  blurb: 'Navigation on the unfolded screen as a tilted 3D city: real building heights, the route glowing between them and the destination pin bobbing above. Tap to try another route.',
  build(box) {
    const { group, inner, W, H } = host(box);
    const S = Math.min(W, 1.4);
    const holder = new THREE.Group(); holder.position.set(0, -0.08, 0.22); holder.rotation.x = 0.95; inner.add(holder);
    let seed = 7, c = P.city({ w: 1.25 * S, d: 0.8 * S, seed }); c.scale.setScalar(1); holder.add(c);
    const ROUTES = [['12 min', '3.4 km · via Lawrence Expy'], ['15 min', '4.1 km · via El Camino Real'], ['9 min', '2.6 km · via 3rd St, light traffic']];
    let r = 0;
    const eta = P.card3d(Math.min(W * 0.9, 1.1), 0.28, (cx, w, h) => {
      oneCard(cx, w, h, 'rgba(18,20,28,0.95)', 0.3);
      badge(cx, h * 0.5, h * 0.5, h * 0.6, 'car', ['#3e82ff', '#28c7ff']);
      text(cx, ROUTES[r][0], h * 0.95, h * 0.5, { size: h * 0.3, weight: 800, font: F, color: '#7fe3a6' });
      text(cx, ROUTES[r][1], h * 0.95, h * 0.8, { size: h * 0.15, weight: 600, font: F, color: 'rgba(255,255,255,0.75)' });
    }, { px: 200, depth: 0.03 });
    eta.position.set(0, Math.min(H * 0.38, 0.42), 0.4); eta.userData.act = 'eta'; inner.add(eta);
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(1.3 * S, 0.9 * S), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.act = 'city'; holder.add(hit); hit.rotation.x = -Math.PI / 2; hit.position.y = 0.05;
    let since = 0, spin = new Spring(0, 40, 9);
    return {
      group, targets: [hit, eta],
      enter() { since = 0; },
      update(dt, t) {
        since += dt;
        intro([holder, eta], since);
        holder.rotation.z = spin.step(dt) + Math.sin(t * 0.3) * 0.06;
        P.updateAll(holder, dt, t);
      },
      click() {
        r = (r + 1) % ROUTES.length; eta.userData.tex.redraw();
        holder.remove(c); seed += 11; c = P.city({ w: 1.25 * S, d: 0.8 * S, seed }); holder.add(c);
        spin.to += Math.PI / 2;
      },
    };
  },
});

// =====================================================================================================
// Gallery: a photo whose layers (sky, land, subject) separate in depth.
// =====================================================================================================
const PHOTOS = [
  { cap: 'Jeju · sunset', sky: ['#ffb36b', '#7a4cff'], sun: '#fff1c4', land: '#2a1f4a', subject: 'person' },
  { cap: 'Banff · lake', sky: ['#9ad7ff', '#2a7bd8'], sun: '#ffffff', land: '#1d5c3a', subject: 'tree' },
  { cap: 'Seoul · night', sky: ['#3a1c5c', '#0b0f2a'], sun: '#ffe6a8', land: '#121a33', subject: 'skyline' },
];
export const depthGallery = () => ({
  name: 'Gallery in depth',
  blurb: 'Gallery turns photos into layered 3D: Galaxy AI separates the sky, the land and the subject, so the picture opens up in depth behind and in front of the glass. Tap for the next photo.',
  build(box) {
    const { group, inner, W, H } = host(box);
    const pw = Math.min(W * 0.9, 1.5), ph = Math.min(pw * 0.66, H * 0.8);
    let k = 0;
    const draw = (c, w, h, layer) => {
      const p = PHOTOS[k];
      c.clearRect(0, 0, w, h);
      if (layer === 0) {
        c.fillStyle = grad(c, 0, 0, 0, h, p.sky); c.fillRect(0, 0, w, h);
        c.fillStyle = p.sun; c.beginPath(); c.arc(w * 0.68, h * 0.36, h * 0.1, 0, Math.PI * 2); c.fill();
      } else if (layer === 1) {
        c.fillStyle = p.land; c.beginPath(); c.moveTo(0, h);
        for (let x = 0; x <= w; x += w / 12) c.lineTo(x, h * (0.6 + 0.14 * Math.sin(x / w * 7 + k)));
        c.lineTo(w, h); c.fill();
      } else {
        c.fillStyle = '#0a0a12';
        if (p.subject === 'person') { c.beginPath(); c.arc(w * 0.3, h * 0.5, h * 0.07, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(w * 0.3, h * 0.82, h * 0.13, h * 0.24, 0, Math.PI, 0); c.fill(); c.fillRect(w * 0.3 - h * 0.13, h * 0.8, h * 0.26, h * 0.2); }
        else if (p.subject === 'tree') { c.fillRect(w * 0.24, h * 0.55, w * 0.02, h * 0.45); for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(w * 0.25, h * (0.25 + i * 0.07)); c.lineTo(w * (0.17 - i * 0.012), h * (0.42 + i * 0.08)); c.lineTo(w * (0.33 + i * 0.012), h * (0.42 + i * 0.08)); c.fill(); } }
        else { [[0.08, 0.5], [0.16, 0.35], [0.24, 0.55], [0.3, 0.25], [0.38, 0.45], [0.46, 0.6]].forEach(([x, top]) => c.fillRect(w * x, h * top, w * 0.07, h * (1 - top))); }
      }
    };
    const photo = P.depthPhoto({ w: pw, h: ph, gap: 0.16, draw });
    photo.position.set(0, 0.04, 0.06); photo.userData.act = 'photo'; inner.add(photo);
    const cap = P.card3d(Math.min(pw * 0.6, 0.8), 0.18, (c, w, h) => {
      oneCard(c, w, h, 'rgba(18,20,28,0.92)', 0.5);
      glyph(c, 'sparkle', h * 0.5, h * 0.5, h * 0.45, '#a68bff');
      text(c, PHOTOS[k].cap, h * 0.95, h * 0.64, { size: h * 0.36, weight: 700, font: F });
    }, { r: 0.089, px: 140, depth: 0.025 });
    cap.position.set(0, -ph / 2 - 0.02, 0.42); inner.add(cap);
    let since = 0;
    return {
      group, targets: [photo],
      enter() { since = 0; },
      update(dt, t, h) {
        since += dt; intro([photo, cap], since);
        photo.rotation.y = Math.sin(t * 0.45) * 0.18 + (h ? 0.05 : 0);
        photo.rotation.x = Math.sin(t * 0.3) * 0.06;
        P.updateAll(photo, dt, t);
      },
      click() {
        k = (k + 1) % PHOTOS.length;
        photo.traverse((o) => o.material?.map?.redraw?.());
        cap.userData.tex.redraw(); since = 0.2;
      },
    };
  },
});

// =====================================================================================================
// Z Flip: FlexWindow-style widgets as little cubes that pop out and flip.
// =====================================================================================================
export const flexWidgets = () => ({
  name: 'FlexWindow widgets',
  blurb: "The Flip's widgets become small 3D tiles that stand out of the screen at different depths: weather, music, steps and a timer. Tap one to flip it and update it.",
  build(box) {
    const { group, inner, W, H } = host(box);
    const s = Math.min(W * 0.44, 0.5);
    const state = { w: 0, m: 0, steps: 6240, timer: false };
    const WX = [['64°', 'Cloudy', 'cloud', ['#62a8ff', '#2f6cf5']], ['72°', 'Sunny', 'sun', ['#ffd257', '#f39b12']], ['58°', 'Rain', 'cloud', ['#7d8bb0', '#3c4a70']]];
    const SONGS = [['Midnight City', 'M83'], ['Electric Feel', 'MGMT'], ['Sunflower', 'Post Malone']];
    const W4 = [
      (c, w, h) => { const d = WX[state.w]; fillRR(c, 0, 0, w, h, w * 0.2, grad(c, 0, 0, 0, h, d[3])); glyph(c, d[2], w * 0.3, h * 0.32, w * 0.3, '#fff'); text(c, d[0], w * 0.08, h * 0.8, { size: h * 0.3, weight: 800, font: F }); text(c, d[1], w * 0.92, h * 0.8, { size: h * 0.12, weight: 600, font: F, align: 'right' }); },
      (c, w, h) => { const d = SONGS[state.m]; fillRR(c, 0, 0, w, h, w * 0.2, grad(c, 0, 0, w, h, ['#ff6f91', '#7a5cff'])); glyph(c, 'music', w * 0.28, h * 0.3, w * 0.26, '#fff'); text(c, d[0], w * 0.08, h * 0.68, { size: h * 0.13, weight: 800, font: F }); text(c, d[1], w * 0.08, h * 0.85, { size: h * 0.11, weight: 500, font: F }); },
      (c, w, h) => { fillRR(c, 0, 0, w, h, w * 0.2, grad(c, 0, 0, 0, h, ['#4fe0a0', '#12a877'])); glyph(c, 'person', w * 0.26, h * 0.3, w * 0.26, '#fff'); text(c, state.steps.toLocaleString(), w * 0.08, h * 0.72, { size: h * 0.2, weight: 800, font: F }); text(c, 'steps', w * 0.08, h * 0.88, { size: h * 0.11, weight: 600, font: F }); },
      (c, w, h) => { fillRR(c, 0, 0, w, h, w * 0.2, grad(c, 0, 0, 0, h, state.timer ? ['#ffb547', '#f6631a'] : ['#3a3f4b', '#1d2028'])); glyph(c, state.timer ? 'pause' : 'play', w * 0.26, h * 0.3, w * 0.22, '#fff'); text(c, state.timer ? 'Running' : '05:00', w * 0.08, h * 0.74, { size: h * 0.2, weight: 800, font: F }); text(c, 'Timer', w * 0.08, h * 0.9, { size: h * 0.11, weight: 600, font: F }); },
    ];
    const cubes = W4.map((draw, i) => {
      const m = P.card3d(s, s, draw, { r: s * 0.2, depth: s * 0.35, px: 220, color: 0x22252e });
      m.userData = { ...m.userData, act: 'w', i, rot: new Spring(0, 60, 10), z: 0.16 + (i % 3) * 0.1 };
      m.position.set((i % 2 ? 1 : -1) * s * 0.58, (i < 2 ? 1 : -1) * s * 0.58 + Math.min(H * 0.05, 0.1), m.userData.z);
      inner.add(m); return m;
    });
    let since = 0, stepTick = 0;
    return {
      group, targets: cubes,
      enter() { since = 0; },
      update(dt, t, h) {
        since += dt;
        const hov = actOf(h?.object);
        cubes.forEach((m, i) => {
          const a = P.stagger(since, i, 0.12, 0.5);
          m.scale.setScalar(Math.max(0.001, a));
          m.rotation.y = m.userData.rot.step(dt) + Math.sin(t * 0.8 + i) * 0.12;
          m.position.z = m.userData.z + (hov === m ? 0.08 : 0) + Math.sin(t * 1.4 + i * 1.7) * 0.015;
        });
        if ((stepTick += dt) > 1.5) { stepTick = 0; state.steps += 3 + Math.floor(Math.random() * 6); cubes[2].userData.tex.redraw(); }
      },
      click(h) {
        const m = actOf(h?.object); if (!m || m.userData.act !== 'w') return;
        const i = m.userData.i;
        if (i === 0) state.w = (state.w + 1) % WX.length; else if (i === 1) state.m = (state.m + 1) % SONGS.length; else if (i === 2) state.steps += 100; else state.timer = !state.timer;
        m.userData.rot.to += Math.PI * 2; m.userData.tex.redraw();
      },
    };
  },
});

// Messages with 3D reactions: tap an emoji and it flies onto the last message.
export const reactions = () => ({
  name: '3D reactions',
  blurb: 'Messages with reactions that are real objects: tap an emoji in the tray and it bounces out of the screen onto the last message.',
  build(box) {
    const { group, inner, W, H } = host(box);
    const bw = Math.min(W * 0.8, 1.05);
    const MSG = [['Are we still on for Jeju?', false], ['Yes!! Booked the flights', true], ['Send me the photos after', false]];
    const bubbles = MSG.map(([s, me], i) => {
      const b = P.card3d(bw, 0.2, (c, w, h) => { fillRR(c, 0, 0, w, h, h * 0.45, me ? BLUE : 'rgba(58,62,74,0.97)'); text(c, s, w * 0.06, h * 0.64, { size: h * 0.32, weight: 600, font: F }); }, { r: 0.09, px: 120, depth: 0.025, color: me ? 0x1f4fb8 : 0x2a2d36 });
      b.position.set(me ? W * 0.08 : -W * 0.08, Math.min(H * 0.32, 0.55) - i * 0.27, 0.1 + i * 0.03); inner.add(b); return b;
    });
    const tray = [['love', 0xffcc33], ['smile', 0xffd23f], ['wow', 0xffc12e]].map(([mood, col], i) => {
      const e = P.emojiBall(0.09, col, mood); e.userData.act = 'emoji'; e.userData.mood = mood; e.userData.col = col;
      e.position.set((i - 1) * 0.28, -Math.min(H * 0.32, 0.55), 0.36); inner.add(e); return e;
    });
    const flying = [], stuck = [];
    let since = 0, auto = 0;
    const send = (e) => {
      const m = P.emojiBall(0.09, e.userData.col, e.userData.mood); inner.add(m);
      flying.push({ m, age: 0, from: e.position.clone(), to: bubbles[2].position.clone().add(new THREE.Vector3(bw * 0.45 - stuck.length * 0.12, -0.08, 0.06)) });
    };
    return {
      group, targets: [...tray],
      enter() { since = 0; auto = 0; stuck.forEach((m) => inner.remove(m)); stuck.length = 0; },
      update(dt, t, h) {
        since += dt; intro([...bubbles, ...tray], since);
        if ((auto += dt) > 1.6 && stuck.length < 2 && !flying.length) { auto = 0; send(tray[stuck.length % 3]); }
        for (let i = flying.length - 1; i >= 0; i--) {
          const f = flying[i]; f.age += dt; const k = Math.min(1, f.age / 0.8);
          f.m.position.lerpVectors(f.from, f.to, k); f.m.position.z += Math.sin(k * Math.PI) * 0.35;
          f.m.scale.setScalar(1 - 0.35 * k);
          if (k >= 1) { flying.splice(i, 1); stuck.push(f.m); if (stuck.length > 5) inner.remove(stuck.shift()); }
        }
        tray.forEach((e) => (e.position.z = 0.36 + (h && actOf(h.object) === e ? 0.08 : 0)));
        P.updateAll(inner, dt, t);
      },
      click(h) { const e = actOf(h?.object); if (e?.userData.act === 'emoji') send(e); },
    };
  },
});

// =====================================================================================================
// Tab S11: Samsung Notes 3D sketch: S Pen strokes that stand up off the page.
// =====================================================================================================
function sketchPaths(S) {
  const v = (x, y, z = 0) => new THREE.Vector3(x * S, y * S, z * S);
  const poly = (pts) => { const p = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) p.add(new THREE.LineCurve3(pts[i - 1], pts[i])); return p; };
  const house = poly([v(-0.35, -0.3), v(0.35, -0.3), v(0.35, 0.1), v(0, 0.38), v(-0.35, 0.1), v(-0.35, -0.3), v(-0.35, -0.3, 0.3), v(-0.35, 0.1, 0.3), v(0, 0.38, 0.3), v(0.35, 0.1, 0.3), v(0.35, -0.3, 0.3), v(0.35, -0.3), v(0.35, 0.1), v(0.35, 0.1, 0.3), v(0, 0.38, 0.3), v(0, 0.38)]);
  const heartPts = []; for (let i = 0; i <= 80; i++) { const a = (i / 80) * Math.PI * 2; heartPts.push(v(0.022 * 16 * Math.sin(a) ** 3, 0.022 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)), 0.12 + 0.12 * Math.sin(a * 2))); }
  const heart = new THREE.CatmullRomCurve3(heartPts, true);
  const spiralPts = []; for (let i = 0; i <= 120; i++) { const a = i * 0.16; spiralPts.push(v(Math.cos(a) * (0.05 + i * 0.0028), Math.sin(a) * (0.05 + i * 0.0028), i * 0.0035)); }
  const spiral = new THREE.CatmullRomCurve3(spiralPts);
  return [['3D house', house, 0x3e82ff], ['Heart', heart, 0xff4f7a], ['Spiral', spiral, 0x2ec7a8]];
}
export const notesSketch = () => ({
  name: 'Notes · 3D sketch',
  blurb: 'Samsung Notes with depth: S Pen strokes stand up off the page, so a quick sketch becomes a wireframe you can look around. Tap for the next sketch.',
  build(box) {
    const { group, inner, W, H } = host(box);
    const S = Math.min(W, H) * 0.95;
    const page = P.card3d(Math.min(W * 0.6, 1.0), Math.min(H * 0.85, 0.9), (c, w, h) => {
      fillRR(c, 0, 0, w, h, w * 0.05, '#fbf8ef');
      c.strokeStyle = 'rgba(62,130,255,0.18)'; c.lineWidth = 2; for (let y = h * 0.12; y < h; y += h * 0.07) { c.beginPath(); c.moveTo(w * 0.05, y); c.lineTo(w * 0.95, y); c.stroke(); }
      text(c, 'Samsung Notes', w * 0.06, h * 0.07, { size: h * 0.045, weight: 700, font: F, color: '#f68a14' });
    }, { px: 360, depth: 0.02, color: 0xe7e2d6 });
    page.position.z = 0.02; inner.add(page);
    const paths = sketchPaths(S);
    let k = 0, prog = 0, tube = null;
    const label = textPlane(0.5, 0.1, (c, w, h) => text(c, paths[k][0], w / 2, h * 0.75, { size: h * 0.7, weight: 700, font: F, color: '#1a1c22', align: 'center' }), 100);
    label.position.set(0, -Math.min(H * 0.85, 0.9) / 2 + 0.07, 0.04); inner.add(label);
    const pen = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 16), new THREE.MeshStandardMaterial({ color: 0x2a2d35, metalness: 0.6, roughness: 0.3 }));
    barrel.position.y = 0.19; pen.add(barrel);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0xdddddd })); tip.rotation.x = Math.PI; tip.position.y = 0.02; pen.add(tip);
    pen.rotation.z = -0.5; pen.rotation.x = 0.4; inner.add(pen);
    const art = new THREE.Group(); art.position.z = 0.08; inner.add(art);
    const make = () => {
      if (tube) { art.remove(tube); tube.geometry.dispose(); }
      const [, path, col] = paths[k];
      tube = new THREE.Mesh(new THREE.TubeGeometry(path, 240, 0.014, 8, false), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.35 }));
      art.add(tube); prog = 0; label.userData.tex.redraw();
    };
    make();
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ visible: false })); hit.position.z = 0.2; hit.userData.act = 'next'; inner.add(hit);
    const _p = new THREE.Vector3();
    return {
      group, targets: [hit, page],
      enter() { prog = 0; },
      update(dt, t) {
        prog = Math.min(1, prog + dt * 0.4);
        const total = tube.geometry.index.count;
        tube.geometry.setDrawRange(0, Math.floor((total * prog) / 6) * 6);
        paths[k][1].getPointAt(Math.min(0.999, prog), _p);
        pen.position.set(_p.x, _p.y, _p.z + 0.08); pen.visible = prog < 1;
        art.rotation.y = Math.sin(t * 0.5) * 0.45; art.rotation.x = Math.sin(t * 0.35) * 0.15;
        if (prog < 1) { pen.position.applyEuler(art.rotation); }
      },
      click() { k = (k + 1) % paths.length; make(); },
    };
  },
});

// =====================================================================================================
// Galaxy Book: Quick Share throws files across the room to other Galaxy devices.
// =====================================================================================================
export const quickShare = () => ({
  name: 'Quick Share',
  blurb: 'Quick Share in 3D: files lift off the laptop screen and arc through the air to the phone, tablet or TV that receives them. Tap a file to send it, or a device to send it there.',
  build(box) {
    const { group, inner, W, H } = host(box);
    const DEV = [['Galaxy S26', 'phone', -1], ['Tab S11', 'grid', 0], ['Neo QLED', 'tv', 1]];
    const targetsDev = DEV.map(([n, g, x]) => {
      const m = P.card3d(0.36, 0.26, (c, w, h) => { oneCard(c, w, h, 'rgba(18,20,28,0.95)', 0.25); badge(c, w / 2, h * 0.4, h * 0.5, g, ['#62a8ff', '#2f6cf5']); text(c, n, w / 2, h * 0.86, { size: h * 0.15, weight: 700, font: F, align: 'center' }); }, { px: 140, depth: 0.03 });
      m.position.set(x * Math.min(W * 0.36, 0.62), Math.min(H * 0.3, 0.32), 0.42); m.userData = { ...m.userData, act: 'dev', x, pulse: 0 };
      inner.add(m); return m;
    });
    const FILES = [['Jeju.mp4', 'play', ['#ff6f91', '#7a5cff']], ['Deck.pdf', 'note', ['#ff8a6c', '#ea4a2a']], ['Photos (24)', 'photos', ['#ffd257', '#f39b12']]];
    const files = FILES.map(([n, g, cols], i) => {
      const m = P.card3d(0.3, 0.36, (c, w, h) => { fillRR(c, 0, 0, w, h, w * 0.14, '#f4f6fb'); fillRR(c, w * 0.15, h * 0.12, w * 0.7, h * 0.5, w * 0.1, grad(c, 0, 0, 0, h, cols)); glyph(c, g, w / 2, h * 0.37, w * 0.36, '#fff'); text(c, n, w / 2, h * 0.84, { size: h * 0.1, weight: 700, font: F, color: '#1a1c22', align: 'center' }); }, { px: 160, depth: 0.025, color: 0xd9dde6 });
      m.userData = { ...m.userData, act: 'file', i, home: new THREE.Vector3((i - 1) * 0.36, -Math.min(H * 0.22, 0.25), 0.16), fly: null, born: 0 };
      m.position.copy(m.userData.home); inner.add(m); return m;
    });
    let next = 0, auto = 0, since = 0;
    const send = (f, d) => { if (f.userData.fly) return; f.userData.fly = { from: f.position.clone(), to: d.position.clone(), age: 0, d }; };
    return {
      group, targets: [...files, ...targetsDev],
      enter() { since = 0; auto = 0; },
      update(dt, t, h) {
        since += dt; intro(targetsDev, since);
        if ((auto += dt) > 2.4) { auto = 0; send(files[next % 3], targetsDev[next % 3]); next++; }
        const hov = actOf(h?.object);
        files.forEach((f) => {
          const u = f.userData;
          if (u.fly) {
            u.fly.age += dt; const k = Math.min(1, u.fly.age / 0.9);
            f.position.lerpVectors(u.fly.from, u.fly.to, k); f.position.z += Math.sin(k * Math.PI) * 0.4; f.position.y += Math.sin(k * Math.PI) * 0.12;
            f.rotation.y = k * Math.PI * 2; f.scale.setScalar(Math.max(0.001, 1 - 0.7 * k));
            if (k >= 1) { u.fly.d.userData.pulse = 1; u.fly = null; f.position.copy(u.home); u.born = 0; f.rotation.y = 0; }
          } else {
            u.born = Math.min(1, u.born + dt * 2.5);
            f.scale.setScalar(Math.max(0.001, P.stagger(since, u.i, 0.1, 0.4) * u.born));
            f.position.z = u.home.z + (hov === f ? 0.08 : 0) + Math.sin(t * 1.5 + u.i) * 0.015;
          }
        });
        targetsDev.forEach((d) => { d.userData.pulse = Math.max(0, d.userData.pulse - dt * 1.8); const p = d.userData.pulse; d.scale.multiplyScalar(1 + p * 0.25); d.position.z = 0.42 + p * 0.08; });
      },
      click(h) {
        const a = actOf(h?.object); if (!a) return;
        if (a.userData.act === 'file') { send(a, targetsDev[next % 3]); next++; }
        else if (a.userData.act === 'dev') send(files.find((f) => !f.userData.fly) || files[0], a);
        auto = -2;
      },
    };
  },
});

// A product model that stands out of the laptop screen, with dimension callouts.
export const modelViewer = () => ({
  name: '3D model viewer',
  blurb: 'A 3D model opened from My Files stands out of the screen instead of sitting in a flat viewport: the Galaxy S26 Ultra at true proportions, with dimension callouts. Tap to spin it round; tap again to stop.',
  build(box) {
    const { group, inner, H } = host(box);
    const m = phone({ w: 0.39, h: 0.82, d: 0.04, r: 0.045, color: 0x6f7884, cams: 'galaxy', cut: 'punch', screen: { px: 400, draw: (c, w, h) => { blobs2(c, w, h); } } });
    const holder = new THREE.Group(); holder.add(m); holder.scale.setScalar(Math.min(H * 0.8, 0.9)); holder.position.set(-0.15, 0, 0.3); inner.add(holder);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x7fb2ff });
    const dim = (a, b) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lineMat);
    const hh = 0.41 * holder.scale.x, ww = 0.195 * holder.scale.x;
    inner.add(dim(new THREE.Vector3(-0.15 - ww - 0.06, -hh, 0.3), new THREE.Vector3(-0.15 - ww - 0.06, hh, 0.3)));
    inner.add(dim(new THREE.Vector3(-0.15 - ww, -hh - 0.06, 0.3), new THREE.Vector3(-0.15 + ww, -hh - 0.06, 0.3)));
    const callout = P.card3d(0.56, 0.36, (c, w, h) => {
      oneCard(c, w, h, 'rgba(18,20,28,0.95)', 0.2);
      text(c, 'S26 Ultra.glb', w * 0.08, h * 0.24, { size: h * 0.13, weight: 800, font: F });
      ['162.8 × 77.6 × 8.2 mm', 'Titanium frame · 214 g', 'Drag on the laptop: orbit'].forEach((s, i) => text(c, s, w * 0.08, h * (0.48 + i * 0.18), { size: h * 0.1, weight: 600, font: F, color: 'rgba(255,255,255,0.75)' }));
    }, { px: 180, depth: 0.025 });
    callout.position.set(0.42, 0.12, 0.3); inner.add(callout);
    holder.userData.act = 'model';
    let spinning = true, since = 0;
    return {
      group, targets: [holder, callout],
      enter() { since = 0; },
      update(dt, t, h) {
        since += dt; intro([holder, callout], since);
        if (spinning) holder.rotation.y += dt * 0.8; else holder.rotation.y = damp(holder.rotation.y, Math.round(holder.rotation.y / Math.PI) * Math.PI, 4, dt);
        holder.rotation.x = Math.sin(t * 0.5) * 0.12;
      },
      click() { spinning = !spinning; },
    };
  },
});
function blobs2(c, w, h) { c.fillStyle = grad(c, 0, 0, w, h, ['#3e82ff', '#7a5cff', '#ff6f91']); c.fillRect(0, 0, w, h); text(c, '9:41', w / 2, h * 0.25, { size: w * 0.22, weight: 800, font: F, align: 'center' }); }

// =====================================================================================================
// Neo QLED TV: live football on a 3D pitch, and a Samsung Health coach.
// =====================================================================================================
export const sports3d = () => ({
  name: 'Live sports in 3D',
  blurb: 'A match where the pitch lies back into the TV and the players run in depth, with the scoreboard floating in front. Tap to replay the last attack.',
  build(box) {
    const { group, inner, W, H } = host(box);
    const pw = Math.min(W * 0.9, 1.6), pd = 0.8;
    const pitch = new THREE.Group(); pitch.position.set(0, -0.12, 0.12); pitch.rotation.x = -1.05; inner.add(pitch);
    const tex = canvasTex(800, 400, (c, w, h) => {
      for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#2f8f46' : '#2a8240'; c.fillRect((i * w) / 10, 0, w / 10, h); }
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 4;
      c.strokeRect(8, 8, w - 16, h - 16); c.beginPath(); c.moveTo(w / 2, 8); c.lineTo(w / 2, h - 8); c.stroke();
      c.beginPath(); c.arc(w / 2, h / 2, h * 0.17, 0, Math.PI * 2); c.stroke();
      c.strokeRect(8, h * 0.28, w * 0.12, h * 0.44); c.strokeRect(w - 8 - w * 0.12, h * 0.28, w * 0.12, h * 0.44);
    });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    pitch.add(grass);
    const goal = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.09), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    goal.position.set(pw / 2, 0, 0.045); pitch.add(goal);
    const mkPlayer = (col) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.05, 4, 10), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 })); m.rotation.x = Math.PI / 2; pitch.add(m); return m; };
    const players = [];
    for (let i = 0; i < 12; i++) {
      const team = i < 6 ? 0 : 1;
      players.push({ m: mkPlayer(team ? 0xffffff : 0x1d4ed8), base: new THREE.Vector2((team ? 1 : -1) * (0.08 + (i % 6) * 0.11) * pw / 1.6, ((i % 3) - 1) * 0.22 + (i % 2) * 0.06), ph: i * 1.3 });
    }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x666666 })); pitch.add(ball);
    let score = [1, 0], minute = 63, replay = -1, goalFlash = 0;
    const board = P.card3d(Math.min(W * 0.5, 0.8), 0.2, (c, w, h) => {
      oneCard(c, w, h, 'rgba(10,14,30,0.96)', 0.3);
      fillRR(c, w * 0.04, h * 0.2, h * 0.6, h * 0.6, h * 0.15, '#1d4ed8'); fillRR(c, w * 0.96 - h * 0.6, h * 0.2, h * 0.6, h * 0.6, h * 0.15, '#f4f6fb');
      // Fit the score line between the two team badges.
      const line = `SEO  ${score[0]} – ${score[1]}  BUS`, room = w - 2 * (w * 0.06 + h * 0.6);
      c.font = `800 ${h * 0.36}px ${F}`;
      const size = Math.min(h * 0.36, h * 0.36 * room / Math.max(1, c.measureText(line).width));
      text(c, line, w / 2, h * 0.5 + size * 0.36, { size, weight: 800, font: F, align: 'center', color: goalFlash > 0 ? '#ffd257' : '#fff' });
      text(c, `${minute}'`, w / 2, h * 0.92, { size: h * 0.16, weight: 700, font: F, align: 'center', color: '#7fe3a6' });
    }, { px: 160, depth: 0.03 });
    board.position.set(0, Math.min(H * 0.38, 0.4), 0.4); inner.add(board);
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.act = 'replay'; pitch.add(hit); hit.position.z = 0.02;
    let since = 0, mt = 0, holder = 0;
    const _b = new THREE.Vector2();
    return {
      group, targets: [hit, board],
      enter() { since = 0; },
      update(dt, t) {
        since += dt; intro([pitch, board], since);
        if ((mt += dt) > 3) { mt = 0; minute = Math.min(90, minute + 1); board.userData.tex.redraw(); }
        if (replay >= 0) {
          replay += dt; const k = Math.min(1, replay / 1.6);
          ball.position.set(-0.1 * pw + k * 0.6 * pw, Math.sin(k * 7) * 0.05 * (1 - k), Math.sin(k * Math.PI) * 0.16);
          if (k >= 1) { replay = -1; score[0]++; goalFlash = 1.5; board.userData.tex.redraw(); }
        } else {
          if ((holder += dt) > 1.1) holder = 0;
          const p = players[Math.floor(t / 1.1) % 6].m.position, q = players[(Math.floor(t / 1.1) + 1) % 6].m.position, k = holder / 1.1;
          ball.position.set(p.x + (q.x - p.x) * k, p.y + (q.y - p.y) * k, 0.018 + Math.sin(k * Math.PI) * 0.03);
        }
        players.forEach((pl) => {
          _b.set(ball.position.x, ball.position.y).sub(pl.base).multiplyScalar(0.25);
          pl.m.position.set(pl.base.x + _b.x + Math.sin(t * 1.3 + pl.ph) * 0.03, pl.base.y + _b.y + Math.cos(t * 1.1 + pl.ph) * 0.03, 0.04 + Math.abs(Math.sin(t * 8 + pl.ph)) * 0.006);
        });
        if (goalFlash > 0) { goalFlash -= dt; if (goalFlash <= 0) board.userData.tex.redraw(); }
        pitch.rotation.z = Math.sin(t * 0.25) * 0.05;
      },
      click() { if (replay < 0) { replay = 0; board.userData.tex.redraw(); } },
    };
  },
});

export const workoutCoach = () => ({
  name: 'Health coach',
  blurb: 'Samsung Health on the TV: the coach steps out of the screen to demonstrate, with the rep counter and your heart rate from the watch floating beside her. Tap to move on to the next exercise.',
  build(box) {
    const { group, inner, W, H } = host(box);
    const coach = P.bust({ s: 0.62, skin: 0xc58c6b, hair: 0x2a1a12, shirt: 0x12a877 });
    coach.userData.talking = true;
    const ch = new THREE.Group(); ch.add(coach); ch.position.set(-Math.min(W * 0.28, 0.5), -0.05, 0.28); inner.add(ch);
    const EX = [['Squats', 15], ['Lunges', 12], ['Jumping jacks', 30], ['Plank', 45]];
    let ex = 0, reps = 0, rt = 0;
    const counter = textPlane(0.9, 0.5, (c, w, h) => {
      text(c, `${reps}`, w * 0.02, h * 0.62, { size: h * 0.62, weight: 800, font: F });
      text(c, `/ ${EX[ex][1]}`, w * 0.38, h * 0.62, { size: h * 0.26, weight: 700, font: F, color: 'rgba(255,255,255,0.65)' });
      text(c, EX[ex][0], w * 0.02, h * 0.9, { size: h * 0.17, weight: 700, font: F, color: '#7fe3a6' });
    });
    counter.position.set(0.18, 0.1, 0.36); inner.add(counter);
    const hrt = P.heart(0.16, 0xff3b5c, 128); hrt.position.set(Math.min(W * 0.36, 0.62), 0.22, 0.32); inner.add(hrt);
    const rg = P.rings({ r: 0.14, tube: 0.016, colors: [0x3fd88a, 0x3e82ff, 0xff7a45], fracs: [0.55, 0.7, 0.4] }); rg.position.set(Math.min(W * 0.36, 0.62), -0.18, 0.26); inner.add(rg);
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshBasicMaterial({ visible: false })); hit.position.z = 0.3; hit.userData.act = 'next'; inner.add(hit);
    let since = 0;
    return {
      group, targets: [hit],
      enter() { since = 0; },
      update(dt, t) {
        since += dt; intro([ch, counter, hrt, rg], since);
        ch.position.y = -0.05 - Math.max(0, Math.sin(t * 2.6)) * 0.08;
        if ((rt += dt) > 1.2) { rt = 0; reps = reps >= EX[ex][1] ? 0 : reps + 1; counter.userData.tex.redraw(); }
        P.updateAll(inner, dt, t);
      },
      click() { ex = (ex + 1) % EX.length; reps = 0; counter.userData.tex.redraw(); },
    };
  },
});

// =====================================================================================================
// Galaxy XR: volumes that float in front of the windows; tap one to bring it to the middle.
// =====================================================================================================
export const xrVolumes = () => ({
  name: 'Volumes',
  blurb: 'Android XR on Galaxy XR places 3D volumes next to its windows. Here they float in front of the screen: a city map, a beating heart from Samsung Health and the weather. Tap one to bring it forward.',
  build(box) {
    const { group, inner, W } = host(box, 0.18);
    const span = Math.min(W * 0.32, 0.75);
    const mkVol = (fill, label, x) => {
      const g = new THREE.Group();
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.46, 0.4, 0.34)), new THREE.LineBasicMaterial({ color: 0x9fc3ff, transparent: true, opacity: 0.55 }));
      g.add(frame); fill(g);
      const l = textPlane(0.42, 0.07, (c, w, h) => text(c, label, w / 2, h * 0.78, { size: h * 0.72, weight: 700, font: F, align: 'center' }), 90);
      l.position.set(0, -0.26, 0.17); g.add(l);
      const hitb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.34), new THREE.MeshBasicMaterial({ visible: false })); g.add(hitb);
      g.userData = { act: 'vol', home: new THREE.Vector3(x, 0, 0.28), p: { x: new Spring(x), z: new Spring(0.28), s: new Spring(1) } };
      inner.add(g); return g;
    };
    const vols = [
      mkVol((g) => { const c = P.city({ w: 0.38, d: 0.26, seed: 3 }); c.rotation.x = 0.5; c.position.y = -0.08; g.add(c); }, 'Maps', -span),
      mkVol((g) => { const h = P.heart(0.2, 0xff3b5c, 70); g.add(h); }, 'Health', 0),
      mkVol((g) => { const s = P.sun(0.06); s.position.set(0.08, 0.07, 0); g.add(s); const c = P.cloud(0.07); c.position.set(-0.05, -0.02, 0.06); g.add(c); }, 'Weather', span),
    ];
    let focus = -1, since = 0;
    return {
      group, targets: vols,
      enter() { since = 0; focus = -1; },
      update(dt, t, h) {
        since += dt;
        const hov = actOf(h?.object);
        vols.forEach((v, i) => {
          const p = v.userData.p, f = focus === i;
          p.x.to = f ? 0 : focus >= 0 ? v.userData.home.x * 1.25 : v.userData.home.x;
          p.z.to = f ? 0.5 : focus >= 0 ? 0.12 : 0.28 + (hov === v ? 0.06 : 0);
          p.s.to = f ? 1.6 : focus >= 0 ? 0.75 : hov === v ? 1.12 : 1;
          const a = P.stagger(since, i, 0.15, 0.5);
          v.position.set(p.x.step(dt), Math.sin(t * 1.2 + i) * 0.02, p.z.step(dt)); v.scale.setScalar(Math.max(0.001, p.s.step(dt) * a));
          v.rotation.y = Math.sin(t * 0.5 + i) * 0.25;
        });
        P.updateAll(inner, dt, t);
      },
      click(h) { const v = actOf(h?.object); const i = vols.indexOf(v); focus = i < 0 || focus === i ? -1 : i; },
    };
  },
});
