// Google: Material 3 Expressive on Pixel, Wear OS, ChromeOS, Google TV, Nest and Android XR, plus
// three spatial concepts that take Material's elevation, shape and Gemini ideas into real depth.

import * as THREE from 'three';
import { FONT, text, fillRR, rr, blobs, statusBar, glyph, canvasTex, panel, clockStr, Spring, damp, lerp, clamp, ease } from '../kit.js';
import { phone, foldable, watch, tablet, laptop, streamer, hub } from '../devices.js';

const F = FONT.google;

// Dark dynamic-colour scheme (blue seed), Material 3 tonal roles.
const C = {
  bg: '#111318', sc: '#1d2024', sch: '#272a2f', schh: '#32353a',
  on: '#e2e2e9', onv: '#c4c6d0', out: '#8e9099',
  pri: '#a8c8ff', onPri: '#05305f', priC: '#264777', onPriC: '#d5e3ff',
  sec: '#bdc7dc', secC: '#3d4758', onSecC: '#d9e3f8',
  ter: '#dbbce1', terC: '#563e5c', onTerC: '#f8d8fe',
  grn: '#9cd67e', grnC: '#2a4f1c',
};
const GEM = ['#4b8bff', '#8f6df0', '#d66a9a', '#5ec2f2'];

// ---- 2D helpers -----------------------------------------------------------------------------------------
const T = (ctx, s, x, y, size, weight = 500, color = C.on, align = 'left', o = {}) => text(ctx, s, x, y, { size, weight, color, align, font: F, ...o });
const shortDate = () => new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function wrapText(ctx, str, x, y, maxW, lineH, size, weight = 400, color = C.onv, maxLines = 9) {
  ctx.save(); ctx.font = `${weight} ${size}px ${F}`;
  const words = str.split(' '); let line = '', n = 0;
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (ctx.measureText(test).width > maxW && line) {
      T(ctx, line, x, y + n * lineH, size, weight, color); line = wd; if (++n >= maxLines) { ctx.restore(); return n; }
    } else line = test;
  }
  if (line) { T(ctx, line, x, y + n * lineH, size, weight, color); n++; }
  ctx.restore();
  return n;
}

