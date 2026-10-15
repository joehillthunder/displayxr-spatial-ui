// Samsung: One UI 9 (Android 17), launched with the Galaxy Z Fold8 / Z Fold8 Ultra / Z Flip8 at Unpacked
// on July 22, 2026. It keeps the One UI 8.5 look: a big bold lock-screen clock, the Now Bar pill for
// live activities, Now Brief cards, frosted quick-panel tiles, rounder squircle icons and a top-heavy
// layout that puts content up top and controls within thumb reach.
//
// Device screens are hand-drawn canvas recreations. The three spatial concepts take One UI ideas
// (Now Bar, Edge panels, SmartThings Map View) and give them real depth on a DisplayXR display.

import * as THREE from 'three';
import { phone, foldable, tablet, laptop, watch, tv, headset } from '../devices.js';
import {
  canvasTex, panel, slabGeo, screenGeo, rr, fillRR, strokeRR, squircle, text, grad, blobs,
  clockStr, dateStr, statusBar, glyph, FONT, Spring, damp, clamp, lerp, ease,
} from '../kit.js';

const F = FONT.samsung;
const BLUE = '#3e82ff';

// ---- One UI drawing helpers -------------------------------------------------------------------------
const APPS = [
  ['Phone', 'phone', ['#4fdc78', '#1fae4f']], ['Messages', 'message', ['#62a8ff', '#2f6cf5']],
  ['Internet', 'search', ['#9a7bff', '#5b3df0']], ['Camera', 'camera', ['#ff7d90', '#e8344f']],
  ['Gallery', 'photos', ['#ff94b8', '#f0446f']], ['Settings', 'gear', ['#a3abb9', '#677083']],
  ['Calendar', 'calendar', ['#55d8b8', '#14a585']], ['Clock', 'clock', ['#6e7aff', '#3442d8']],
  ['Notes', 'note', ['#ffbe55', '#f68a14']], ['Health', 'heart', ['#5bdfac', '#18b07a']],
  ['SmartThings', 'home', ['#55b0ff', '#1876e8']], ['Store', 'store', ['#ff7cb8', '#d6338a']],
  ['Weather', 'sun', ['#ffd257', '#f39b12']], ['Music', 'music', ['#ff8a6c', '#ea4a2a']],
  ['Wallet', 'wallet', ['#4a5a80', '#1d2847']], ['Maps', 'map', ['#62cc74', '#2e9c45']],
];
const app = (name) => APPS.find((a) => a[0] === name) || APPS[0];

function icon(ctx, x, y, s, name, label, labelColor = '#fff') {
  const [, g, cols] = app(name);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = s * 0.12; ctx.shadowOffsetY = s * 0.04;
  squircle(ctx, x, y, s, 4); ctx.fillStyle = grad(ctx, x, y, x, y + s, cols); ctx.fill();
  ctx.restore();
  glyph(ctx, g, x + s / 2, y + s / 2, s * 0.52, '#fff');
  if (label) text(ctx, label, x + s / 2, y + s + s * 0.3, { size: s * 0.22, weight: 500, color: labelColor, align: 'center', font: F });
}

const WALLS = [
  ['#0a0f2e', [[0.15, 0.12, 0.6, 'rgba(90,120,255,0.95)'], [0.9, 0.42, 0.55, 'rgba(190,90,255,0.8)'], [0.25, 0.9, 0.6, 'rgba(40,200,255,0.6)']]],
  ['#14081f', [[0.8, 0.1, 0.6, 'rgba(255,110,170,0.85)'], [0.1, 0.55, 0.6, 'rgba(120,80,255,0.8)'], [0.7, 0.95, 0.5, 'rgba(255,170,90,0.6)']]],
  ['#04161a', [[0.2, 0.2, 0.6, 'rgba(40,220,190,0.8)'], [0.9, 0.6, 0.6, 'rgba(60,130,255,0.85)'], [0.4, 1.0, 0.5, 'rgba(160,255,200,0.4)']]],
];
function wallpaper(ctx, w, h, k = 0) { const [base, spots] = WALLS[k % WALLS.length]; blobs(ctx, w, h, base, spots); }

// The Now Bar: a dark pill at the bottom of the lock screen showing one live activity.
const LIVE = {
  music: { icon: 'music', title: 'Midnight City', sub: 'M83 · Hurry Up, We\'re Dreaming', color: ['#ff6f91', '#7a5cff'] },
  timer: { icon: 'clock', title: 'Timer', sub: 'Pasta', color: ['#ffb547', '#f6631a'] },
  ride: { icon: "car", title: "Ride arriving", sub: "Gray EV · 7KX 214", color: ['#3e82ff', '#28c7ff'] },
  weather: { icon: 'cloud', title: '64° Cloudy', sub: 'San Jose · H 71° L 55°', color: ['#62a8ff', '#9ad0ff'] },
  workout: { icon: 'heart', title: 'Outdoor run', sub: '3.24 km · 5\'41"/km', color: ['#4fe0a0', '#12a877'] },
};
function liveValue(kind, t) {
  if (kind === 'music') return (t * 0.012) % 1;
  if (kind === 'timer') { const s = Math.max(0, 1500 - (t % 1500)); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }
  if (kind === 'ride') return 3 - Math.floor((t / 20) % 3);
  if (kind === 'workout') return 138 + Math.round(6 * Math.sin(t * 0.7));
  return '';
}