// Polar radius for Material's expressive shape library (1 = circle).
function shapeR(kind, th) {
  switch (kind) {
    case 'cookie': return 0.95 + 0.06 * Math.cos(9 * th);
    case 'sunny': return 0.96 + 0.045 * Math.cos(12 * th);
    case 'clover': return 0.9 + 0.12 * Math.cos(4 * th);
    case 'squircle': { const n = 4; return 0.86 * (Math.abs(Math.cos(th)) ** n + Math.abs(Math.sin(th)) ** n) ** (-1 / n); }
    case 'pill': { const n = 2.4; return 0.8 * ((Math.abs(Math.cos(th)) / 1.15) ** n + (Math.abs(Math.sin(th)) / 0.82) ** n) ** (-1 / n); }
    default: return 1;
  }
}
function shapePath(ctx, cx, cy, r, a = 'circle', b = a, m = 0, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i <= 144; i++) {
    const th = (i / 144) * Math.PI * 2, rr2 = r * lerp(shapeR(a, th - rot), shapeR(b, th - rot), m);
    const x = cx + Math.cos(th) * rr2, y = cy + Math.sin(th) * rr2;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function fillShape(ctx, cx, cy, r, kind, fill, rot = 0) { shapePath(ctx, cx, cy, r, kind, kind, 0, rot); ctx.fillStyle = fill; ctx.fill(); }

// Themed (monochrome, tonal) launcher icon.
function themed(ctx, name, cx, cy, r, kind = 'circle', bg = C.priC, fg = C.onPriC) {
  fillShape(ctx, cx, cy, r, kind, bg);
  glyph(ctx, name, cx, cy, r * 0.95, fg, r * 0.09);
}
function pill(ctx, x, y, w, h, fill) { fillRR(ctx, x, y, w, h, h / 2, fill); }

// A little landscape "photo" (gradient sky + layered hills), used for cards and posters.
function scene2d(ctx, x, y, w, h, sky = ['#ffb36b', '#e0637a', '#55396f'], hills = ['#3b2a52', '#26203c', '#16142a'], sun = true) {
  ctx.save(); rr(ctx, x, y, w, h, 0); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  sky.forEach((c, i) => g.addColorStop(i / (sky.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (sun) { ctx.fillStyle = 'rgba(255,240,210,0.9)'; ctx.beginPath(); ctx.arc(x + w * 0.68, y + h * 0.48, h * 0.12, 0, Math.PI * 2); ctx.fill(); }
  hills.forEach((c, i) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y + h);
    const base = y + h * (0.55 + i * 0.13);
    for (let k = 0; k <= 24; k++) { const px = x + (k / 24) * w; ctx.lineTo(px, base - Math.sin(k * 0.7 + i * 2.1) * h * 0.07 - Math.sin(k * 0.23 + i) * h * 0.08); }
    ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  });
  ctx.restore();
}
const SCENES = [
  [['#ffb36b', '#e0637a', '#55396f'], ['#3b2a52', '#26203c', '#16142a']],
  [['#8fd3ff', '#5a9be0', '#2d4f8a'], ['#2f5e6e', '#1f4552', '#11303a']],
  [['#c3f0d1', '#6cc3a0', '#2b6f63'], ['#2d5a46', '#1d4434', '#112d22']],
  [['#ffe2a8', '#f6a96b', '#b0573f'], ['#8a4a36', '#5e2f25', '#381a15']],
  [['#d9c8ff', '#9a84e6', '#4c3c8f'], ['#3f3170', '#2a2152', '#181338']],
  [['#ffd0dc', '#f48fb1', '#8e4a7c'], ['#6a3159', '#47223f', '#2a1426']],
];
function photo(ctx, i, x, y, w, h, sun = true) { const s = SCENES[i % SCENES.length]; scene2d(ctx, x, y, w, h, s[0], s[1], sun); }

// ---- device screens --------------------------------------------------------------------------------------
function pixelHome(ctx, w, h) {
  const u = w / 100;
  blobs(ctx, w, h, '#12172a', [[0.15, 0.12, 0.55, '#36508a'], [0.95, 0.45, 0.55, '#5b3f74'], [0.2, 0.95, 0.6, '#1f4a6e']]);
  statusBar(ctx, w, 7 * u, { font: F, size: 3.8 * u, pad: 7 * u });
  // At a Glance
  T(ctx, shortDate(), 8 * u, 24 * u, 6 * u, 500, '#fff');
  glyph(ctx, 'sun', 10.5 * u, 31.5 * u, 5 * u, '#ffd58a');
  T(ctx, '64°F', 15 * u, 33.5 * u, 4.6 * u, 500, '#fff');
  // Expressive clock (cookie) + weather (squircle) widgets
  fillShape(ctx, 31 * u, 66 * u, 23 * u, 'cookie', C.priC);
  const [hh, mm] = clockStr().split(':');
  T(ctx, hh.padStart(2, '0'), 31 * u, 64 * u, 17 * u, 700, C.onPriC, 'center');
  T(ctx, mm, 31 * u, 81 * u, 17 * u, 700, C.pri, 'center');
  fillShape(ctx, 74 * u, 66 * u, 20 * u, 'squircle', C.terC);
  glyph(ctx, 'cloud', 74 * u, 59 * u, 11 * u, C.onTerC);
  T(ctx, '64°', 74 * u, 79 * u, 9 * u, 600, C.onTerC, 'center');
  // App grid + dock
  const icons = [['message', 'Messages'], ['photos', 'Photos'], ['camera', 'Camera'], ['map', 'Maps'], ['mail', 'Gmail'], ['calendar', 'Calendar'], ['play', 'YouTube'], ['gear', 'Settings']];
  icons.forEach(([g, label], i) => {
    const cx = (14 + (i % 4) * 24) * u, cy = (122 + Math.floor(i / 4) * 27) * u;
    themed(ctx, g, cx, cy, 8.5 * u, i % 3 === 1 ? 'cookie' : 'circle', i % 2 ? C.secC : C.priC, i % 2 ? C.onSecC : C.onPriC);
    T(ctx, label, cx, cy + 14 * u, 3.4 * u, 500, '#e8eaf2', 'center');
  });
  ['phone', 'message', 'search', 'camera'].forEach((g, i) => themed(ctx, g, (14 + i * 24) * u, h - 37 * u, 8.5 * u, 'circle', C.priC, C.onPriC));
  // Search pill
  pill(ctx, 7 * u, h - 22 * u, 86 * u, 12 * u, C.sch);
  glyph(ctx, 'search', 15 * u, h - 16 * u, 5.5 * u, C.onv);
  T(ctx, 'Search', 22 * u, h - 14.3 * u, 4.4 * u, 500, C.onv);
  glyph(ctx, 'mic', 77 * u, h - 16 * u, 5.5 * u, C.on);
  glyph(ctx, 'camera', 86 * u, h - 16 * u, 5.5 * u, C.on);
  pill(ctx, 40 * u, h - 5 * u, 20 * u, 1.2 * u, 'rgba(255,255,255,.75)');
}

function foldTwoPane(ctx, w, h) {
  const u = h / 100;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
  statusBar(ctx, w, 5 * u, { font: F, size: 2.8 * u, pad: 4 * u });
  const L = w * 0.47;
  // list pane
  pill(ctx, 4 * u, 9 * u, L - 8 * u, 8 * u, C.sch);
  glyph(ctx, 'search', 9 * u, 13 * u, 3.6 * u, C.onv);
  T(ctx, 'Search in mail', 14 * u, 14.3 * u, 3 * u, 400, C.onv);
  fillShape(ctx, L - 9 * u, 13 * u, 3 * u, 'circle', '#7aa6ff');
  const mails = [['Ana', 'Kyoto trip, day 2 plan', 'Moved the tea house to 3 PM...'], ['Pixel Team', 'Your Pixel 11 Pro Fold tips', 'Unfold for two-pane apps...'], ['Theo', 'Climbing Saturday?', 'Gym opens at 9, bring chalk'], ['Calendar', 'Design review moved', 'Now Thursday 2:00 PM']];
  mails.forEach(([who, subj, snip], i) => {
    const y = 22 * u + i * 14.5 * u;
    if (i === 0) fillRR(ctx, 2.5 * u, y - 1.5 * u, L - 5 * u, 13.5 * u, 4 * u, C.secC);
    fillShape(ctx, 8 * u, y + 5 * u, 3.6 * u, i % 2 ? 'circle' : 'cookie', ['#a8c8ff', '#dbbce1', '#9cd67e', '#ffb68a', '#e9c46a'][i]);
    T(ctx, who[0], 8 * u, y + 6.4 * u, 3.4 * u, 700, '#1a1c22', 'center');
    T(ctx, who, 14 * u, y + 3.2 * u, 2.9 * u, 700, C.on);
    T(ctx, subj, 14 * u, y + 7 * u, 2.7 * u, 500, C.on);
    T(ctx, snip, 14 * u, y + 10.5 * u, 2.5 * u, 400, C.onv);
  });
  fillRR(ctx, 4 * u, 85 * u - 4 * u, 22 * u, 10 * u, 3 * u, C.priC);
  glyph(ctx, 'note', 9 * u, 86 * u, 4 * u, C.onPriC);
  T(ctx, 'Compose', 13 * u, 87.2 * u, 2.9 * u, 600, C.onPriC);
  // detail pane
  const X = L + 2 * u, W2 = w - X - 3 * u;
  fillRR(ctx, X, 9 * u, W2, 80 * u, 5 * u, C.sc);
  T(ctx, 'Kyoto trip, day 2 plan', X + 4 * u, 18 * u, 4.4 * u, 500, C.on);
  pill(ctx, X + 4 * u, 21.5 * u, 11 * u, 4.2 * u, C.secC); T(ctx, 'Travel', X + 9.5 * u, 24.6 * u, 2.4 * u, 500, C.onSecC, 'center');
  fillShape(ctx, X + 7 * u, 33 * u, 3.6 * u, 'cookie', '#a8c8ff'); T(ctx, 'A', X + 7 * u, 34.4 * u, 3.4 * u, 700, '#1a1c22', 'center');
  T(ctx, 'Ana Reyes', X + 13 * u, 32 * u, 2.9 * u, 700); T(ctx, 'to me · 9:41 AM', X + 13 * u, 36 * u, 2.5 * u, 400, C.onv);
  wrapText(ctx, 'Moved the tea house to 3 PM so we can do Fushimi Inari early. Sharing the map pins below, and the train is the 8:12 from Kyoto Station.', X + 4 * u, 45 * u, W2 - 8 * u, 4.4 * u, 2.9 * u, 400, C.onv);
  photo(ctx, 0, X + 4 * u, 60 * u, W2 - 8 * u, 15 * u);
  ['Sounds good!', 'At 8', 'Send pins'].forEach((s, i) => {
    const cw2 = (W2 - 8 * u - 2 * 1.5 * u) / 3, x = X + 4 * u + i * (cw2 + 1.5 * u);
    rr(ctx, x, 79 * u, cw2, 6 * u, 2 * u); ctx.strokeStyle = C.out; ctx.lineWidth = 2; ctx.stroke();
    T(ctx, s, x + cw2 / 2, 82.9 * u, 2.2 * u, 500, C.on, 'center');
  });
  // taskbar
  fillRR(ctx, w / 2 - 22 * u, 92 * u, 44 * u, 6.5 * u, 3.25 * u, C.sch);
  ['grid', 'mail', 'photos', 'map', 'play', 'message'].forEach((g, i) => themed(ctx, g, w / 2 - 17.5 * u + i * 7 * u, 95.25 * u, 2.5 * u, 'circle', C.priC, C.onPriC));
}

function watchFace(ctx, w, h) {
  const u = w / 100, cx = w / 2;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  // activity arc around the edge
  ctx.lineCap = 'round'; ctx.lineWidth = 3.4 * u;
  ctx.strokeStyle = '#1e2a3c'; ctx.beginPath(); ctx.arc(cx, cx, 46 * u, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = C.pri; ctx.beginPath(); ctx.arc(cx, cx, 46 * u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.72); ctx.stroke();
  const [hh, mm] = clockStr().split(':');
  T(ctx, hh.padStart(2, '0'), cx, 42 * u, 27 * u, 700, C.onPriC, 'center');
  T(ctx, mm, cx, 66 * u, 27 * u, 700, C.pri, 'center');
  T(ctx, shortDate().toUpperCase(), cx, 17.5 * u, 4.4 * u, 600, C.onv, 'center', { spacing: 1 });
  // complications
  [[25, 'heart', '72', '#ffb4ab', 'cookie'], [50, 'fitness', '7.2k', '#9cd67e', 'circle'], [75, 'sun', '64°', '#ffd58a', 'squircle']].forEach(([x, g, v, col, k]) => {
    fillShape(ctx, x * u, 79 * u, 9 * u, k, '#1d2128');
    glyph(ctx, g, x * u, 76.5 * u, 6 * u, col);
    T(ctx, v, x * u, 85.5 * u, 3.6 * u, 600, '#fff', 'center');
  });
}

function tabletSplit(ctx, w, h) {
  const u = h / 100;
  blobs(ctx, w, h, '#151a24', [[0.1, 0.1, 0.5, '#2b3f66'], [0.9, 0.9, 0.5, '#4b3560']]);
  statusBar(ctx, w, 4.5 * u, { font: F, size: 2.6 * u, pad: 3 * u });
  const top = 7 * u, bot = 84 * u, mid = w * 0.56;
  // Photos
  fillRR(ctx, 2 * u, top, mid - 3.5 * u, bot - top, 4 * u, C.bg);
  T(ctx, 'Photos', 6 * u, top + 8 * u, 4.6 * u, 500);
  pill(ctx, 30 * u, top + 3.4 * u, 22 * u, 6 * u, C.secC); T(ctx, 'Memories', 41 * u, top + 7.3 * u, 2.6 * u, 600, C.onSecC, 'center');
  T(ctx, 'Today', 6 * u, top + 15 * u, 2.8 * u, 600, C.onv);
  const cols = 5, gap = 1 * u, gw = (mid - 3.5 * u - 8 * u - (cols - 1) * gap) / cols;
  for (let i = 0; i < 15; i++) { const x = 6 * u + (i % cols) * (gw + gap), y = top + 18 * u + Math.floor(i / cols) * (gw + gap); photo(ctx, i, x, y, gw, gw, i % 2 === 0); }
  // drag handle
  pill(ctx, mid - 2.2 * u, (top + bot) / 2 - 5 * u, 1 * u, 10 * u, C.out);
  // Messages
  const X = mid, W2 = w - X - 2 * u;
  fillRR(ctx, X, top, W2, bot - top, 4 * u, C.bg);
  fillShape(ctx, X + 6 * u, top + 6.5 * u, 3 * u, 'cookie', C.ter); T(ctx, 'M', X + 6 * u, top + 7.6 * u, 2.8 * u, 700, '#2b1730', 'center');
  T(ctx, 'Maya', X + 11 * u, top + 7.8 * u, 3.4 * u, 500);
  const bubbles = [[0, 'Did the coast photos sync?'], [1, 'Yes! Sharing them now'], [0, 'That sunset one is unreal'], [1, 'Making it my wallpaper']];
  bubbles.forEach(([me, s], i) => {
    ctx.font = `400 ${2.8 * u}px ${F}`; const tw = ctx.measureText(s).width + 5 * u, y = top + 16 * u + i * 10 * u;
    const x = me ? X + W2 - tw - 3 * u : X + 3 * u;
    fillRR(ctx, x, y, tw, 7.5 * u, 3.75 * u, me ? C.priC : C.sch);
    T(ctx, s, x + 2.5 * u, y + 4.9 * u, 2.8 * u, 400, me ? C.onPriC : C.on);
  });
  photo(ctx, 0, X + W2 - 25 * u, top + 56 * u, 22 * u, 14 * u);
  pill(ctx, X + 3 * u, bot - 9 * u, W2 - 6 * u, 6.5 * u, C.sch); T(ctx, 'RCS message', X + 7 * u, bot - 4.8 * u, 2.6 * u, 400, C.onv);
  // taskbar
  fillRR(ctx, w / 2 - 30 * u, 88 * u, 60 * u, 9 * u, 4.5 * u, 'rgba(40,43,50,0.92)');
  ['grid', 'message', 'photos', 'mail', 'play', 'map', 'camera', 'gear'].forEach((g, i) => themed(ctx, g, w / 2 - 25 * u + i * 7.15 * u, 92.5 * u, 2.9 * u, i === 0 ? 'circle' : 'circle', i === 0 ? C.sch : C.priC, i === 0 ? C.on : C.onPriC));
}

function chromeOS(ctx, w, h) {
  const u = h / 100;
  blobs(ctx, w, h, '#1b2433', [[0.1, 0.2, 0.6, '#3a6ea5'], [0.8, 0.2, 0.5, '#7a5aa6'], [0.6, 1, 0.5, '#2e7d74']]);
  // Docs-style window
  const X = 6 * u, Y = 6 * u, W = w * 0.6, H = 76 * u;
  fillRR(ctx, X, Y, W, H, 2.4 * u, '#f8f9fc');
  fillRR(ctx, X, Y, W, 7 * u, 2.4 * u, '#e7ebf3'); ctx.fillStyle = '#e7ebf3'; ctx.fillRect(X, Y + 4 * u, W, 3 * u);
  fillRR(ctx, X + 1.5 * u, Y + 1.3 * u, 26 * u, 5.7 * u, 1.8 * u, '#f8f9fc');
  T(ctx, 'Kyoto weekend · Docs', X + 4 * u, Y + 5 * u, 2.4 * u, 500, '#1f1f1f');
  ['#5f6368', '#5f6368', '#5f6368'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X + W - (3 + i * 3.5) * u, Y + 3.5 * u, 0.8 * u, 0, Math.PI * 2); ctx.fill(); });
  pill(ctx, X + 2 * u, Y + 9 * u, W - 4 * u, 5 * u, '#edf1f8');
  fillRR(ctx, X + 10 * u, Y + 17 * u, W - 20 * u, H - 19 * u, 0.8 * u, '#fff');
  T(ctx, 'Kyoto weekend', X + 15 * u, Y + 27 * u, 4.6 * u, 500, '#1f1f1f');
  for (let i = 0; i < 9; i++) fillRR(ctx, X + 15 * u, Y + 32 * u + i * 3.6 * u, (W - 30 * u) * (i % 4 === 3 ? 0.55 : 0.95), 1.3 * u, 0.6 * u, '#d7dbe2');
  // Gemini panel
  const GX = X + W + 2.5 * u, GW = w - GX - 4 * u;
  fillRR(ctx, GX, Y, GW, H, 3 * u, C.sc);
  glyph(ctx, 'sparkle', GX + 5 * u, Y + 6 * u, 4.6 * u, '#8fb4ff');
  T(ctx, 'Gemini', GX + 9 * u, Y + 7.5 * u, 3.2 * u, 500);
  T(ctx, 'Hello, Joe', GX + 4 * u, Y + 20 * u, 5 * u, 500, '#a8c8ff');
  wrapText(ctx, 'I can help you write, plan and summarize. Try one:', GX + 4 * u, Y + 27 * u, GW - 8 * u, 3.6 * u, 2.6 * u);
  ['Help me write', 'Summarize this doc', 'Plan day 2'].forEach((s, i) => { pill(ctx, GX + 4 * u, Y + 36 * u + i * 7 * u, GW - 8 * u, 5.4 * u, C.schh); T(ctx, s, GX + 7 * u, Y + 39.6 * u + i * 7 * u, 2.5 * u, 500, C.on); });
  pill(ctx, GX + 3 * u, Y + H - 9 * u, GW - 6 * u, 6 * u, C.schh); T(ctx, 'Ask Gemini', GX + 7 * u, Y + H - 5 * u, 2.5 * u, 400, C.onv);
  // shelf
  fillRR(ctx, 0, h - 9 * u, w, 9 * u, 0, 'rgba(18,20,26,0.82)');
  fillShape(ctx, 4 * u, h - 4.5 * u, 2.8 * u, 'circle', 'rgba(255,255,255,.14)'); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4 * u, h - 4.5 * u, 1 * u, 0, Math.PI * 2); ctx.fill();
  ['search', 'mail', 'note', 'photos', 'play', 'calendar', 'gear'].forEach((g, i) => themed(ctx, g, w / 2 - 15 * u + i * 5.2 * u, h - 4.5 * u, 2.1 * u, 'circle', C.priC, C.onPriC));
  pill(ctx, w - 30 * u, h - 7.5 * u, 26 * u, 6 * u, 'rgba(255,255,255,.12)');
  glyph(ctx, 'wifi', w - 26 * u, h - 4.6 * u, 3 * u, '#fff'); T(ctx, clockStr(), w - 10 * u, h - 3.5 * u, 2.5 * u, 500, '#fff', 'center');
}