function nowBar(ctx, x, y, w, h, kind, t, { expanded = false } = {}) {
  const L = LIVE[kind];
  ctx.save();
  fillRR(ctx, x, y, w, h, h / 2, 'rgba(14,16,24,0.82)');
  strokeRR(ctx, x + 1, y + 1, w - 2, h - 2, h / 2, 'rgba(255,255,255,0.10)', 2);
  const r = h * 0.36, cx = x + h * 0.5, cy = y + h / 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = grad(ctx, cx - r, cy - r, cx + r, cy + r, L.color); ctx.fill();
  glyph(ctx, L.icon, cx, cy, r * 1.1, '#fff');
  const tx = x + h * 0.98, ts = h * (expanded ? 0.2 : 0.24);
  let title = L.title, sub = L.sub;
  if (kind === 'timer') title = `Timer · ${liveValue('timer', t)}`;
  if (kind === 'workout') sub = `3.24 km · ${liveValue('workout', t)} bpm`;
  const rx = x + w - h * 0.55;
  // Keep the text clear of the control on the right (wider controls when expanded).
  const textEnd = rx - h * (kind === "ride" ? 1.0 : 0.45);
  ctx.save(); ctx.beginPath(); ctx.rect(tx, y, Math.max(0, textEnd - tx), h); ctx.clip();
  text(ctx, title, tx, cy - (expanded ? h * 0.06 : h * 0.02), { size: ts, weight: 700, font: F });
  text(ctx, sub, tx, cy + ts * (expanded ? 1.0 : 0.95), { size: ts * 0.72, weight: 500, color: 'rgba(255,255,255,0.7)', font: F });
  ctx.restore();
  if (kind === 'music') {
    ctx.lineWidth = h * 0.06; ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(rx, cy, h * 0.28, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(rx, cy, h * 0.28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * liveValue('music', t)); ctx.stroke();
    glyph(ctx, 'pause', rx, cy, h * 0.24, '#fff');
  } else if (kind === 'timer') {
    fillRR(ctx, rx - h * 0.32, cy - h * 0.28, h * 0.64, h * 0.56, h * 0.28, '#f6631a');
    glyph(ctx, 'pause', rx, cy, h * 0.24, '#fff');
  } else if (kind === 'ride') {
    fillRR(ctx, rx - h * 0.85, cy - h * 0.24, h * 1.2, h * 0.48, h * 0.24, BLUE);
    text(ctx, `${liveValue("ride", t)} min`, rx - h * 0.25, cy + h * 0.08, { size: h * 0.22, weight: 700, align: "center", font: F });
  } else if (kind === 'weather') {
    glyph(ctx, 'sun', rx - h * 0.25, cy - h * 0.06, h * 0.32, '#ffd257'); glyph(ctx, 'cloud', rx, cy + h * 0.04, h * 0.38, '#fff');
  } else if (kind === 'workout') {
    glyph(ctx, 'heart', rx, cy, h * 0.34, '#ff5a72');
  }
  ctx.restore();
}

function lockScreen(ctx, w, h, t, { wall = 0, live = 'music', bar = true } = {}) {
  wallpaper(ctx, w, h, wall);
  const u = w / 540;
  statusBar(ctx, w, 44 * u, { size: 22 * u, font: F, pad: 34 * u });
  text(ctx, dateStr(false), w / 2, 150 * u, { size: 27 * u, weight: 600, align: 'center', font: F });
  text(ctx, clockStr(), w / 2, 330 * u, { size: 168 * u, weight: 700, align: 'center', font: F, spacing: -4 * u });
  glyph(ctx, 'cloud', w / 2 - 44 * u, 382 * u, 30 * u, '#fff');
  text(ctx, '64°', w / 2 + 14 * u, 393 * u, { size: 28 * u, weight: 600, align: 'center', font: F });
  if (bar) nowBar(ctx, w * 0.07, h * 0.8, w * 0.86, 112 * u, live, t);
  for (const [gx, gl] of [[w * 0.14, 'phone'], [w * 0.86, 'camera']]) {
    ctx.beginPath(); ctx.arc(gx, h * 0.935, 34 * u, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    glyph(ctx, gl, gx, h * 0.935, 30 * u, '#fff');
  }
}

// A Now Brief card: rounded, frosted dark, bold header.
function briefCard(ctx, x, y, w, h, title, lines, u, accent = BLUE) {
  fillRR(ctx, x, y, w, h, 34 * u, 'rgba(20,22,32,0.78)');
  text(ctx, title, x + 28 * u, y + 50 * u, { size: 26 * u, weight: 700, font: F });
  fillRR(ctx, x + 28 * u, y + 64 * u, 46 * u, 5 * u, 3 * u, accent);
  lines.forEach((l, i) => text(ctx, l, x + 28 * u, y + (108 + i * 38) * u, { size: 22 * u, weight: 500, color: i ? 'rgba(255,255,255,0.68)' : '#fff', font: F }));
}

function window1(ctx, x, y, w, h, title, appName, u, body) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24 * u;
  fillRR(ctx, x, y, w, h, 26 * u, '#f6f7fb');
  ctx.restore();
  fillRR(ctx, x + w / 2 - 34 * u, y + 10 * u, 68 * u, 7 * u, 4 * u, 'rgba(0,0,0,0.22)');
  icon(ctx, x + 20 * u, y + 26 * u, 40 * u, appName);
  text(ctx, title, x + 72 * u, y + 56 * u, { size: 24 * u, weight: 700, color: '#141821', font: F });
  ctx.save(); rr(ctx, x, y + 80 * u, w, h - 80 * u, 26 * u); ctx.clip(); body(x, y + 80 * u, w, h - 80 * u); ctx.restore();
}

function lines(ctx, x, y, w, n, u, color = 'rgba(20,24,33,0.14)', gap = 30) {
  for (let i = 0; i < n; i++) fillRR(ctx, x, y + i * gap * u, w * (i % 3 === 2 ? 0.6 : 1), 12 * u, 6 * u, color);
}

// ---- device screens ---------------------------------------------------------------------------------
function s26Screen(ctx, w, h, t) { lockScreen(ctx, w, h, t, { wall: 0, live: 'music' }); }

function foldScreen(ctx, w, h, t) {
  wallpaper(ctx, w, h, 2);
  const u = w / 1000;
  statusBar(ctx, w, 40 * u, { size: 24 * u, font: F, pad: 34 * u });
  const top = 70 * u, bot = h - 140 * u, gap = 16 * u;
  // Left: Internet. Right: Notes over Messages.
  window1(ctx, 24 * u, top, w * 0.5 - 32 * u, bot - top, 'Internet', 'Internet', u, (x, y, ww, hh) => {
    fillRR(ctx, x + 20 * u, y + 10 * u, ww - 40 * u, 52 * u, 26 * u, '#e7e9f0');
    text(ctx, 'news.example.com', x + 46 * u, y + 44 * u, { size: 20 * u, color: '#5b6272', font: F });
    ctx.fillStyle = grad(ctx, x, y + 80 * u, x + ww, y + 340 * u, ['#5c7cff', '#9a5cff']); ctx.fillRect(x + 20 * u, y + 80 * u, ww - 40 * u, 260 * u);
    text(ctx, 'Foldables, eight', x + 30 * u, y + 390 * u, { size: 34 * u, weight: 700, color: '#141821', font: F });
    text(ctx, 'generations in', x + 30 * u, y + 430 * u, { size: 34 * u, weight: 700, color: '#141821', font: F });
    lines(ctx, x + 30 * u, y + 470 * u, ww - 60 * u, 9, u);
  });
  const rx = w * 0.5 + 8 * u, rw = w * 0.5 - 32 * u, mid = top + (bot - top) * 0.48;
  window1(ctx, rx, top, rw, mid - top - gap / 2, 'Notes', 'Notes', u, (x, y, ww) => {
    text(ctx, 'Trip ideas', x + 26 * u, y + 46 * u, { size: 30 * u, weight: 700, color: '#141821', font: F });
    ['Kyoto in November', 'Rail pass, 7 days', 'Book the ryokan'].forEach((s, i) => {
      ctx.beginPath(); ctx.arc(x + 38 * u, y + (90 + i * 44) * u, 10 * u, 0, Math.PI * 2); ctx.strokeStyle = '#f68a14'; ctx.lineWidth = 3 * u; ctx.stroke();
      text(ctx, s, x + 62 * u, y + (98 + i * 44) * u, { size: 23 * u, color: '#262b36', font: F });
    });
  });
  window1(ctx, rx, mid + gap / 2, rw, bot - mid - gap / 2, 'Messages', 'Messages', u, (x, y, ww) => {
    fillRR(ctx, x + 20 * u, y + 20 * u, ww * 0.6, 56 * u, 28 * u, '#e5e8f0');
    text(ctx, 'Landing at 6:40', x + 42 * u, y + 56 * u, { size: 22 * u, color: '#1b1f29', font: F });
    fillRR(ctx, x + ww * 0.35, y + 96 * u, ww * 0.6, 56 * u, 28 * u, BLUE);
    text(ctx, 'I\'ll be at gate B', x + ww * 0.35 + 22 * u, y + 132 * u, { size: 22 * u, color: '#fff', font: F });
  });
  // Taskbar
  fillRR(ctx, 24 * u, h - 112 * u, w - 48 * u, 92 * u, 46 * u, 'rgba(20,22,32,0.62)');
  glyph(ctx, 'grid', 80 * u, h - 66 * u, 40 * u, '#fff');
  ['Phone', 'Messages', 'Internet', 'Camera', 'Gallery', 'Notes', 'Calendar'].forEach((n, i) => icon(ctx, 140 * u + i * 86 * u, h - 100 * u, 66 * u, n));
  text(ctx, 'Recent', w - 210 * u, h - 58 * u, { size: 20 * u, color: 'rgba(255,255,255,0.7)', font: F });
  icon(ctx, w - 130 * u, h - 100 * u, 66 * u, 'Maps');
}

function flipScreen(ctx, w, h, t) {
  // Flex mode: top half is the viewfinder, bottom half the camera controls.
  const u = w / 540, half = h / 2;
  const sky = grad(ctx, 0, 0, 0, half, ['#6fb2ff', '#ffd2a8', '#ff9f7a']);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, half);
  ctx.fillStyle = '#2d3b55';
  ctx.beginPath(); ctx.moveTo(0, half * 0.78); ctx.lineTo(w * 0.25, half * 0.55); ctx.lineTo(w * 0.45, half * 0.7); ctx.lineTo(w * 0.7, half * 0.48); ctx.lineTo(w, half * 0.72); ctx.lineTo(w, half); ctx.lineTo(0, half); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.72, half * 0.3, 40 * u, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5 * u;
  for (const k of [1, 2]) { ctx.beginPath(); ctx.moveTo(w * k / 3, 60 * u); ctx.lineTo(w * k / 3, half); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, half * k / 3); ctx.lineTo(w, half * k / 3); ctx.stroke(); }
  statusBar(ctx, w, 40 * u, { size: 20 * u, font: F, pad: 30 * u });
  fillRR(ctx, w / 2 - 80 * u, 66 * u, 160 * u, 40 * u, 20 * u, 'rgba(0,0,0,0.45)');
  text(ctx, 'Flex mode', w / 2, 93 * u, { size: 19 * u, weight: 600, align: 'center', font: F });
  // Controls
  ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, half, w, half);
  text(ctx, '0.6   1x   2x', w / 2, half + 90 * u, { size: 24 * u, weight: 600, align: 'center', color: '#ffd257', font: F });
  ['PORTRAIT', 'PHOTO', 'VIDEO', 'MORE'].forEach((m, i) => text(ctx, m, w * (0.14 + i * 0.24), half + 190 * u, { size: 20 * u, weight: i === 1 ? 700 : 500, align: 'center', color: i === 1 ? '#fff' : 'rgba(255,255,255,0.55)', font: F }));
  ctx.beginPath(); ctx.arc(w / 2, half + 330 * u, 70 * u, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(w / 2, half + 330 * u, 80 * u, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 4 * u; ctx.stroke();
  fillRR(ctx, w * 0.12, half + 300 * u, 64 * u, 64 * u, 16 * u, grad(ctx, 0, half + 300 * u, 0, half + 364 * u, ['#ff9f7a', '#6fb2ff']));
  ctx.beginPath(); ctx.arc(w * 0.82, half + 332 * u, 34 * u, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
  glyph(ctx, 'camera', w * 0.82, half + 332 * u, 30 * u, '#fff');
}

function watchScreen(ctx, w, h, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  const c = w / 2, u = w / 640;
  const rings = [['#ff4f6d', 0.78], ['#4fe0a0', 0.62], ['#3e82ff', 0.9]];
  rings.forEach(([col, p], i) => {
    const r = 290 * u - i * 24 * u;
    ctx.lineWidth = 16 * u; ctx.lineCap = 'round';
    ctx.strokeStyle = col + '33'; ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(c, c, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
  });
  text(ctx, dateStr(false).toUpperCase(), c, 200 * u, { size: 26 * u, weight: 600, align: 'center', color: '#ffb547', font: F });
  text(ctx, clockStr(), c, 330 * u, { size: 128 * u, weight: 700, align: 'center', font: F });
  // complications
  [['heart', '72', '#ff4f6d'], ['sun', '64°', '#ffd257'], ['fitness', '8.2k', '#4fe0a0']].forEach(([g, v, col], i) => {
    const x = c + (i - 1) * 96 * u, y = 390 * u;
    glyph(ctx, g, x, y, 32 * u, col);
    text(ctx, v, x, y + 46 * u, { size: 22 * u, weight: 600, align: 'center', font: F });
  });
  // Now Bar on the watch
  nowBar(ctx, c - 150 * u, 470 * u, 300 * u, 76 * u, 'workout', t);
}

function dexScreen(ctx, w, h, t) {
  wallpaper(ctx, w, h, 1);
  const u = h / 1000;
  ['My Files', 'Gallery', 'Settings', 'Notes'].forEach((n, i) => icon(ctx, 34 * u, 40 * u + i * 150 * u, 74 * u, n === 'My Files' ? 'Store' : n, n));
  const dwin = (x, y, ww, hh, title, appName, body) => {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30 * u; fillRR(ctx, x, y, ww, hh, 18 * u, '#f6f7fb'); ctx.restore();
    fillRR(ctx, x, y, ww, 60 * u, 18 * u, '#e9ebf2'); ctx.fillStyle = '#e9ebf2'; ctx.fillRect(x, y + 40 * u, ww, 20 * u);
    icon(ctx, x + 16 * u, y + 12 * u, 36 * u, appName);
    text(ctx, title, x + 64 * u, y + 40 * u, { size: 22 * u, weight: 600, color: '#1b1f29', font: F });
    ['—', '▢', '✕'].forEach((s, i) => text(ctx, s, x + ww - (110 - i * 38) * u, y + 40 * u, { size: 22 * u, color: '#444b5a', align: 'center', font: F }));
    ctx.save(); rr(ctx, x, y + 60 * u, ww, hh - 60 * u, 18 * u); ctx.clip(); body(x, y + 60 * u, ww, hh - 60 * u); ctx.restore();
  };
  dwin(w * 0.13, 60 * u, w * 0.48, 640 * u, 'Samsung Notes', 'Notes', (x, y, ww, hh) => {
    text(ctx, 'Q4 launch plan', x + 30 * u, y + 64 * u, { size: 36 * u, weight: 700, color: '#141821', font: F });
    lines(ctx, x + 30 * u, y + 100 * u, ww - 60 * u, 8, u, 'rgba(20,24,33,0.14)', 34);
    ctx.strokeStyle = '#f68a14'; ctx.lineWidth = 5 * u; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const px = x + 40 * u + i * 12 * u, py = y + 440 * u + Math.sin(i * 0.5) * 30 * u; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
  });
  dwin(w * 0.55, 200 * u, w * 0.41, 560 * u, 'Internet', 'Internet', (x, y, ww) => {
    ctx.fillStyle = grad(ctx, x, y, x + ww, y + 240 * u, ['#3e82ff', '#28c7ff']); ctx.fillRect(x, y, ww, 240 * u);
    text(ctx, 'Galaxy Tab S11 Ultra', x + 28 * u, y + 300 * u, { size: 30 * u, weight: 700, color: '#141821', font: F });
    lines(ctx, x + 28 * u, y + 330 * u, ww - 56 * u, 5, u);
  });
  // Taskbar
  ctx.fillStyle = 'rgba(12,14,20,0.82)'; ctx.fillRect(0, h - 84 * u, w, 84 * u);
  glyph(ctx, 'grid', 46 * u, h - 42 * u, 36 * u, '#fff');
  ['Internet', 'Notes', 'Gallery', 'Messages', 'Camera', 'Calendar'].forEach((n, i) => {
    icon(ctx, 100 * u + i * 76 * u, h - 72 * u, 56 * u, n);
    if (i < 2) fillRR(ctx, 118 * u + i * 76 * u, h - 10 * u, 20 * u, 4 * u, 2 * u, '#fff');
  });
  text(ctx, clockStr(), w - 40 * u, h - 46 * u, { size: 22 * u, weight: 600, align: 'right', font: F });
  text(ctx, dateStr(false), w - 40 * u, h - 18 * u, { size: 16 * u, align: 'right', color: 'rgba(255,255,255,0.7)', font: F });
  glyph(ctx, 'wifi', w - 200 * u, h - 40 * u, 28 * u, '#fff');
}

function bookScreen(ctx, w, h, t) {
  blobs(ctx, w, h, '#0c1530', [[0.3, 0.3, 0.7, 'rgba(62,130,255,0.7)'], [0.85, 0.8, 0.6, 'rgba(120,90,255,0.6)']]);
  const u = h / 1000;
  // Multi Control / Galaxy continuity panel
  const px = w * 0.06, py = 80 * u, pw = w * 0.36, ph = 720 * u;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30 * u; fillRR(ctx, px, py, pw, ph, 20 * u, '#f3f4f8'); ctx.restore();
  text(ctx, 'Phone · Galaxy S26 Ultra', px + 28 * u, py + 54 * u, { size: 24 * u, weight: 700, color: '#141821', font: F });
  text(ctx, 'Connected · 82%', px + 28 * u, py + 86 * u, { size: 18 * u, color: '#5b6272', font: F });
  [['Messages', 'Landing at 6:40'], ['Calendar', 'Design review · 9:00'], ['Gallery', '12 new photos'], ['Clock', 'Alarm 6:30 AM']].forEach(([n, s], i) => {
    const y = py + (130 + i * 130) * u;
    fillRR(ctx, px + 20 * u, y, pw - 40 * u, 110 * u, 18 * u, '#fff');
    icon(ctx, px + 40 * u, y + 25 * u, 60 * u, n);
    text(ctx, n, px + 120 * u, y + 50 * u, { size: 22 * u, weight: 700, color: '#141821', font: F });
    text(ctx, s, px + 120 * u, y + 82 * u, { size: 19 * u, color: '#5b6272', font: F });
  });
  // Quick Share drop window
  const qx = w * 0.48, qy = 160 * u, qw = w * 0.44, qh = 520 * u;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30 * u; fillRR(ctx, qx, qy, qw, qh, 20 * u, '#f3f4f8'); ctx.restore();
  text(ctx, 'Quick Share', qx + 30 * u, qy + 58 * u, { size: 28 * u, weight: 700, color: '#141821', font: F });
  [['Galaxy Tab S11', BLUE], ['Galaxy Z Fold8', '#9a7bff'], ['Neo QLED TV', '#4fe0a0']].forEach(([n, c], i) => {
    const cx = qx + qw * (0.2 + i * 0.3), cy = qy + 220 * u;
    ctx.beginPath(); ctx.arc(cx, cy, 64 * u, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
    glyph(ctx, i === 2 ? 'tv' : 'phone', cx, cy, 56 * u, '#fff');
    text(ctx, n, cx, cy + 110 * u, { size: 20 * u, weight: 600, color: '#141821', align: 'center', font: F });
  });
  fillRR(ctx, qx + 30 * u, qy + qh - 110 * u, qw - 60 * u, 70 * u, 35 * u, BLUE);
  text(ctx, 'Send 3 files', qx + qw / 2, qy + qh - 66 * u, { size: 24 * u, weight: 700, align: 'center', font: F });
  // Centered taskbar
  ctx.fillStyle = 'rgba(16,18,26,0.85)'; ctx.fillRect(0, h - 76 * u, w, 76 * u);
  const names = ['Internet', 'Notes', 'Gallery', 'Messages', 'Calendar', 'Settings'];
  names.forEach((n, i) => icon(ctx, w / 2 + (i - names.length / 2) * 66 * u, h - 66 * u, 52 * u, n));
  text(ctx, clockStr(), w - 30 * u, h - 32 * u, { size: 20 * u, weight: 600, align: 'right', font: F });
}

function tvScreen(ctx, w, h, t) {
  const u = h / 1000;
  ctx.fillStyle = '#07080c'; ctx.fillRect(0, 0, w, h);
  // hero
  const hero = ctx.createLinearGradient(0, 0, w, h * 0.6);
  hero.addColorStop(0, '#0a3a6b'); hero.addColorStop(0.5, '#1567a8'); hero.addColorStop(1, '#41c3d9');
  ctx.fillStyle = hero; ctx.fillRect(0, 0, w, h * 0.6);
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(w * (0.55 + i * 0.08), h * (0.35 + Math.sin(i) * 0.08), 90 * u, 30 * u, 0.2, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${0.05 + i * 0.02})`; ctx.fill(); }
  const fade = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.6); fade.addColorStop(0, 'rgba(7,8,12,0)'); fade.addColorStop(1, '#07080c');
  ctx.fillStyle = fade; ctx.fillRect(0, h * 0.3, w, h * 0.3);
  text(ctx, 'Samsung TV Plus · Featured', 70 * u, 150 * u, { size: 26 * u, weight: 600, color: 'rgba(255,255,255,0.75)', font: F });
  text(ctx, 'Ocean Worlds', 70 * u, 250 * u, { size: 92 * u, weight: 700, font: F });
  text(ctx, 'Nature · 4K HDR · Vision AI upscaled', 70 * u, 300 * u, { size: 28 * u, color: 'rgba(255,255,255,0.75)', font: F });
  fillRR(ctx, 70 * u, 340 * u, 190 * u, 70 * u, 35 * u, '#fff'); glyph(ctx, 'play', 120 * u, 375 * u, 30 * u, '#000');
  text(ctx, 'Watch', 150 * u, 386 * u, { size: 28 * u, weight: 700, color: '#000', font: F });
  // top bar
  text(ctx, clockStr(), w - 70 * u, 76 * u, { size: 30 * u, weight: 600, align: 'right', font: F });
  ctx.beginPath(); ctx.arc(w - 200 * u, 66 * u, 26 * u, 0, Math.PI * 2); ctx.fillStyle = '#ff7cb8'; ctx.fill();
  // app row (Tizen launcher)
  text(ctx, 'Apps', 70 * u, 650 * u, { size: 28 * u, weight: 700, font: F });
  const tiles = [['Live', '#e8344f'], ['Gaming Hub', '#5b3df0'], ['Art Store', '#14a585'], ['SmartThings', '#1876e8'], ['Health', '#18b07a'], ['Music', '#ea4a2a'], ['Gallery', '#f0446f']];
  tiles.forEach(([n, c], i) => {
    const x = 70 * u + i * 240 * u, y = 680 * u, sel = i === 0;
    fillRR(ctx, x, y, 220 * u, 124 * u, 22 * u, sel ? '#fff' : '#1a1d26');
    text(ctx, n, x + 110 * u, y + 76 * u, { size: 26 * u, weight: 700, align: 'center', color: sel ? c : '#fff', font: F });
  });
  // continue watching row
  text(ctx, 'Continue watching', 70 * u, 870 * u, { size: 26 * u, weight: 700, font: F });
  for (let i = 0; i < 6; i++) {
    const x = 70 * u + i * 300 * u;
    fillRR(ctx, x, 895 * u, 280 * u, 158 * u, 16 * u, grad(ctx, x, 895 * u, x + 280 * u, 1053 * u, [['#5c7cff', '#ff7cb8', '#ffb547', '#4fe0a0', '#9a7bff', '#28c7ff'][i], '#111']));
  }
  // SmartThings card
  fillRR(ctx, w - 520 * u, 420 * u, 450 * u, 180 * u, 26 * u, 'rgba(20,22,32,0.85)');
  icon(ctx, w - 494 * u, 446 * u, 64 * u, 'SmartThings');
  text(ctx, 'SmartThings', w - 410 * u, 482 * u, { size: 26 * u, weight: 700, font: F });
  text(ctx, 'Robot vacuum done · Door locked', w - 494 * u, 560 * u, { size: 22 * u, color: 'rgba(255,255,255,0.75)', font: F });
}

// Galaxy XR windows (Android XR): rounded panels with a pill grabber under each.
function xrWindow(draw) {
  return {
    draw(ctx, w, h, t) {
      const u = h / 720;
      ctx.clearRect(0, 0, w, h);
      fillRR(ctx, 0, 0, w, h - 40 * u, 36 * u, 'rgba(24,26,34,0.94)');
      fillRR(ctx, w / 2 - 60 * u, h - 24 * u, 120 * u, 12 * u, 6 * u, 'rgba(255,255,255,0.55)');
      ctx.save(); rr(ctx, 0, 0, w, h - 40 * u, 36 * u); ctx.clip(); draw(ctx, w, h - 40 * u, u, t); ctx.restore();
    },
    px: 720,
  };
}
const xrMain = xrWindow((ctx, w, h, u) => {
  ctx.fillStyle = grad(ctx, 0, 0, w, h, ['#0a3a6b', '#41c3d9']); ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(w * (0.2 + i * 0.16), h * 0.6 + Math.sin(i * 2) * 60 * u, (40 + i * 10) * u, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill(); }
  text(ctx, 'Ocean Worlds · Immersive', 40 * u, 70 * u, { size: 34 * u, weight: 700, font: F });
  fillRR(ctx, 40 * u, h - 80 * u, w - 80 * u, 10 * u, 5 * u, 'rgba(255,255,255,0.25)');
  fillRR(ctx, 40 * u, h - 80 * u, (w - 80 * u) * 0.38, 10 * u, 5 * u, '#fff');
  glyph(ctx, 'pause', w / 2, h / 2, 70 * u, 'rgba(255,255,255,0.9)');
});
const xrGallery = xrWindow((ctx, w, h, u) => {
  text(ctx, 'Gallery', 30 * u, 60 * u, { size: 32 * u, weight: 700, font: F });
  const cols = ['#ff7d90', '#ffd257', '#62a8ff', '#4fe0a0', '#9a7bff', '#ff8a6c', '#28c7ff', '#ff94b8', '#55d8b8'];
  for (let i = 0; i < 9; i++) fillRR(ctx, 30 * u + (i % 3) * (w - 60 * u) / 3, 90 * u + Math.floor(i / 3) * 170 * u, (w - 60 * u) / 3 - 10 * u, 160 * u, 14 * u, grad(ctx, 0, 0, w, h, [cols[i], '#20222c']));
});
const xrAssist = xrWindow((ctx, w, h, u) => {
  ctx.fillStyle = grad(ctx, 0, 0, w, h, ['#1d2147', '#2a1840']); ctx.fillRect(0, 0, w, h);
  glyph(ctx, 'sparkle', 60 * u, 66 * u, 44 * u, '#9ab8ff');
  text(ctx, 'Assistant', 100 * u, 80 * u, { size: 32 * u, weight: 700, font: F });
  fillRR(ctx, 30 * u, 120 * u, w - 60 * u, 120 * u, 24 * u, 'rgba(255,255,255,0.1)');
  text(ctx, 'What reef is this?', 54 * u, 192 * u, { size: 28 * u, font: F });
  text(ctx, 'It looks like the Great', 30 * u, 310 * u, { size: 28 * u, weight: 600, font: F });
  text(ctx, 'Barrier Reef, near Cairns.', 30 * u, 350 * u, { size: 28 * u, weight: 600, font: F });
  fillRR(ctx, 30 * u, h - 110 * u, w - 60 * u, 76 * u, 38 * u, 'rgba(255,255,255,0.14)');
  glyph(ctx, 'mic', w - 80 * u, h - 72 * u, 40 * u, '#fff');
});

// ---- devices ----------------------------------------------------------------------------------------
const devices = [
  {
    name: 'Galaxy S26 Ultra', short: 'S26 Ultra', os: 'One UI 9 · Android 17', year: 2026,
    blurb: 'The flagship slab: flat titanium sides, a centre punch-hole and the lock screen One UI is built around, with a big bold clock and the Now Bar for whatever is live.',
    ui: ['Now Bar: one pill at the bottom of the lock screen for music, timers, rides and workouts', 'Huge, heavy clock and date stacked at the top of the lock screen', 'Now Brief cards summarise the day from the lock screen', 'Rounder squircle icons with soft gradients'],
    build: () => phone({ w: 0.37, h: 0.78, d: 0.03, r: 0.04, color: 0x6f7884, cams: 'galaxy', cut: 'punch', screen: { draw: s26Screen } }),
  },
  {
    name: 'Galaxy Z Fold8 Ultra', short: 'Z Fold8 Ultra', os: 'One UI 9 · Android 17', year: 2026,
    blurb: 'Opened, the Fold is a small tablet: three apps share the screen in rounded windows and a taskbar holds the dock and recent apps.',
    ui: ['Multi-window: drag an app from the taskbar to split the screen up to three ways', 'Each window has a grab handle and rounded corners', 'Taskbar along the bottom with apps and recents', 'Same lock screen and Now Bar as the bar phones when folded'],
    build: () => foldable({ w: 0.36, h: 0.74, d: 0.012, r: 0.03, color: 0x2c2f35, open: Math.PI * 0.84, cams: 'galaxy', screen: { draw: foldScreen } }),
  },
  {
    name: 'Galaxy Z Flip8', short: 'Z Flip8', os: 'One UI 9 · Android 17', year: 2026,
    blurb: 'Half-folded, the Flip stands on its own in Flex mode: the app moves to the top half and its controls drop to the bottom.',
    ui: ['Flex mode splits apps at the hinge: content up top, controls below', 'Camera becomes a hands-free tripod shot', 'FlexWindow cover screen runs widgets and full apps when closed', 'Now Bar and lock clock carry over to the cover screen'],
    fit: [0.7, 0.66],
    build: () => foldable({ w: 0.34, h: 0.8, d: 0.016, r: 0.05, color: 0x8fb6d9, open: Math.PI * 0.62, axis: 'x', cams: 'galaxy', screen: { draw: flipScreen } }),
  },
  {
    name: 'Galaxy Watch', short: 'Watch', os: 'One UI 9 Watch · Wear OS', year: 2026,
    blurb: 'A round watch with a cushion of activity rings, quick complications and the Now Bar, so a run or a timer stays one glance away.',
    ui: ['Now Bar on the watch: live workout or timer pinned at the bottom', 'Bold numerals over coloured activity rings', 'Tiles you swipe through for health, weather and media', 'Gesture shortcuts like double pinch to answer'],
    fit: [0.6, 0.66],
    build: () => watch({ shape: 'round', size: 0.36, color: 0x3a3d42, band: 0x22252c, screen: { draw: watchScreen } }),
  },
  {
    name: 'Galaxy Tab S11 Ultra', short: 'Tab S11 Ultra', os: 'One UI 9 · DeX', year: 2025,
    blurb: 'Samsung DeX turns the big tablet into a desktop: free-floating windows with title bars, a taskbar and a system tray, right on the tablet.',
    ui: ['DeX desktop mode with resizable, overlapping windows', 'Window snapping, including top and bottom halves in One UI 9', 'Taskbar with pinned apps, running indicators and the clock', 'S Pen notes in Samsung Notes alongside any app'],
    build: () => tablet({ w: 0.98, h: 0.62, color: 0x50535a, screen: { draw: dexScreen } }),
  },
  {
    name: 'Galaxy Book6 Pro', short: 'Galaxy Book', os: 'Windows 11 + Galaxy apps', year: 2026,
    blurb: 'The Galaxy laptop leans on continuity: your phone docks into a side panel, Quick Share throws files to any Galaxy device, and one mouse moves across them.',
    ui: ['Phone continuity panel with notifications, photos and calls', 'Quick Share to tablets, phones and TVs nearby', 'Multi Control: one keyboard and mouse across laptop and tablet', 'Galaxy apps (Notes, Gallery, SmartThings) on the desktop'],
    build: () => laptop({ w: 1.0, h: 0.63, color: 0x3a3e46, keys: 0x1a1c21, screen: { draw: bookScreen } }),
  },
  {
    name: 'Neo QLED 8K TV', short: 'Neo QLED TV', os: 'Tizen OS · Vision AI', year: 2026,
    blurb: 'The TV home is a big hero banner over rows of apps and shows, with SmartThings cards for the rest of the home right on the big screen.',
    ui: ['Hero banner with one-press Watch', 'Rounded app tiles in a single scroll row', 'Continue-watching shelf below', 'SmartThings status cards and a Home view of connected devices'],
    build: () => tv({ w: 1.25, h: 0.72, color: 0x15161a, stand: 'pedestal', screen: { draw: tvScreen } }),
  },
  {
    name: 'Galaxy XR', short: 'Galaxy XR', os: 'Android XR · One UI', year: 2025,
    blurb: 'Samsung\'s headset runs Android XR: rounded app windows float around you, each with a grab bar to move it, and the assistant sees what you see.',
    ui: ['Floating, rounded windows you place in your room', 'Grab bar under each window to move or resize it', 'Multimodal assistant that answers about what is in view', 'Full immersive mode for video and photos'],
    fit: [0.95, 0.66],
    build: () => headset({
      color: 0xb9bcc2, visor: 0x0a0b10, strap: 0x3d4048, scale: 0.9,
      windows: [
        { w: 0.86, h: 0.52, screen: xrMain, x: 0, y: 0.12, z: -0.12 },
        { w: 0.38, h: 0.46, screen: xrGallery, x: -0.66, y: 0.1, z: -0.04, ry: 0.4 },
        { w: 0.38, h: 0.46, screen: xrAssist, x: 0.66, y: 0.1, z: -0.04, ry: -0.4 },
      ],
    }),
  },
];

// ---- concept helpers --------------------------------------------------------------------------------
const darkBack = () => new THREE.MeshStandardMaterial({ color: 0x0d0f15, roughness: 0.5, metalness: 0.3 });

// A card: a thin dark slab with a textured face just in front of it.
function card(w, h, r, tex, { depth = 0.012, transparent = false } = {}) {
  const g = new THREE.Group();
  const back = new THREE.Mesh(slabGeo(w, h, depth, r, depth * 0.4), darkBack());
  g.add(back);
  const face = panel(w, h, r, tex, { transparent });
  face.position.z = depth / 2 + 0.0008;
  g.add(face);
  g.userData.face = face;
  return g;
}
const within = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };

// ---- concept 1: Now Bar, stacked --------------------------------------------------------------------
function nowBarConcept() {
  const group = new THREE.Group();
  const KINDS = ['music', 'timer', 'ride', 'weather', 'workout'];
  const order = [0, 1, 2, 3, 4];

  // Lock screen behind the deck.
  const lockTex = canvasTex(540, 1000, (ctx, w, h, t) => {
    lockScreen(ctx, w, h, t, { wall: 0, bar: false });
    strokeRR(ctx, w * 0.07, h * 0.8, w * 0.86, 112, 56, 'rgba(255,255,255,0.25)', 2);
  });
  const lock = card(0.46, 0.84, 0.05, lockTex);
  lock.position.set(-0.42, 0.0, -0.22);
  group.add(lock);

  // Deck cards.
  const cards = KINDS.map((k, i) => {
    const tex = canvasTex(1000, 260, (ctx, w, h, t) => nowBar(ctx, 0, 0, w, h, k, t, { expanded: true }));
    const c = card(0.56, 0.146, 0.073, tex, { depth: 0.01, transparent: true });
    c.userData = { ...c.userData, i, kind: k, tex, hover: 0, pos: new THREE.Vector3(-0.42, -0.3, 0) };
    group.add(c);
    return c;
  });

  // Now Brief on the right: what the front card is about, plus the day.
  const briefTex = canvasTex(820, 900, (ctx, w, h, t) => {
    const u = w / 820, k = KINDS[order[0]], L = LIVE[k];
    fillRR(ctx, 0, 0, w, h, 48 * u, 'rgba(14,16,24,0.92)');
    glyph(ctx, 'sparkle', 54 * u, 66 * u, 34 * u, BLUE);
    text(ctx, 'Now Brief', 86 * u, 78 * u, { size: 36 * u, weight: 700, font: F });
    text(ctx, 'Good evening · ' + dateStr(false), 40 * u, 130 * u, { size: 24 * u, color: 'rgba(255,255,255,0.65)', font: F });
    // Focus card for the front activity
    fillRR(ctx, 30 * u, 160 * u, w - 60 * u, 300 * u, 36 * u, grad(ctx, 30 * u, 160 * u, w, 460 * u, L.color));
    glyph(ctx, L.icon, 100 * u, 240 * u, 70 * u, '#fff');
    let big = L.title;
    if (k === 'timer') big = liveValue('timer', t) + ' left';
    if (k === 'ride') big = `${liveValue('ride', t)} min away`;
    if (k === 'workout') big = `${liveValue('workout', t)} bpm`;
    if (k === 'music') big = 'Now playing';
    text(ctx, big, 60 * u, 360 * u, { size: 56 * u, weight: 700, font: F });
    text(ctx, k === 'music' ? L.title + ' · M83' : L.sub, 60 * u, 410 * u, { size: 26 * u, weight: 500, color: 'rgba(255,255,255,0.88)', font: F });
    briefCard(ctx, 30 * u, 490 * u, (w - 75 * u) / 2, 190 * u, 'Next up', ['Design review', '9:00 AM · Room 4B'], u);
    briefCard(ctx, 45 * u + (w - 75 * u) / 2, 490 * u, (w - 75 * u) / 2, 190 * u, 'Tomorrow', ['68° and sunny', 'Leave by 8:10'], u, '#ffd257');
    briefCard(ctx, 30 * u, 700 * u, w - 60 * u, 170 * u, 'Live on the Now Bar', [KINDS.map((x) => LIVE[x].title.split(' ')[0]).join(' · ')], u, '#4fe0a0');
  });
  const brief = card(0.6, 0.66, 0.05, briefTex);
  brief.position.set(0.42, 0.02, -0.08);
  brief.rotation.y = -0.12;
  group.add(brief);

  let fan = 0, fanHold = 0, clock = 0, hovered = null;
  const targets = cards.map((c) => c.userData.face);

  return {
    group, targets,
    update(dt, t, hit) {
      hovered = hit ? cards.find((c) => within(hit.object, c)) || null : null;
      fanHold = hovered ? 0.7 : Math.max(0, fanHold - dt);
      fan = damp(fan, fanHold > 0 ? 1 : 0, 7, dt);
      order.forEach((ci, k) => {
        const c = cards[ci], ud = c.userData;
        ud.hover = damp(ud.hover, c === hovered ? 1 : 0, 10, dt);
        const sx = -0.42, sy = -0.29 + k * 0.03, sz = 0.13 - k * 0.055;
        const fx = -0.42 + k * 0.015, fy = -0.3 + k * 0.152, fz = 0.13 - k * 0.04;
        c.position.set(damp(c.position.x, lerp(sx, fx, fan), 9, dt), damp(c.position.y, lerp(sy, fy, fan), 9, dt), damp(c.position.z, lerp(sz, fz, fan) + ud.hover * 0.05, 9, dt));
        const s = lerp(1 - k * 0.05, 1, fan) * (1 + ud.hover * 0.04);
        c.scale.setScalar(damp(c.scale.x, s, 9, dt));
        c.rotation.x = damp(c.rotation.x, lerp(-0.1 * k, 0, fan), 9, dt);
      });
      clock += dt;
      if (clock > 0.5) { clock = 0; cards.forEach((c) => c.userData.tex.redraw(t)); briefTex.redraw(t); lockTex.redraw(t); }
    },
    click(hit) {
      const c = hit && cards.find((x) => within(hit.object, x));
      if (!c) return;
      const i = c.userData.i, at = order.indexOf(i);
      if (at === 0) order.push(order.shift()); else { order.splice(at, 1); order.unshift(i); }
      briefTex.redraw();
    },
  };
}

// ---- concept 2: Edge panels in depth ----------------------------------------------------------------
function edgeConcept() {
  const group = new THREE.Group();
  const homeTex = canvasTex(1664, 1024, (ctx, w, h, t) => {
    wallpaper(ctx, w, h, 2);
    const u = h / 1024;
    statusBar(ctx, w, 44 * u, { size: 26 * u, font: F, pad: 44 * u });
    text(ctx, clockStr(), 70 * u, 230 * u, { size: 150 * u, weight: 700, font: F });
    text(ctx, dateStr(true), 76 * u, 290 * u, { size: 34 * u, weight: 600, font: F });
    briefCard(ctx, 70 * u, 340 * u, 520 * u, 200 * u, 'Now Brief', ['Design review at 9:00', 'Commute 24 min'], u);
    APPS.slice(0, 12).forEach(([n], i) => icon(ctx, 720 * u + (i % 6) * 150 * u, 200 * u + Math.floor(i / 6) * 190 * u, 104 * u, n, n));
    fillRR(ctx, 520 * u, h - 170 * u, w - 1040 * u, 140 * u, 70 * u, 'rgba(255,255,255,0.18)');
    ['Phone', 'Messages', 'Internet', 'Camera'].forEach((n, i) => icon(ctx, 580 * u + i * 150 * u, h - 150 * u, 100 * u, n));
  });
  const home = card(1.3, 0.8, 0.05, homeTex);
  home.position.set(-0.06, 0, -0.24);
  group.add(home);

  // The Edge handle on the right edge of the home screen.
  const handleTex = canvasTex(64, 400, (ctx, w, h) => { fillRR(ctx, 8, 0, w - 16, h, (w - 16) / 2, 'rgba(255,255,255,0.75)'); });
  const handle = panel(0.032, 0.2, 0.016, handleTex, { transparent: true });
  handle.position.set(0.56, 0.16, -0.205);
  const handleHit = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
  handleHit.position.copy(handle.position).setZ(-0.2);
  group.add(handle, handleHit);

  // Panels: each lists items in a grid; layout() returns cells in canvas pixels for drawing and hit tests.
  const PW = 516, PH = 1200;
  const PANELS = [
    { title: 'Apps', cols: 2, items: ['Phone', 'Messages', 'Internet', 'Camera', 'Gallery', 'Notes', 'Calendar', 'Clock', 'Music', 'Maps'].map((n) => ({ label: n, app: n })) },
    { title: 'People', cols: 1, items: [['Ava Kim', '#ff7d90'], ['Mateo Ruiz', '#62a8ff'], ['Priya Shah', '#4fe0a0'], ['Leo Park', '#ffd257'], ['Nora Hill', '#9a7bff']].map(([n, c]) => ({ label: n, color: c })) },
    { title: 'Tools', cols: 2, items: [['Compass', 'map'], ['Ruler', 'note'], ['Flashlight', 'flash'], ['Counter', 'plus'], ['Scanner', 'camera'], ['Level', 'grid'], ['Timer', 'clock'], ['Recorder', 'mic']].map(([n, g]) => ({ label: n, glyph: g })) },
    { title: 'Clipboard', cols: 1, items: ['Gate B12 · Flight 2617', 'kyoto-ryokan.jpg', 'Wi-Fi: Hillhouse-5G', 'Meeting notes, Q4'].map((s) => ({ label: s })) },
  ];
  function layout(p) {
    const top = 150, pad = 26, cw = (PW - pad * 2) / p.cols, rh = p.cols === 2 ? 200 : (PH - top - 40) / p.items.length;
    return p.items.map((it, i) => ({ ...it, x: pad + (i % p.cols) * cw, y: top + Math.floor(i / p.cols) * rh, w: cw, h: rh }));
  }
  const panels = PANELS.map((p, pi) => {
    const tex = canvasTex(PW, PH, (ctx, w, h) => {
      fillRR(ctx, 0, 0, w, h, 50, 'rgba(26,28,38,0.94)');
      strokeRR(ctx, 2, 2, w - 4, h - 4, 48, 'rgba(255,255,255,0.12)', 3);
      text(ctx, p.title, 32, 86, { size: 44, weight: 700, font: F });
      fillRR(ctx, 32, 106, 56, 6, 3, BLUE);
      for (const c of layout(p)) {
        if (pi === 0) icon(ctx, c.x + c.w / 2 - 52, c.y + 10, 104, c.app, c.label);
        else if (pi === 1) {
          ctx.beginPath(); ctx.arc(c.x + 70, c.y + c.h / 2, 52, 0, Math.PI * 2); ctx.fillStyle = c.color; ctx.fill();
          text(ctx, c.label.split(' ').map((s) => s[0]).join(''), c.x + 70, c.y + c.h / 2 + 14, { size: 38, weight: 700, align: 'center', font: F });
          text(ctx, c.label, c.x + 140, c.y + c.h / 2 + 12, { size: 32, weight: 600, font: F });
        } else if (pi === 2) {
          ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + 62, 56, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
          glyph(ctx, c.glyph, c.x + c.w / 2, c.y + 62, 52, '#cfe0ff');
          text(ctx, c.label, c.x + c.w / 2, c.y + 160, { size: 28, weight: 500, align: 'center', font: F });
        } else {
          fillRR(ctx, c.x, c.y + 10, c.w, c.h - 24, 30, 'rgba(255,255,255,0.08)');
          if (c.label.endsWith('.jpg')) fillRR(ctx, c.x + 24, c.y + 34, c.w - 48, c.h - 120, 18, grad(ctx, 0, c.y, 0, c.y + c.h, ['#ff9f7a', '#6fb2ff']));
          text(ctx, c.label, c.x + 28, c.y + c.h - 48, { size: 28, weight: 600, font: F });
        }
      }
    });
    const c = card(0.3, 0.7, 0.05, tex, { depth: 0.012, transparent: true });
    c.userData = { ...c.userData, pi, p, tex, open: new Spring(0, 120, 16), hover: 0 };
    c.visible = false;
    group.add(c);
    return c;
  });

  // The launched window.
  let winItem = null;
  const winTex = canvasTex(1152, 736, (ctx, w, h) => {
    if (!winItem) return;
    const u = h / 736, { pi, item } = winItem;
    fillRR(ctx, 0, 0, w, h, 44 * u, '#f6f7fb');
    fillRR(ctx, w / 2 - 50 * u, 14 * u, 100 * u, 9 * u, 5 * u, 'rgba(0,0,0,0.2)');
    const appName = pi === 0 ? item.app : pi === 1 ? 'Messages' : pi === 2 ? 'Settings' : 'Notes';
    icon(ctx, 34 * u, 40 * u, 64 * u, appName);
    text(ctx, pi === 1 ? item.label : pi === 3 ? 'Pasted from Clipboard' : item.label, 116 * u, 86 * u, { size: 38 * u, weight: 700, color: '#141821', font: F });
    const by = 140 * u;
    if (pi === 1) {
      fillRR(ctx, 40 * u, by + 20 * u, 520 * u, 80 * u, 40 * u, '#e5e8f0'); text(ctx, 'Are we still on for tonight?', 70 * u, by + 72 * u, { size: 28 * u, color: '#1b1f29', font: F });
      fillRR(ctx, w - 520 * u, by + 130 * u, 480 * u, 80 * u, 40 * u, BLUE); text(ctx, 'Yes! 7:30 at the usual', w - 490 * u, by + 182 * u, { size: 28 * u, color: '#fff', font: F });
      fillRR(ctx, 40 * u, h - 120 * u, w - 80 * u, 80 * u, 40 * u, '#e9ebf2'); text(ctx, 'Message', 80 * u, h - 68 * u, { size: 28 * u, color: '#8a90a0', font: F });
    } else if (pi === 3) {
      fillRR(ctx, 40 * u, by, w - 80 * u, h - by - 40 * u, 28 * u, '#fff');
      text(ctx, item.label, 80 * u, by + 80 * u, { size: 40 * u, weight: 700, color: '#141821', font: F });
      lines(ctx, 80 * u, by + 120 * u, w - 160 * u, 8, u, 'rgba(20,24,33,0.14)', 44);
    } else {
      const [, , cols] = app(appName);
      ctx.fillStyle = grad(ctx, 0, by, w, h, [cols[0], cols[1]]); ctx.fillRect(0, by, w, h - by);
      glyph(ctx, pi === 2 ? item.glyph : app(appName)[1], w / 2, by + (h - by) / 2 - 30 * u, 200 * u, 'rgba(255,255,255,0.92)');
      text(ctx, item.label, w / 2, h - 70 * u, { size: 40 * u, weight: 700, align: 'center', font: F });
    }
  });
  const win = card(0.78, 0.5, 0.045, winTex, { depth: 0.016 });
  win.visible = false;
  win.userData = { ...win.userData, s: new Spring(0, 140, 15), from: new THREE.Vector3(), open: false };
  group.add(win);

  let isOpen = false;
  const toggle = (v = !isOpen) => {
    isOpen = v;
    panels.forEach((p, i) => { p.userData.open.to = v ? 1 : 0; p.userData.delay = v ? i * 0.07 : (panels.length - 1 - i) * 0.04; });
  };
  const targets = [handleHit, ...panels.map((p) => p.userData.face), win.userData.face];

  return {
    group, targets,
    enter() { if (!isOpen) setTimeout(() => toggle(true), 450); },
    update(dt, t, hit) {
      const hp = hit ? panels.find((p) => within(hit.object, p)) : null;
      handle.scale.x = damp(handle.scale.x, hit?.object === handleHit ? 1.6 : 1, 10, dt);
      panels.forEach((p, i) => {
        const ud = p.userData;
        if (ud.delay > 0) ud.delay -= dt; else ud.open.step(dt);
        const o = clamp(ud.open.v, 0, 1.15);
        ud.hover = damp(ud.hover, p === hp ? 1 : 0, 10, dt);
        p.visible = o > 0.01;
        const tx = 0.5 - i * 0.27, tz = 0.1 - i * 0.07;
        p.position.set(lerp(0.6, tx, o), 0.0 + ud.hover * 0.02, lerp(-0.2, tz, o) + ud.hover * 0.06);
        p.rotation.y = lerp(-1.2, -0.28, clamp(o, 0, 1));
        p.scale.setScalar(Math.max(0.001, lerp(0.3, 1, clamp(o, 0, 1.1))) * (1 + ud.hover * 0.04));
      });
      const ws = win.userData.s.step(dt);
      win.visible = ws > 0.02;
      const k = clamp(ws, 0, 1.2);
      win.position.lerpVectors(win.userData.from, new THREE.Vector3(-0.2, 0.04, 0.15), clamp(k, 0, 1));
      win.scale.setScalar(Math.max(0.001, lerp(0.12, 1, k)));
    },
    click(hit) {
      if (!hit) { if (win.userData.open) { win.userData.open = false; win.userData.s.to = 0; } return; }
      if (hit.object === handleHit) { toggle(); return; }
      if (hit.object === win.userData.face) { win.userData.open = false; win.userData.s.to = 0; return; }
      const p = panels.find((x) => within(hit.object, x));
      if (!p || !hit.uv) return;
      const px = hit.uv.x * PW, py = (1 - hit.uv.y) * PH;
      const item = layout(p.userData.p).find((c) => px >= c.x && px < c.x + c.w && py >= c.y && py < c.y + c.h);
      if (!item) return;
      winItem = { pi: p.userData.pi, item };
      winTex.redraw();
      win.userData.from.copy(hit.point);
      group.worldToLocal(win.userData.from);
      win.userData.s.v = 0; win.userData.s.vel = 0; win.userData.s.to = 1; win.userData.open = true;
    },
  };
}

// ---- concept 3: SmartThings Map 3D -------------------------------------------------------------------
function smartThingsConcept() {
  const group = new THREE.Group();
  const tilt = new THREE.Group(); tilt.position.set(-0.04, -0.1, -0.1); tilt.rotation.x = 0.88; tilt.scale.setScalar(0.88); group.add(tilt);
  const spin = new THREE.Group(); spin.rotation.y = -0.32; tilt.add(spin);
  const PW = 1.04, PD = 0.6;
  // Rooms in plan coordinates: x across, z toward the viewer.
  const ROOMS = [
    { name: 'Living room', x0: -0.52, x1: 0.04, z0: -0.04, z1: 0.3, c: '#26324d' },
    { name: 'Kitchen', x0: 0.04, x1: 0.52, z0: 0.0, z1: 0.3, c: '#2c2f45' },
    { name: 'Bedroom', x0: -0.52, x1: -0.1, z0: -0.3, z1: -0.04, c: '#2a2846' },
    { name: 'Office', x0: -0.1, x1: 0.24, z0: -0.3, z1: -0.04, c: '#243a44' },
    { name: 'Laundry', x0: 0.24, x1: 0.52, z0: -0.3, z1: 0.0, c: '#2e3340' },
  ];
  const floorTex = canvasTex(1040, 600, (ctx, w, h) => {
    ctx.fillStyle = '#121624'; ctx.fillRect(0, 0, w, h);
    const X = (x) => (x / PW + 0.5) * w, Z = (z) => (z / PD + 0.5) * h;
    for (const r of ROOMS) {
      fillRR(ctx, X(r.x0) + 4, Z(r.z0) + 4, X(r.x1) - X(r.x0) - 8, Z(r.z1) - Z(r.z0) - 8, 14, r.c);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
      for (let gx = X(r.x0) + 30; gx < X(r.x1); gx += 30) { ctx.beginPath(); ctx.moveTo(gx, Z(r.z0) + 6); ctx.lineTo(gx, Z(r.z1) - 6); ctx.stroke(); }
      text(ctx, r.name, X(r.x0) + 22, Z(r.z0) + 44, { size: 26, weight: 700, color: 'rgba(255,255,255,0.75)', font: F });
    }
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), new THREE.MeshBasicMaterial({ map: floorTex, toneMapped: false }));
  floor.rotation.x = -Math.PI / 2; spin.add(floor);
  const base = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.02, 0.025, PD + 0.02), darkBack());
  base.position.y = -0.0135; spin.add(base);
  // Low walls around each room.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ff, roughness: 0.4, transparent: true, opacity: 0.55 });
  const WH = 0.05, WT = 0.007;
  for (const r of ROOMS) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    for (const [px, pz, sx, sz] of [[(r.x0 + r.x1) / 2, r.z0, w, WT], [(r.x0 + r.x1) / 2, r.z1, w * (r.z1 >= 0.29 ? 0.35 : 1), WT], [r.x0, (r.z0 + r.z1) / 2, WT, d], [r.x1, (r.z0 + r.z1) / 2, WT, d]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, WH * (pz >= 0.29 ? 0.4 : 1), sz), wallMat);
      m.position.set(px, WH * (pz >= 0.29 ? 0.4 : 1) / 2, pz); spin.add(m);
    }
  }

  // Devices.
  const warm = new THREE.Color('#ffcf7a'), cool = new THREE.Color('#7ac8ff');
  const glowTex = canvasTex(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const DEV = [
    { id: 'light', name: 'Ceiling light', room: 'Living room', icon: 'bulb', x: -0.3, z: 0.12, on: true, kind: 'light', color: warm, unit: '80%' },
    { id: 'tv', name: 'Neo QLED TV', room: 'Living room', icon: 'tv', x: -0.24, z: -0.02, on: false, kind: 'tv', unit: 'Ocean Worlds' },
    { id: 'vac', name: 'Robot vacuum', room: 'Living room', icon: 'home', x: -0.1, z: 0.2, on: true, kind: 'vac', unit: 'Cleaning · 62%' },
    { id: 'ac', name: 'Air conditioner', room: 'Bedroom', icon: 'thermo', x: -0.32, z: -0.2, on: false, kind: 'ac', color: cool, unit: 'Cool · 70°' },
    { id: 'klight', name: 'Pendant lights', room: 'Kitchen', icon: 'bulb', x: 0.3, z: 0.14, on: false, kind: 'light', color: warm, unit: '100%' },
    { id: 'lamp', name: 'Desk lamp', room: 'Office', icon: 'bulb', x: 0.06, z: -0.18, on: true, kind: 'light', color: new THREE.Color('#fff2d6'), unit: '60%' },
    { id: 'washer', name: 'Washer', room: 'Laundry', icon: 'gear', x: 0.4, z: -0.18, on: true, kind: 'washer', unit: 'Rinse · 22 min' },
  ];
  const chipTargets = [];
  for (const d of DEV) {
    const g = new THREE.Group(); g.position.set(d.x, 0, d.z); spin.add(g); d.g = g;
    // floor glow
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: glowTex, color: d.color || 0x6fa8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    gl.rotation.x = -Math.PI / 2; gl.position.y = 0.002; g.add(gl); d.glow = gl;
    if (d.kind === 'light') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.02, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: d.color, emissiveIntensity: 0 }));
      m.position.y = 0.075; g.add(m); d.obj = m;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.04, 6), wallMat); cord.position.y = 0.1; g.add(cord);
    } else if (d.kind === 'tv') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.095, 0.008), new THREE.MeshStandardMaterial({ color: 0x0b0c10, emissive: 0x2a8cff, emissiveIntensity: 0 }));
      m.position.y = 0.065; g.add(m); d.obj = m;
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), darkBack()); st.position.y = 0.01; g.add(st);
    } else if (d.kind === 'vac') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.014, 32), new THREE.MeshStandardMaterial({ color: 0x23262e, metalness: 0.4, roughness: 0.35 }));
      m.position.y = 0.008; g.add(m); d.obj = m;
      const led = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.016, 12), new THREE.MeshBasicMaterial({ color: 0x4fe0a0 })); led.position.y = 0.009; led.position.z = 0.018; m.add(led);
    } else if (d.kind === 'ac') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.03), new THREE.MeshStandardMaterial({ color: 0xf2f4f8, emissive: 0x4aa8ff, emissiveIntensity: 0 }));
      m.position.set(0, 0.06, -0.06); g.add(m); d.obj = m;
    } else if (d.kind === 'washer') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.07), new THREE.MeshStandardMaterial({ color: 0xe9ecf2, roughness: 0.4 }));
      m.position.y = 0.04; g.add(m);
      const drum = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 8, 24), new THREE.MeshStandardMaterial({ color: 0x8aa0c0, metalness: 0.6, roughness: 0.3 }));
      drum.position.set(0, 0.04, 0.036); g.add(drum); d.obj = drum;
    }
    // Floating chip, kept facing the viewer.
    const chipTex = canvasTex(160, 160, (ctx, w, h) => {
      ctx.beginPath(); ctx.arc(80, 80, 74, 0, Math.PI * 2); ctx.fillStyle = d.on ? '#ffffff' : 'rgba(30,33,44,0.92)'; ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = d.on ? BLUE : 'rgba(255,255,255,0.35)'; ctx.stroke();
      glyph(ctx, d.icon, 80, 80, 74, d.on ? BLUE : '#cfd6e6');
    });
    const chip = panel(0.055, 0.055, 0.0275, chipTex, { transparent: true });
    chip.position.y = 0.16; g.add(chip);
    chip.userData.dev = d; d.chip = chip; d.chipTex = chipTex; d.hover = 0;
    chipTargets.push(chip);
  }

  // Header card and the floating control card.
  const onCount = () => DEV.filter((d) => d.on).length;
  const headTex = canvasTex(900, 220, (ctx, w, h) => {
    fillRR(ctx, 0, 0, w, h, 60, 'rgba(18,20,30,0.94)');
    icon(ctx, 34, 40, 140, 'SmartThings');
    text(ctx, 'SmartThings · Home', 204, 100, { size: 46, weight: 700, font: F });
    text(ctx, `${onCount()} of ${DEV.length} devices on · Map View`, 204, 158, { size: 32, color: 'rgba(255,255,255,0.7)', font: F });
  });
  const head = card(0.5, 0.122, 0.05, headTex);
  head.position.set(-0.52, 0.34, 0.02); group.add(head);

  let sel = DEV[2];
  const ctlTex = canvasTex(800, 440, (ctx, w, h) => {
    const d = sel;
    fillRR(ctx, 0, 0, w, h, 56, 'rgba(246,247,251,0.97)');
    ctx.beginPath(); ctx.arc(90, 96, 56, 0, Math.PI * 2); ctx.fillStyle = d.on ? BLUE : '#c8ccd6'; ctx.fill();
    glyph(ctx, d.icon, 90, 96, 60, '#fff');
    text(ctx, d.name, 170, 92, { size: 44, weight: 700, color: '#141821', font: F });
    text(ctx, d.room, 170, 136, { size: 30, color: '#5b6272', font: F });
    text(ctx, d.on ? d.unit : 'Off', 44, 250, { size: 54, weight: 700, color: d.on ? '#141821' : '#8a90a0', font: F });
    // toggle
    fillRR(ctx, w - 210, 196, 160, 84, 42, d.on ? BLUE : '#c8ccd6');
    ctx.beginPath(); ctx.arc(d.on ? w - 92 : w - 168, 238, 34, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    fillRR(ctx, 44, 330, w - 88, 60, 30, '#e7e9f0');
    fillRR(ctx, 44, 330, (w - 88) * (d.on ? 0.7 : 0.08), 60, 30, d.on ? '#9fc2ff' : '#d5d8e0');
    text(ctx, 'Tap the device or this card to switch it', w / 2, 372, { size: 24, color: '#3a4152', align: 'center', font: F });
  });
  const ctl = card(0.4, 0.22, 0.05, ctlTex, { depth: 0.012 });
  group.add(ctl);
  ctl.position.set(0.56, 0.28, 0.1);
  // Leader line from the card to the selected device.
  const leadGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const lead = new THREE.Line(leadGeo, new THREE.LineBasicMaterial({ color: 0x9fc2ff, transparent: true, opacity: 0.8 }));
  lead.frustumCulled = false; group.add(lead);
  const _w = new THREE.Vector3();

  const toggle = (d) => { d.on = !d.on; d.chipTex.redraw(); headTex.redraw(); if (d === sel) ctlTex.redraw(); };
  let yaw = -0.32, dragYaw = null;
  const targets = [...chipTargets, ctl.userData.face];

  return {
    group, targets,
    update(dt, t, hit) {
      const hd = hit?.object?.userData?.dev || null;
      spin.rotation.y = damp(spin.rotation.y, yaw, 6, dt);
      spin.updateMatrixWorld(true);
      const sq = new THREE.Quaternion(); spin.getWorldQuaternion(sq);
      for (const d of DEV) {
        d.hover = damp(d.hover, d === hd ? 1 : 0, 10, dt);
        d.chip.quaternion.copy(sq).invert();
        d.chip.position.y = 0.16 + d.hover * 0.02 + Math.sin(t * 1.5 + d.x * 10) * 0.004;
        d.chip.scale.setScalar(1 + d.hover * 0.25 + (d === sel ? 0.12 : 0));
        const on = d.on ? 1 : 0;
        d.glow.material.opacity = damp(d.glow.material.opacity, on * (d.kind === 'light' ? 0.85 : d.kind === 'ac' ? 0.5 + 0.2 * Math.sin(t * 3) : 0.35), 6, dt);
        if (d.kind === 'light') d.obj.material.emissiveIntensity = damp(d.obj.material.emissiveIntensity, on * 2.2, 6, dt);
        if (d.kind === 'tv' || d.kind === 'ac') d.obj.material.emissiveIntensity = damp(d.obj.material.emissiveIntensity, on * 1.4, 6, dt);
        if (d.kind === 'vac' && d.on) {
          const a = t * 0.5;
          d.g.position.set(-0.24 + Math.sin(a) * 0.2, 0, 0.13 + Math.sin(a * 2.1) * 0.1);
          d.obj.rotation.y += dt * 2;
        }
        if (d.kind === 'washer' && d.on) d.obj.rotation.z += dt * 6;
      }
      // Control card stays top-right; a leader line runs from it to the selected device.
      sel.chip.getWorldPosition(_w); group.worldToLocal(_w);
      const lp = leadGeo.attributes.position;
      lp.setXYZ(0, ctl.position.x - 0.12, ctl.position.y - 0.11, ctl.position.z); lp.setXYZ(1, _w.x, _w.y + 0.03, _w.z); lp.needsUpdate = true;
      ctl.scale.setScalar(damp(ctl.scale.x, hit?.object === ctl.userData.face ? 1.04 : 1, 10, dt));
    },
    click(hit) {
      if (!hit) return;
      if (hit.object === ctl.userData.face) { toggle(sel); return; }
      const d = hit.object.userData.dev;
      if (!d) return;
      if (d === sel) toggle(d); else { sel = d; ctlTex.redraw(); }
    },
    drag(dx) { if (dragYaw === null) dragYaw = yaw; yaw = clamp(dragYaw + dx * 0.003, -0.75, 0.1); },
    dragEnd() { dragYaw = null; },
  };
}

export default {
  id: 'samsung',
  name: 'Samsung',
  accent: '#4c8dff',
  glow: '#3b6cff',
  lang: 'One UI 9',
  langBlurb: 'One UI puts content at the top and controls within thumb reach, with bold rounded type, soft squircle icons and frosted cards. One UI 9 keeps the 8.5 look and builds on the Now Bar and Now Brief, which surface live activities and a daily summary from the lock screen.',
  devices,
  concepts: [
    {
      name: 'Now Bar, stacked', short: 'Now Bar stack', tagline: 'Live activities as a deck of cards in depth',
      blurb: 'On a phone the Now Bar shows one live activity at a time. Here the lock screen sits behind the glass and every live activity is a card in a deck in front of it, nearest first, so the others are visible behind it.',
      points: ['The front card is the live activity, as on the phone', 'Hover fans the deck so you can see every card', 'Now Brief floats to the right and follows whichever card is in front', 'Cards update live: music progress, a timer, a ride ETA, heart rate'],
      how: 'Hover the deck to fan it out. Click the front card to send it to the back, or click any other card to bring it to the front.',
      hint: 'Hover the Now Bar deck, click a card',
      build: nowBarConcept,
    },
    {
      name: 'Edge Panels in depth', short: 'Edge panels', tagline: 'The Edge handle opens a fan of panels in front of the screen',
      blurb: 'Edge panels normally slide in flat from the side of the screen. Here the handle opens four panels (Apps, People, Tools, Clipboard) that fan out of the right edge toward you, and an item launches as a window in front of the home screen.',
      points: ['The home screen stays put behind the glass', 'Panels are spread out in depth, so all four are visible at once', 'Hover a panel to bring it closer', 'Launched windows start at the item you clicked and settle in front of the screen'],
      how: 'Click the white handle on the right to open or close the panels. Click any app, person, tool or clip to open it; click the window to close it.',
      hint: 'Click the Edge handle, then any item',
      build: edgeConcept,
    },
    {
      name: 'SmartThings Map 3D', short: 'SmartThings map', tagline: 'A floor plan of the home with live devices on it',
      blurb: 'SmartThings Map View already shows a home as a floor plan. Here the plan is a 3D model tilted under the glass, each device has an icon floating above it, and a control card follows the device you select.',
      points: ['Rooms, walls and devices are modelled in 3D', 'Lights light up the floor and the TV screen turns on', 'The robot vacuum moves around the living room while it runs', 'Drag sideways to rotate the plan'],
      how: 'Click a device icon to select it; click it again (or the card) to switch it on or off. Drag to rotate the home.',
      hint: 'Click a device icon, drag to rotate',
      build: smartThingsConcept,
    },
  ],
};