function googleTV(ctx, w, h) {
  const u = h / 100;
  ctx.fillStyle = '#0d0f13'; ctx.fillRect(0, 0, w, h);
  // hero
  ctx.save(); rr(ctx, 4 * u, 13 * u, w - 8 * u, 50 * u, 3 * u); ctx.clip();
  scene2d(ctx, 4 * u, 13 * u, w - 8 * u, 50 * u, ['#0f2a4a', '#1f6b7c', '#7fe0c0'], ['#132c35', '#0d1f27', '#081218'], false);
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = `rgba(140,255,200,${0.25 - i * 0.05})`; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(w * 0.3, 20 * u + i * 4 * u); ctx.bezierCurveTo(w * 0.5, 10 * u, w * 0.7, 35 * u, w, 18 * u + i * 4 * u); ctx.stroke(); }
  const g = ctx.createLinearGradient(4 * u, 0, w * 0.6, 0); g.addColorStop(0, 'rgba(10,12,16,0.9)'); g.addColorStop(1, 'rgba(10,12,16,0)');
  ctx.fillStyle = g; ctx.fillRect(4 * u, 13 * u, w, 50 * u);
  ctx.restore();
  T(ctx, 'Northern Lights', 10 * u, 34 * u, 7.5 * u, 600, '#fff');
  T(ctx, 'Documentary · 2026 · 4K', 10 * u, 40.5 * u, 2.8 * u, 400, '#c9d1dc');
  wrapText(ctx, 'Chase the aurora across three winters in the Arctic.', 10 * u, 46 * u, w * 0.4, 3.6 * u, 2.8 * u, 400, '#c9d1dc');
  pill(ctx, 10 * u, 51 * u, 20 * u, 6 * u, '#fff'); glyph(ctx, 'play', 14 * u, 54 * u, 3 * u, '#111'); T(ctx, 'Watch now', 17 * u, 55 * u, 2.6 * u, 600, '#111');
  // top nav
  ['For you', 'Live', 'Movies', 'Shows', 'Apps', 'Library'].forEach((s, i) => {
    ctx.font = `500 ${2.8 * u}px ${F}`; const x = 6 * u + i * 12.5 * u;
    if (i === 0) { pill(ctx, x - 2 * u, 3 * u, ctx.measureText(s).width + 4 * u, 6 * u, '#e8eaf0'); }
    T(ctx, s, x, 7 * u, 2.8 * u, 500, i === 0 ? '#111' : '#c9d1dc');
  });
  glyph(ctx, 'search', w - 18 * u, 6 * u, 3.4 * u, '#c9d1dc');
  fillShape(ctx, w - 9 * u, 6 * u, 3 * u, 'cookie', C.ter); T(ctx, 'J', w - 9 * u, 7.1 * u, 2.8 * u, 700, '#2b1730', 'center');
  // rows
  T(ctx, 'Top picks for you', 6 * u, 70 * u, 3 * u, 500, '#e8eaf0');
  for (let i = 0; i < 7; i++) {
    const pw = 22 * u, x = 6 * u + i * (pw + 2.2 * u);
    ctx.save(); rr(ctx, x, 73 * u, pw, 23 * u, 1.8 * u); ctx.clip(); photo(ctx, i + 1, x, 73 * u, pw, 23 * u, i % 2 === 0); ctx.restore();
    if (i === 0) { rr(ctx, x - 0.6 * u, 72.4 * u, pw + 1.2 * u, 24.2 * u, 2.2 * u); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.6 * u; ctx.stroke(); }
  }
}

function nestHub(ctx, w, h) {
  const u = h / 100;
  photo(ctx, 1, 0, 0, w, h, true);
  const g = ctx.createLinearGradient(0, h * 0.4, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  T(ctx, clockStr(), 7 * u, 86 * u, 18 * u, 400, '#fff');
  glyph(ctx, 'sun', 9 * u, 60 * u, 6 * u, '#ffe08a'); T(ctx, '64°', 14 * u, 63 * u, 6 * u, 400, '#fff');
  T(ctx, 'Photo: Big Sur, 2025', w - 6 * u, 92 * u, 3.4 * u, 400, 'rgba(255,255,255,.8)', 'right');
  [['bulb', 'Lights', true], ['thermo', '70°', false], ['play', 'Media', false]].forEach(([gl, s, on], i) => {
    const x = w - 62 * u + i * 19.5 * u;
    pill(ctx, x, 6 * u, 18 * u, 10 * u, on ? C.pri : 'rgba(30,32,38,0.75)');
    glyph(ctx, gl, x + 5 * u, 11 * u, 5 * u, on ? C.onPri : '#fff');
    T(ctx, s, x + 9 * u, 12.6 * u, 3.4 * u, 600, on ? C.onPri : '#fff');
  });
}

function xrHUD(ctx, w, h) {
  const u = h / 100;
  fillRR(ctx, 2, 2, w - 4, h - 4, 10 * u, 'rgba(14,16,22,0.82)');
  glyph(ctx, 'sparkle', 10 * u, 13 * u, 7 * u, '#8fb4ff');
  T(ctx, 'Gemini', 17 * u, 16 * u, 6 * u, 500, '#dfe6f5');
  T(ctx, '4 min', w - 8 * u, 16 * u, 6 * u, 500, '#9cd67e', 'right');
  // turn arrow
  ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6 * u; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(18 * u, 82 * u); ctx.lineTo(18 * u, 50 * u); ctx.quadraticCurveTo(18 * u, 40 * u, 28 * u, 40 * u); ctx.lineTo(38 * u, 40 * u); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(36 * u, 30 * u); ctx.lineTo(48 * u, 40 * u); ctx.lineTo(36 * u, 50 * u); ctx.closePath(); ctx.fill(); ctx.restore();
  T(ctx, '350 ft', 58 * u, 50 * u, 12 * u, 600, '#fff');
  T(ctx, 'Turn right on', 58 * u, 64 * u, 6 * u, 400, '#c4c6d0');
  T(ctx, 'Valencia St', 58 * u, 76 * u, 7.5 * u, 600, '#fff');
  T(ctx, '“Coffee on the left in a block”', w / 2, 93 * u, 5 * u, 400, '#a8c8ff', 'center');
}

// Slim everyday-style frames (the shared glasses() builder is chunkier) with the HUD card floating above
// the right lens, where the wearer would see it.
function xrGlasses() {
  const g = new THREE.Group(), frame = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.35, metalness: 0.3 });
  const lensShape = (x) => {
    const s = new THREE.Shape(), w = 0.25, h = 0.17, r = 0.06;
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const path = new THREE.CatmullRomCurve3(s.getSpacedPoints(80).slice(0, -1).map((p) => new THREE.Vector3(p.x, p.y, 0)), true);
    const rim = new THREE.Mesh(new THREE.TubeGeometry(path, 120, 0.011, 8, true), frame);
    rim.position.x = x; g.add(rim);
    const l = new THREE.Mesh(new THREE.ShapeGeometry(s, 8), new THREE.MeshPhysicalMaterial({ color: 0x2c3a4a, transparent: true, opacity: 0.32, roughness: 0.05, clearcoat: 1 }));
    l.position.x = x; g.add(l);
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.38), frame);
    temple.position.set(x * 1.55, 0.045, -0.19); g.add(temple);
  };
  lensShape(-0.15); lensShape(0.15);
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.009, 8, 20, Math.PI), frame);
  bridge.position.y = 0.035; g.add(bridge);
  const tex = canvasTex(742, 512, xrHUD);
  const card = panel(0.3, 0.207, 0.025, tex, { transparent: true });
  card.position.set(0.17, 0.25, 0.08); g.add(card);
  g.rotation.x = 0.12;
  g.userData.screens = [tex];
  return g;
}

// ---- devices ---------------------------------------------------------------------------------------------
const devices = [
  {
    name: 'Pixel 11 Pro', short: 'Pixel 11 Pro', os: 'Android 17 · Material 3 Expressive', year: '2026',
    blurb: 'The reference Android phone: home screen, lock screen and system UI are where Material 3 Expressive shows up first.',
    ui: ['At a Glance and a shape-morphed clock widget set the tone above the app grid', 'Themed icons pick up the wallpaper’s tonal palette (dynamic color)', 'Search pill and dock live at the bottom, within thumb reach', 'Springy, physics-based motion on every swipe and tap'],
    build: () => phone({ w: 0.34, h: 0.76, r: 0.058, color: 0x6f7682, cams: 'pixel', cut: 'punch', bezel: 0.011, screen: { draw: pixelHome } }),
  },
  {
    name: 'Pixel 11 Pro Fold', short: 'Pro Fold', os: 'Android 17 · large-screen layouts', year: '2026',
    blurb: 'Unfolded, apps move to two panes: a list on one side, the open item on the other, with a taskbar to switch apps.',
    ui: ['List-detail layouts adapt to the fold instead of stretching a phone UI', 'Taskbar pins apps for drag-to-split multitasking', 'Extended FAB and tonal surfaces carry over from the phone', 'Suggested replies as outlined chips'],
    build: () => foldable({ w: 0.36, h: 0.64, r: 0.04, color: 0x3a3e45, cams: 'pixel', open: Math.PI * 0.86, screen: { draw: foldTwoPane } }),
  },
  {
    name: 'Pixel Watch 5', short: 'Watch 5', os: 'Wear OS 6 · Material 3 Expressive', year: '2026',
    blurb: 'Round-first design: big stacked numerals, an activity arc that hugs the bezel and shape-coded complications.',
    ui: ['Content follows the round edge: arcs, curved lists, edge-hugging buttons', 'Bold stacked type that is readable at a glance', 'Complications in distinct shapes (cookie, circle, squircle)', 'Tiles swipe sideways for quick info'],
    build: () => watch({ shape: 'round', size: 0.42, color: 0xbfc3c9, band: 0x37404d, screen: { draw: watchFace, px: 640 } }),
  },
  {
    name: 'Pixel Tablet', short: 'Tablet', os: 'Android 16 · tablet mode', year: '2025',
    blurb: 'A split-screen tablet: Photos and Messages side by side with a draggable divider and a floating taskbar.',
    ui: ['Split screen with a pill-shaped drag handle', 'Floating taskbar with app drawer and pinned apps', 'Rounded message bubbles in tonal containers', 'Dynamic color across both apps'],
    build: () => tablet({ color: 0xe6e0d6, screen: { draw: tabletSplit } }),
  },
  {
    name: 'Chromebook Plus', short: 'Chromebook', os: 'ChromeOS · Gemini built in', year: '2026',
    blurb: 'A desktop take on Material: rounded windows, a centred shelf and a Gemini side panel next to your doc.',
    ui: ['Shelf with launcher, pinned apps and a pill-shaped status area', 'Rounded browser windows with tab strips', 'Gemini panel: “Help me write” and summaries beside your work', 'Dynamic color from the wallpaper'],
    build: () => laptop({ w: 1.0, h: 0.62, color: 0x5d636c, keys: 0x202328, screen: { draw: chromeOS } }),
  },
  {
    name: 'Google TV Streamer', short: 'TV Streamer', os: 'Google TV', year: '2024',
    blurb: 'Ten-foot UI: a big hero banner, a pill tab bar and rows of recommendations navigated by remote.',
    ui: ['“For you” hero with one obvious primary action', 'Pill tab bar: For you, Live, Movies, Shows, Apps, Library', 'Rows of posters with a clear focus ring for D-pad navigation', 'Profiles and Gemini search up top'],
    build: () => streamer({ box: 'puck', boxColor: 0xe9e5dd, screen: { draw: googleTV } }),
  },
  {
    name: 'Nest Hub', short: 'Nest Hub', os: 'Google Home · ambient mode', year: '2025',
    blurb: 'A smart display that is mostly a photo frame: time and weather in the corner, home controls as pills.',
    ui: ['Ambient photo frame from Google Photos when idle', 'Large time and weather for across-the-room reading', 'Home controls as tonal pills (lights, thermostat, media)', 'Voice first, touch second'],
    build: () => hub({ screen: { draw: nestHub } }),
  },
  {
    name: 'Android XR glasses', short: 'XR glasses', os: 'Android XR · Gemini', year: '2026',
    blurb: 'Glasses with a small in-lens display: Gemini and turn-by-turn directions appear as a glanceable card.',
    ui: ['A single glanceable card instead of windows', 'Gemini sees what you see and answers in one line', 'Navigation as a big arrow and distance', 'Dark, translucent surfaces that do not block the world'],
    fit: [0.9, 0.6],
    build: xrGlasses,
  },
];

// ---- concept helpers ----------------------------------------------------------------------------------------
const hitIn = (hit, obj) => { for (let o = hit?.object; o; o = o.parent) if (o === obj) return true; return false; };
function tagPanel(str, color = C.onv, w = 0.2) {
  const tex = canvasTex(400, 60, (ctx, W, H) => { pill(ctx, 0, 6, W, H - 12, 'rgba(20,22,28,0.85)'); text(ctx, str, W / 2, H / 2 + 8, { size: 24, weight: 600, color, align: 'center', font: F }); });
  return panel(w, w * 0.15, 0.015, tex, { transparent: true });
}

// ---- concept 1: Elevation, for real -------------------------------------------------------------------------
const TRIPS = [
  ['Kyoto', 'Temples, tea and Fushimi Inari', '4.9', 0], ['Lisbon', 'Trams, tiles and pastel de nata', '4.8', 3],
  ['Reykjavík', 'Northern lights and hot springs', '4.9', 1], ['Patagonia', 'Torres del Paine trekking', '4.7', 2],
  ['Marrakesh', 'Souks, riads and the Atlas', '4.6', 5], ['Big Sur', 'Highway 1 and redwoods', '4.8', 4],
];

function conceptElevation() {
  const group = new THREE.Group(), targets = [];
  const W = 1.38, H = 0.82;
  const bg = panel(W, H, 0.05, canvasTex(1380, 820, (ctx, w, h) => { fillRR(ctx, 0, 0, w, h, 50, C.bg); }));
  bg.position.z = -0.17; group.add(bg);

  const bar = panel(1.18, 0.1, 0.05, canvasTex(1180, 100, (ctx, w, h) => {
    pill(ctx, 0, 0, w, h, C.sch);
    T(ctx, 'Wander', 40, 66, 44, 600, C.on);
    pill(ctx, 260, 18, 600, 64, C.schh); glyph(ctx, 'search', 300, 50, 30, C.onv); T(ctx, 'Search destinations', 330, 61, 26, 400, C.onv);
    fillShape(ctx, w - 60, 50, 32, 'cookie', C.ter); T(ctx, 'J', w - 60, 62, 30, 700, '#2b1730', 'center');
  }), { transparent: true });
  bar.position.set(0.08, 0.32, -0.11); group.add(bar);

  const rail = panel(0.11, 0.62, 0.055, canvasTex(110, 620, (ctx, w, h) => {
    fillRR(ctx, 0, 0, w, h, 55, C.sc);
    ['home', 'search', 'heart', 'person'].forEach((g, i) => {
      const y = 70 + i * 140;
      if (i === 0) pill(ctx, 12, y - 30, w - 24, 60, C.secC);
      glyph(ctx, g, w / 2, y, 40, i === 0 ? C.onSecC : C.onv);
      T(ctx, ['Explore', 'Search', 'Saved', 'Profile'][i], w / 2, y + 58, 17, 600, i === 0 ? C.on : C.onv, 'center');
    });
  }), { transparent: true });
  rail.position.set(-0.6, -0.04, -0.09); group.add(rail);

  // Cards (level 1, rising to 3 on hover)
  const cw = 0.36, ch = 0.28, cards = [];
  TRIPS.forEach(([name, line, stars, si], i) => {
    const tex = canvasTex(720, 560, (ctx, w, h) => {
      fillRR(ctx, 0, 0, w, h, 44, C.sch);
      ctx.save(); rr(ctx, 14, 14, w - 28, 330, 32); ctx.clip(); photo(ctx, si, 14, 14, w - 28, 330, i % 2 === 0); ctx.restore();
      T(ctx, name, 36, 410, 46, 600, C.on);
      T(ctx, line, 36, 458, 26, 400, C.onv);
      pill(ctx, 36, 484, 110, 50, C.secC); T(ctx, '★ ' + stars, 91, 518, 24, 600, C.onSecC, 'center');
      pill(ctx, 160, 484, 150, 50, C.terC); T(ctx, '3 nights', 235, 518, 24, 600, C.onTerC, 'center');
    });
    const m = panel(cw, ch, 0.035, tex);
    const x = -0.34 + (i % 3) * 0.39, y = 0.1 - Math.floor(i / 3) * 0.31;
    m.position.set(x, y, -0.05); group.add(m); targets.push(m);
    cards.push({ m, x, y, z: new Spring(-0.05, 160, 20), i });
  });

  // FAB (level 3+)
  const fab = panel(0.27, 0.09, 0.03, canvasTex(540, 180, (ctx, w, h) => {
    fillRR(ctx, 0, 0, w, h, 56, C.priC); glyph(ctx, 'plus', 80, h / 2, 60, C.onPriC, 8);
    T(ctx, 'Plan a trip', 140, h / 2 + 14, 40, 600, C.onPriC);
  }));
  fab.position.set(0.5, -0.36, 0.06); group.add(fab); targets.push(fab);
  const fabZ = new Spring(0.06, 160, 18);

  // Elevation level tags along the left edge
  [[-0.35, -0.385, -0.168, "Level 0 · surface", C.onv], [-0.56, 0.37, -0.088, "Level 2 · rail + bar", C.onv], [0.2, -0.4, 0.061, "Level 3 · FAB", C.pri]].forEach(([x, y, z, s, col]) => {
    const t = tagPanel(s, col, 0.24); t.position.set(x, y, z); group.add(t);
  });

  // Detail sheet (container transform target)
  const sw = 1.0, sh = 0.72;
  let open = 0;
  const sheetTex = canvasTex(1400, 1008, (ctx, w, h) => {
    const [name, line, stars, si] = TRIPS[open];
    fillRR(ctx, 0, 0, w, h, 60, C.sc);
    ctx.save(); rr(ctx, 24, 24, 640, h - 48, 44); ctx.clip(); photo(ctx, si, 24, 24, 640, h - 48, true); ctx.restore();
    const X = 720;
    T(ctx, name, X, 120, 84, 600, C.on);
    T(ctx, line, X, 180, 34, 400, C.onv);
    pill(ctx, X, 220, 150, 64, C.secC); T(ctx, '★ ' + stars, X + 75, 263, 30, 600, C.onSecC, 'center');
    pill(ctx, X + 166, 220, 190, 64, C.terC); T(ctx, '3 nights', X + 261, 263, 30, 600, C.onTerC, 'center');
    T(ctx, 'Itinerary', X, 360, 36, 600, C.on);
    ['Day 1 · Arrive, old town walk', 'Day 2 · Sunrise hike, food tour', 'Day 3 · Museum, sunset spot'].forEach((s, k) => {
      fillShape(ctx, X + 22, 412 + k * 70, 18, ['cookie', 'squircle', 'clover'][k], [C.pri, C.ter, C.grn][k]);
      T(ctx, s, X + 60, 423 + k * 70, 30, 400, C.onv);
    });
    fillRR(ctx, X, 660, 300, 96, 48, C.pri); T(ctx, 'Book trip', X + 150, 720, 36, 600, C.onPri, 'center');
    rr(ctx, X + 320, 660, 250, 96, 48); ctx.strokeStyle = C.out; ctx.lineWidth = 3; ctx.stroke(); T(ctx, 'Save', X + 445, 720, 36, 600, C.pri, 'center');
    T(ctx, 'Click anywhere to close', X, h - 60, 26, 400, C.out);
  });
  const sheet = panel(sw, sh, 0.06, sheetTex, { transparent: true, renderOrder: 5 });
  sheet.visible = false; group.add(sheet);
  // Raycasts ignore .visible, so the sheet only joins the targets while it is showing.
  const setSheet = (on) => { sheet.visible = on; const i = targets.indexOf(sheet); if (on && i < 0) targets.push(sheet); else if (!on && i >= 0) targets.splice(i, 1); };
  const scrim = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
  scrim.position.z = 0.075; scrim.renderOrder = 4; group.add(scrim);
  const e = new Spring(0, 110, 17);
  let active = -1;

  const SC = new THREE.Vector3(0.05, -0.01, 0.11);
  return {
    group, targets,
    update(dt, t, hit) {
      for (const c of cards) {
        const hov = hit && hit.object === c.m && e.to === 0;
        c.z.to = hov ? 0.02 : -0.05;
        c.z.step(dt);
      }
      fabZ.to = hit && hit.object === fab && e.to === 0 ? 0.1 : 0.06; fab.position.z = fabZ.step(dt);
      const k = clamp(e.step(dt), 0, 1.08);
      for (const c of cards) {
        if (c.i === active) {
          const p = clamp(k, 0, 1);
          c.m.position.set(lerp(c.x, SC.x, p), lerp(c.y, SC.y, p), lerp(c.z.v, SC.z, p));
          const sx = lerp(cw, sw, k), sy = lerp(ch, sh, k);
          c.m.scale.set(sx / cw, sy / ch, 1);
          c.m.material.transparent = true; c.m.material.opacity = 1 - clamp(k * 2.2, 0, 1);
          sheet.position.copy(c.m.position); sheet.position.z += 0.001;
          sheet.scale.set(sx / sw, sy / sh, 1);
          sheet.material.opacity = clamp((k - 0.25) * 1.6, 0, 1);
          setSheet(k > 0.02);
          c.m.renderOrder = 6;
        } else {
          c.m.position.set(c.x, c.y, c.z.v); c.m.scale.set(1, 1, 1); c.m.material.opacity = 1; c.m.renderOrder = 0;
        }
      }
      scrim.material.opacity = clamp(k, 0, 1) * 0.55;
      if (e.to === 0 && k < 0.01 && active >= 0) { setSheet(false); const c = cards[active]; c.m.material.transparent = false; c.m.material.opacity = 1; active = -1; }
    },
    click(hit) {
      if (e.to === 1) { e.to = 0; return; }
      const c = cards.find((x) => hit && x.m === hit.object) || (hit && hit.object === fab ? cards[0] : null);
      if (!c) return;
      active = c.i; open = c.i; sheetTex.redraw();
      e.to = 1;
    },
  };
}

// ---- concept 2: Shape-morph Quick Settings --------------------------------------------------------------------
const QS = [
  ['wifi', 'Internet', true, 'cookie'], ['bt', 'Bluetooth', true, 'squircle'], ['flash', 'Flashlight', false, 'sunny'],
  ['moon', 'Do Not Disturb', false, 'clover'], ['bulb', 'Dark theme', true, 'pill'], ['plane', 'Airplane', false, 'cookie'],
  ['map', 'Location', true, 'squircle'], ['wifi', 'Hotspot', false, 'sunny'], ['fitness', 'Battery Saver', false, 'clover'],
  ['camera', 'Camera access', true, 'pill'], ['mic', 'Mic access', true, 'cookie'], ['tv', 'Screen cast', false, 'squircle'],
];
const _ca = new THREE.Color(), _cb = new THREE.Color();
const mix = (a, b, t) => '#' + _ca.set(a).lerp(_cb.set(b), clamp(t, 0, 1)).getHexString();

function conceptQuickSettings() {
  const group = new THREE.Group(), targets = [];
  const bg = panel(1.42, 0.84, 0.06, canvasTex(1420, 840, (ctx, w, h) => {
    fillRR(ctx, 0, 0, w, h, 60, C.bg);
    T(ctx, clockStr(), 60, 110, 92, 400, C.on);
    T(ctx, shortDate(), 60, 160, 32, 500, C.onv);
    ['gear', 'person', 'lock'].forEach((g, i) => { fillShape(ctx, w - 80 - i * 90, 92, 36, 'circle', C.sch); glyph(ctx, g, w - 80 - i * 90, 92, 36, C.on); });
  }));
  bg.position.z = -0.15; group.add(bg);

  // Brightness slider
  let bright = 0.62, sliderDirty = true;
  const sliderTex = canvasTex(1100, 110, (ctx, w, h) => {
    pill(ctx, 0, 0, w, h, C.schh);
    const fw = Math.max(h, w * bright);
    pill(ctx, 0, 0, fw, h, C.pri);
    glyph(ctx, 'sun', 56, h / 2, 54, C.onPri);
    fillRR(ctx, fw - 26, 18, 8, h - 36, 4, C.onPri);
    T(ctx, Math.round(bright * 100) + '%', w - 40, h / 2 + 12, 34, 600, bright > 0.9 ? C.onPri : C.on, 'right');
  });
  const slider = panel(1.1, 0.11, 0.055, sliderTex, { transparent: true });
  slider.position.set(0, 0.16, 0.05); group.add(slider); targets.push(slider);
  const sliderZ = new Spring(0.05, 170, 16);

  const tiles = QS.map(([g, label, on, kind], i) => {
    const st = { on, kind, m: new Spring(on ? 1 : 0, 120, 11), drawn: -1, z: new Spring(on ? 0.06 : -0.06, 140, 10), s: new Spring(1, 260, 12), rot: Math.random() * 6 };
    const tex = canvasTex(256, 320, (ctx, w, h) => {
      const m = clamp(st.m.v, -0.1, 1.15), r = 98;
      shapePath(ctx, 128, 122, r, 'circle', st.kind, clamp(m, 0, 1), st.rot);
      ctx.fillStyle = mix(C.schh, C.pri, m); ctx.fill();
      glyph(ctx, g, 128, 122, 92, mix(C.on, C.onPri, m), 9);
      text(ctx, label, 128, 290, { size: 30, weight: 600, color: mix(C.onv, C.on, m), align: 'center', font: F });
    });
    const mesh = panel(0.17, 0.2125, 0.0001, tex, { transparent: true });
    mesh.position.set(-0.525 + (i % 6) * 0.21, -0.03 - Math.floor(i / 6) * 0.235, st.z.v);
    group.add(mesh); targets.push(mesh);
    st.tex = tex; st.mesh = mesh;
    return st;
  });
  let dragging = false;

  return {
    group, targets,
    update(dt, t, hit) {
      for (const s of tiles) {
        const hov = hit && hit.object === s.mesh;
        s.z.to = (s.on ? 0.07 : -0.06) + (hov ? 0.025 : 0);
        s.mesh.position.z = s.z.step(dt);
        const sc = s.s.step(dt); s.mesh.scale.set(sc, sc, 1);
        s.rot += dt * (s.on ? 0.25 : 0);
        const m = s.m.step(dt);
        if (Math.abs(m - s.drawn) > 0.004 || (s.on && s.kind !== 'pill' && s.kind !== 'squircle')) { s.drawn = m; s.tex.redraw(t); }
      }
      if (dragging && hit && hit.object === slider && hit.uv) { const v = clamp(hit.uv.x, 0.05, 1); if (Math.abs(v - bright) > 0.003) { bright = v; sliderDirty = true; } }
      sliderZ.to = (hit && hit.object === slider) ? 0.09 : 0.05; slider.position.z = sliderZ.step(dt);
      if (sliderDirty) { sliderTex.redraw(t); sliderDirty = false; }
    },
    click(hit) {
      if (!hit) return;
      if (hit.object === slider && hit.uv) { bright = clamp(hit.uv.x, 0.05, 1); sliderDirty = true; return; }
      const s = tiles.find((x) => x.mesh === hit.object);
      if (!s) return;
      s.on = !s.on; s.m.to = s.on ? 1 : 0; s.s.v = 0.86; s.s.to = 1;
    },
    drag() { dragging = true; },
    dragEnd() { dragging = false; },
  };
}

// ---- concept 3: Gemini space --------------------------------------------------------------------------------------
const TOPICS = [
  {
    q: 'Plan a weekend in Kyoto',
    cards: [
      ['calendar', 'Itinerary', ['Sat · Fushimi Inari at 7 AM', 'Sat · Nishiki Market lunch', 'Sun · Arashiyama bamboo', 'Sun · Tea house, 3 PM'], C.priC],
      ['sun', 'Weather', ['Sat 68° sunny', 'Sun 64° light clouds', 'Bring a layer for evenings'], C.terC, '68°'],
      ['map', 'Map', ['4 stops, 2 train rides', 'Kyoto Sta. → Inari: 5 min', 'Inari → Arashiyama: 25 min'], C.secC],
      ['heart', 'Where to eat', ['Kichi Kichi omurice', 'Nishiki: tamagoyaki stalls', 'Gion: kaiseki, book ahead'], C.grnC],
    ],
  },
  {
    q: 'Summarize my inbox',
    cards: [
      ['mail', '3 need replies', ['Ana · day 2 plan', 'Theo · climbing Saturday?', 'Landlord · lease renewal'], C.priC],
      ['calendar', 'Changes', ['Design review → Thu 2 PM', 'Dentist moved to Nov 3'], C.terC, '2'],
      ['wallet', 'Receipts', ['3 orders arriving today', 'Flight to Osaka confirmed'], C.secC],
      ['sparkle', 'Draft ready', ['“Sounds good, see you at 8. Sending the map pins now.”'], C.grnC],
    ],
  },
  {
    q: 'Why is my bike chain skipping?',
    cards: [
      ['gear', 'Likely cause', ['Worn chain or cassette', 'Cable tension slightly off', 'Bent derailleur hanger'], C.priC],
      ['note', 'Quick fix', ['Shift to the smallest cog', 'Turn barrel adjuster ¼ out', 'Test, repeat until quiet'], C.terC],
      ['search', 'Check wear', ['Chain checker at 0.5%', 'Replace chain past 0.75%'], C.secC, '0.5%'],
      ['play', 'Watch', ['3-min video: indexing a rear derailleur'], C.grnC],
    ],
  },
];

function radialTex(color) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  const col = new THREE.Color(color);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.35, `rgba(${rgb},0.6)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function conceptGemini() {
  const group = new THREE.Group(), targets = [];
  let topic = 0;

  // Orb: layered additive glows orbiting a bright core.
  const orb = new THREE.Group(); orb.position.set(0, 0.03, -0.12); group.add(orb);
  const glows = GEM.map((c, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(c), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.85 }));
    s.scale.setScalar(0.3); orb.add(s); return s;
  });
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('#ffffff'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.8 }));
  core.scale.setScalar(0.14); orb.add(core);
  const spark = panel(0.1, 0.1, 0.0001, canvasTex(256, 256, (ctx) => glyph(ctx, 'sparkle', 128, 128, 200, '#ffffff')), { transparent: true });
  spark.position.z = 0.01; orb.add(spark);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.0025, 8, 96), new THREE.MeshBasicMaterial({ color: 0x9db8ff, transparent: true, opacity: 0.45, toneMapped: false }));
  orb.add(ring);

  // Question header + prompt bar
  const headTex = canvasTex(1400, 120, (ctx, w, h) => {
    T(ctx, `“${TOPICS[topic].q}”`, w / 2, 78, 58, 500, '#e6ecff', 'center');
  });
  const head = panel(1.2, 0.103, 0.0001, headTex, { transparent: true });
  head.position.set(0, 0.36, -0.05); group.add(head);
  const prompt = panel(0.86, 0.085, 0.0425, canvasTex(860, 85, (ctx, w, h) => {
    pill(ctx, 0, 0, w, h, C.sch); glyph(ctx, 'sparkle', 46, h / 2, 34, '#8fb4ff');
    T(ctx, 'Ask Gemini', 80, h / 2 + 10, 28, 400, C.onv);
    fillShape(ctx, w - 100, h / 2, 26, 'circle', C.schh); glyph(ctx, 'camera', w - 100, h / 2, 28, C.on);
    fillShape(ctx, w - 44, h / 2, 26, 'circle', C.priC); glyph(ctx, 'mic', w - 44, h / 2, 28, C.onPriC);
  }), { transparent: true });
  prompt.position.set(0, -0.37, 0.04); group.add(prompt);

  // Answer cards in a depth arc
  const slots = [[-0.67, -0.03, -0.2, 0.6], [-0.35, -0.03, -0.06, 0.26], [0.35, -0.03, -0.06, -0.26], [0.67, -0.03, -0.2, -0.6]];
  const cards = slots.map((sl, i) => {
    const tex = canvasTex(600, 760, (ctx, w, h) => {
      const [g, title, lines, bg, big] = TOPICS[topic].cards[i];
      fillRR(ctx, 0, 0, w, h, 54, C.sc);
      fillShape(ctx, 80, 84, 46, ['cookie', 'squircle', 'clover', 'sunny'][i], bg);
      glyph(ctx, g, 80, 84, 52, '#ffffff');
      T(ctx, title, 146, 102, 50, 600, C.on);
      let y = 200;
      if (big) { T(ctx, big, 40, 300, 130, 500, '#a8c8ff'); y = 380; }
      for (const s of lines) { y += 50 * wrapText(ctx, s, 40, y, w - 80, 50, 38, 400, C.onv, 4) + 22; }
      ctx.save(); const gr = ctx.createLinearGradient(0, h - 8, w, h - 8); GEM.forEach((c, k) => gr.addColorStop(k / 3, c)); ctx.fillStyle = gr; fillRR(ctx, 40, h - 40, w - 80, 8, 4, gr); ctx.restore();
    });
    const m = panel(0.28, 0.355, 0.04, tex);
    m.position.set(sl[0], sl[1], sl[2]); m.rotation.y = sl[3];
    group.add(m); targets.push(m);
    return { m, tex, sl, s: new Spring(0, 150, 18) };
  });

  // Suggestion chips orbiting above the orb
  const chips = TOPICS.map((tp, i) => {
    const tex = canvasTex(520, 80, (ctx, w, h) => {
      pill(ctx, 0, 0, w, h, i === topic ? C.priC : 'rgba(40,44,52,0.95)');
      glyph(ctx, 'sparkle', 36, h / 2, 26, i === topic ? C.onPriC : '#8fb4ff');
      T(ctx, tp.q, 62, h / 2 + 10, 27, 500, i === topic ? C.onPriC : C.on);
    });
    const m = panel(0.3, 0.046, 0.023, tex, { transparent: true });
    group.add(m); targets.push(m);
    return { m, tex, a: (i / TOPICS.length) * Math.PI * 2 };
  });

  let focus = -1;
  const f = new Spring(0, 120, 17);
  const setTopic = (i) => { topic = i; headTex.redraw(); cards.forEach((c) => c.tex.redraw()); chips.forEach((c) => c.tex.redraw()); focus = -1; f.to = 0; cards.forEach((c) => (c.s.v = -0.6)); };

  return {
    group, targets,
    update(dt, t, hit) {
      // orb motion
      glows.forEach((s, i) => {
        const a = t * (0.6 + i * 0.17) + i * 1.7;
        s.position.set(Math.cos(a) * 0.05, Math.sin(a * 1.3) * 0.04, Math.sin(a) * 0.02);
        s.scale.setScalar(0.3 + Math.sin(t * 1.4 + i) * 0.04);
      });
      const fk = f.step(dt);
      core.scale.setScalar(0.14 + Math.sin(t * 2.2) * 0.012);
      spark.rotation.z = Math.sin(t * 0.8) * 0.3;
      ring.rotation.x = 1.2 + Math.sin(t * 0.5) * 0.15; ring.rotation.y = t * 0.4;
      orb.scale.setScalar(1 - fk * 0.35);
      orb.position.z = -0.12 - fk * 0.08;
      // cards
      cards.forEach((c, i) => {
        const hov = hit && hit.object === c.m;
        c.s.to = hov ? 1 : 0; const h = c.s.step(dt);
        const isF = i === focus, k = isF ? fk : 0;
        const [x, y, z, ry] = c.sl;
        const back = focus >= 0 && !isF ? fk * 0.08 : 0;
        c.m.position.set(lerp(x, 0, k), lerp(y + h * 0.015, 0.0, k), lerp(z + h * 0.06 - back, 0.12, k));
        c.m.rotation.y = lerp(ry * (1 - h * 0.7), 0, k);
        c.m.scale.setScalar(lerp(1, 1.75, k));
        c.m.renderOrder = isF ? 5 : 0;
      });
      // chips orbit
      chips.forEach((c, i) => {
        const a = c.a + t * 0.18;
        c.m.position.set(Math.cos(a) * 0.3, 0.255 + Math.sin(a * 2) * 0.01, -0.12 + Math.sin(a) * 0.13);
        const hov = hit && hit.object === c.m;
        c.m.scale.setScalar(damp(c.m.scale.x, hov ? 1.15 : 1, 10, dt));
        c.m.visible = fk < 0.5;
      });
    },
    click(hit) {
      const ci = chips.findIndex((c) => hit && c.m === hit.object);
      if (ci >= 0 && f.to === 0) { setTopic(ci); return; }
      const i = cards.findIndex((c) => hit && c.m === hit.object);
      if (focus >= 0 && (i === focus || i < 0)) { f.to = 0; return; }
      if (i >= 0) { focus = i; f.v = 0; f.to = 1; }
    },
  };
}

// ---- brand ----------------------------------------------------------------------------------------------------
export default {
  id: 'google', name: 'Google', accent: '#8ab4ff', glow: '#6d8cff',
  lang: 'Material 3 Expressive',
  langBlurb: 'Google’s 2025–26 evolution of Material You: dynamic colour from your wallpaper, bolder type, a library of 35 shapes that morph on interaction, and springy physics-based motion. Surfaces separate by tonal elevation rather than heavy shadows.',
  devices,
  concepts: [
    {
      name: 'Elevation, for real', short: 'Elevation', tagline: 'Material’s tonal elevation levels become physical depth',
      blurb: 'Material 3 separates surfaces with tonal elevation: background, cards, app bar, FAB. On a 3D display those levels can be real distances from the glass, so the hierarchy reads before you parse a single word.',
      points: ['Level 0 surface sits behind the glass; cards float just above it', 'Top app bar and navigation rail hover a level higher', 'The FAB sits closest, the one primary action', 'Opening a card is a container transform that travels toward you'],
      how: 'Hover a destination card to lift it. Click it to expand it toward you into a detail sheet; click again to put it back.',
      hint: 'Hover a card to lift it · click to expand',
      build: conceptElevation,
    },
    {
      name: 'Shape-morph Quick Settings', short: 'Quick Settings', tagline: 'Expressive tiles that spring out of the glass when on',
      blurb: 'Material 3 Expressive uses shape as state: a tile morphs from a calm circle into a cookie, clover or squircle when you switch it on. Here “on” also means “closer”: active tiles spring forward out of the screen with a bounce.',
      points: ['Off tiles rest behind the glass as quiet circles', 'On tiles morph shape, take the primary colour and pop forward', 'Spring physics with overshoot, as in Android 17', 'Brightness slider pill floats nearest, for the most-used control'],
      how: 'Click tiles to toggle them. Click or drag along the brightness pill to set it.',
      hint: 'Click a tile to toggle · drag the brightness pill',
      build: conceptQuickSettings,
    },
    {
      name: 'Gemini space', short: 'Gemini', tagline: 'Answers fan out around the assistant in depth',
      blurb: 'Instead of a scrolling chat, Gemini’s answer is laid out as cards in an arc around the glowing orb, each a different facet of the answer. The one you choose comes front and centre; follow-up suggestions orbit overhead.',
      points: ['Gemini’s blue-to-pink glow lives behind the glass as the “source”', 'Answer cards curve around you, nearest in the middle', 'Hover turns a card to face you; click brings it forward', 'Suggestion chips orbit; pick one for a new answer'],
      how: 'Hover a card to turn it toward you, click to bring it forward. Click an orbiting chip to ask something else.',
      hint: 'Hover the cards · click a chip to ask again',
      build: conceptGemini,
    },
  ],
};
