// Apple: Liquid Glass (iOS 27, iPadOS 27, macOS 27, watchOS 27, tvOS 27, visionOS 27).
// Interfaces are hand-drawn recreations for comparing design languages, not screenshots.

import * as THREE from 'three';
import * as D from '../devices.js';
import {
  canvasTex, panel, glassCard, Spring, damp, clamp, FONT, rr, fillRR, strokeRR, squircle, text, grad, blobs,
  glyph, statusBar, clockStr, dateStr, screenGeo,
} from '../kit.js';
import { layouts } from './apple-layouts.js';

const F = FONT.apple;

// ---- Liquid Glass drawing ------------------------------------------------------------------------------
const WALL = {
  blue: ['#0b1a3a', [[0.2, 0.15, 0.6, '#2f6bff'], [0.85, 0.35, 0.55, '#7a3cff'], [0.4, 0.85, 0.6, '#00b3ff'], [0.9, 0.95, 0.4, '#ff5fa2']]],
  dusk: ['#1b0f2a', [[0.15, 0.2, 0.6, '#ff7a45'], [0.8, 0.3, 0.6, '#c83cff'], [0.5, 0.9, 0.7, '#3c5bff']]],
  sea: ['#06202a', [[0.25, 0.25, 0.6, '#16c6b0'], [0.85, 0.55, 0.6, '#2a7bff'], [0.3, 0.95, 0.5, '#9ef0d0']]],
  tahoe: ['#0d2236', [[0.5, 0.0, 0.7, '#9ccfff'], [0.2, 0.7, 0.6, '#2a5f8f'], [0.85, 0.85, 0.6, '#f0b27a']]],
};
function wallpaper(ctx, w, h, k = 'blue') { const [b, s] = WALL[k]; blobs(ctx, w, h, b, s); }

// A Liquid Glass surface: translucent fill, a soft top highlight, a bright hairline rim.
function lg(ctx, x, y, w, h, r, { tint = 'rgba(255,255,255,0.16)', rim = 0.55, dark = false } = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = r * 0.6; ctx.shadowOffsetY = r * 0.12;
  fillRR(ctx, x, y, w, h, r, dark ? 'rgba(20,22,30,0.45)' : tint);
  ctx.restore();
  ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
  ctx.fillStyle = grad(ctx, 0, y, 0, y + h, ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.08)']);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.save();
  rr(ctx, x + 1, y + 1, w - 2, h - 2, r);
  ctx.strokeStyle = grad(ctx, x, y, x + w, y + h, [`rgba(255,255,255,${rim})`, 'rgba(255,255,255,0.08)', `rgba(255,255,255,${rim * 0.6})`]);
  ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.stroke();
  ctx.restore();
}

const APPS = {
  phone: [['#6af08a', '#21c046'], 'phone'], messages: [['#6af08a', '#1fbf45'], 'message'], mail: [['#5ac0ff', '#1673f0'], 'mail'],
  safari: [['#62c9ff', '#1d6ff2'], 'search'], music: [['#ff6b86', '#f5203f'], 'music'], photos: [['#ffffff', '#f1f1f4'], 'photos'],
  camera: [['#9aa0a8', '#5d636c'], 'camera'], maps: [['#7be08e', '#2a9cf0'], 'map'], weather: [['#5ab8ff', '#1f63d6'], 'sun'],
  calendar: [['#ffffff', '#f4f4f6'], 'calendar'], clock: [['#2a2a2e', '#0b0b0d'], 'clock'], notes: [['#ffe680', '#ffcc25'], 'note'],
  settings: [['#a7acb4', '#6d727b'], 'gear'], wallet: [['#2a2a2e', '#0b0b0d'], 'wallet'], fitness: [['#2a2a2e', '#0b0b0d'], 'fitness'],
  store: [['#5ac8ff', '#1474f5'], 'store'], tv: [['#2a2a2e', '#0b0b0d'], 'tv'], health: [['#ffffff', '#f2f2f4'], 'heart'],
  home: [['#ffb44d', '#ff8a00'], 'home'], files: [['#5ac0ff', '#1673f0'], 'note'],
};
const APP_NAMES = { phone: 'Phone', messages: 'Messages', mail: 'Mail', safari: 'Safari', music: 'Music', photos: 'Photos', camera: 'Camera', maps: 'Maps', weather: 'Weather', calendar: 'Calendar', clock: 'Clock', notes: 'Notes', settings: 'Settings', wallet: 'Wallet', fitness: 'Fitness', store: 'App Store', tv: 'TV', health: 'Health', home: 'Home', files: 'Files' };

function appIcon(ctx, id, x, y, s, { label = false, labelColor = '#fff', round = false } = {}) {
  const [cols, g] = APPS[id] || APPS.settings;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = s * 0.12; ctx.shadowOffsetY = s * 0.04;
  if (round) { ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2); } else squircle(ctx, x, y, s);
  ctx.fillStyle = grad(ctx, x, y, x, y + s, cols); ctx.fill();
  ctx.restore();
  // glass specular: a soft highlight on the top edge
  ctx.save();
  if (round) { ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2); } else squircle(ctx, x, y, s);
  ctx.clip();
  ctx.fillStyle = grad(ctx, 0, y, 0, y + s * 0.5, ['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']);
  ctx.fillRect(x, y, s, s * 0.5);
  ctx.restore();
  const light = cols[0] === '#ffffff';
  if (id === 'photos') {
    const petals = ['#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#bf5af2', '#ff375f', '#ff453a'];
    for (let i = 0; i < 8; i++) {
      ctx.save(); ctx.translate(x + s / 2, y + s / 2); ctx.rotate(i * Math.PI / 4); ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.17, s * 0.09, s * 0.17, 0, 0, Math.PI * 2); ctx.fillStyle = petals[i]; ctx.fill(); ctx.restore();
    }
  } else if (id === 'calendar') {
    text(ctx, new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), x + s / 2, y + s * 0.3, { size: s * 0.16, weight: 600, color: '#ff3b30', align: 'center', font: F });
    text(ctx, String(new Date().getDate()), x + s / 2, y + s * 0.8, { size: s * 0.46, weight: 300, color: '#111', align: 'center', font: F });
  } else if (id === 'fitness') {
    ['#fa114f', '#a6ff00', '#00f5ea'].forEach((c, i) => { ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s * (0.32 - i * 0.09), -Math.PI / 2, Math.PI * (1.1 - i * 0.3)); ctx.strokeStyle = c; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round'; ctx.stroke(); });
  } else if (id === 'health') glyph(ctx, 'heart', x + s / 2, y + s / 2, s * 0.6, '#ff2d55');
  else glyph(ctx, g, x + s / 2, y + s / 2, s * 0.58, light ? '#222' : '#fff');
  if (label) text(ctx, APP_NAMES[id] || id, x + s / 2, y + s * 1.27, { size: s * 0.19, weight: 500, color: labelColor, align: 'center', font: F });
}

// ---- iOS 27 home screen ------------------------------------------------------------------------------
function iosHome(ctx, w, h) {
  const k = w / 400;
  wallpaper(ctx, w, h, 'blue');
  statusBar(ctx, w, 44 * k, { font: F, size: 17 * k, pad: 30 * k });
  // widgets: weather + calendar
  lg(ctx, 22 * k, 74 * k, 170 * k, 170 * k, 30 * k);
  text(ctx, 'Cupertino', 40 * k, 108 * k, { size: 17 * k, weight: 600, font: F });
  text(ctx, '72°', 40 * k, 166 * k, { size: 52 * k, weight: 300, font: F });
  glyph(ctx, 'sun', 52 * k, 196 * k, 22 * k, '#ffd60a');
  text(ctx, 'Sunny', 70 * k, 203 * k, { size: 15 * k, weight: 600, font: F });
  text(ctx, 'H:78° L:58°', 40 * k, 227 * k, { size: 14 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.85)' });
  lg(ctx, 208 * k, 74 * k, 170 * k, 170 * k, 30 * k);
  text(ctx, new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(), 226 * k, 106 * k, { size: 13 * k, weight: 700, color: '#ff6961', font: F });
  text(ctx, String(new Date().getDate()), 226 * k, 150 * k, { size: 40 * k, weight: 400, font: F });
  fillRR(ctx, 226 * k, 168 * k, 4 * k, 34 * k, 2 * k, '#5ac8fa');
  text(ctx, 'Design review', 238 * k, 182 * k, { size: 14 * k, weight: 600, font: F });
  text(ctx, '10:00 – 11:00 AM', 238 * k, 200 * k, { size: 12.5 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.75)' });
  text(ctx, 'Weather', 107 * k, 264 * k, { size: 12 * k, weight: 500, font: F, align: 'center' });
  text(ctx, 'Calendar', 293 * k, 264 * k, { size: 12 * k, weight: 500, font: F, align: 'center' });
  const grid = ['photos', 'camera', 'mail', 'clock', 'maps', 'notes', 'store', 'settings', 'fitness', 'wallet', 'tv', 'health', 'home', 'files', 'weather', 'calendar'];
  const s = 64 * k, gx = 27 * k, gap = (w - 2 * gx - 4 * s) / 3;
  grid.forEach((id, i) => appIcon(ctx, id, gx + (i % 4) * (s + gap), 290 * k + Math.floor(i / 4) * 98 * k, s, { label: true }));
  // search pill and floating glass dock
  lg(ctx, w / 2 - 50 * k, h - 158 * k, 100 * k, 32 * k, 16 * k);
  glyph(ctx, 'search', w / 2 - 22 * k, h - 142 * k, 15 * k, '#fff');
  text(ctx, 'Search', w / 2 + 8 * k, h - 137 * k, { size: 14 * k, weight: 600, font: F, align: 'center' });
  lg(ctx, 14 * k, h - 114 * k, w - 28 * k, 96 * k, 40 * k);
  ['phone', 'safari', 'messages', 'music'].forEach((id, i) => appIcon(ctx, id, 34 * k + i * (s + (w - 68 * k - 4 * s) / 3), h - 98 * k, s));
}

// Lock screen with the glass clock.
function iosLock(ctx, w, h) {
  const k = w / 400;
  wallpaper(ctx, w, h, 'dusk');
  statusBar(ctx, w, 44 * k, { font: F, size: 17 * k, pad: 30 * k });
  text(ctx, dateStr(), w / 2, 130 * k, { size: 21 * k, weight: 600, align: 'center', font: F, color: 'rgba(255,255,255,0.9)' });
  ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.35)'; ctx.shadowBlur = 30 * k;
  text(ctx, clockStr(), w / 2, 250 * k, { size: 128 * k, weight: 700, align: 'center', font: F, color: 'rgba(255,255,255,0.78)' });
  ctx.restore();
  lg(ctx, 22 * k, h - 300 * k, w - 44 * k, 84 * k, 26 * k);
  appIcon(ctx, 'messages', 36 * k, h - 286 * k, 42 * k);
  text(ctx, 'Maya', 92 * k, h - 262 * k, { size: 16 * k, weight: 700, font: F });
  text(ctx, 'Prototype looks amazing in 3D!', 92 * k, h - 240 * k, { size: 14.5 * k, weight: 500, font: F });
  lg(ctx, 22 * k, h - 204 * k, w - 44 * k, 70 * k, 26 * k);
  fillRR(ctx, 36 * k, h - 192 * k, 46 * k, 46 * k, 10 * k, grad(ctx, 0, 0, 0, 50, ['#ff9f0a', '#ff375f']));
  text(ctx, 'Now Playing', 94 * k, h - 172 * k, { size: 14 * k, weight: 700, font: F });
  text(ctx, 'Glass Horizons', 94 * k, h - 152 * k, { size: 13.5 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.8)' });
  glyph(ctx, 'pause', w - 70 * k, h - 169 * k, 24 * k, '#fff');
  for (const [x, g] of [[64, 'flash'], [336, 'camera']]) {
    lg(ctx, (x - 25) * k, h - 98 * k, 50 * k, 50 * k, 25 * k, { dark: true });
    glyph(ctx, g, x * k, h - 73 * k, 22 * k, '#fff');
  }
  fillRR(ctx, w / 2 - 70 * k, h - 18 * k, 140 * k, 5 * k, 3 * k, '#fff');
}

// ---- iPadOS 27: windows with traffic lights, menu bar and dock ------------------------------------------
function trafficLights(ctx, x, y, s) { ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.beginPath(); ctx.arc(x + i * s * 1.7, y, s / 2, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }); }
function windowFrame(ctx, x, y, w, h, title, k, { light = true } = {}) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 40 * k; ctx.shadowOffsetY = 12 * k;
  fillRR(ctx, x, y, w, h, 22 * k, light ? '#f6f6f8' : '#1e1f24'); ctx.restore();
  trafficLights(ctx, x + 22 * k, y + 22 * k, 12 * k);
  text(ctx, title, x + w / 2, y + 28 * k, { size: 15 * k, weight: 700, font: F, color: light ? '#111' : '#fff', align: 'center' });
}
function ipadOS(ctx, w, h) {
  const k = w / 1180;
  wallpaper(ctx, w, h, 'sea');
  // menu bar
  text(ctx, 'Notes   File   Edit   Format   View   Window', 110 * k, 30 * k, { size: 16 * k, weight: 600, font: F });
  statusBar(ctx, w, 30 * k, { font: F, size: 16 * k, pad: 26 * k });
  // Notes window with a glass sidebar
  const x = 50 * k, y = 70 * k, ww = 640 * k, hh = 560 * k;
  windowFrame(ctx, x, y, ww, hh, '', k);
  lg(ctx, x + 10 * k, y + 46 * k, 200 * k, hh - 56 * k, 18 * k, { tint: 'rgba(220,225,235,0.75)', rim: 0.9 });
  ['All iCloud', 'Spatial UI', 'Prototypes', 'Recently Deleted'].forEach((t, i) => {
    if (i === 1) fillRR(ctx, x + 18 * k, y + 64 * k + i * 40 * k, 184 * k, 34 * k, 10 * k, 'rgba(255,204,0,0.35)');
    text(ctx, t, x + 32 * k, y + 87 * k + i * 40 * k, { size: 15 * k, weight: 500, font: F, color: '#222' });
  });
  text(ctx, 'Depth-first layout', x + 236 * k, y + 96 * k, { size: 26 * k, weight: 700, font: F, color: '#111' });
  ['Glass sits above content, never in it', 'Controls float in their own layer', 'Content scrolls under the glass', 'Corners follow the hardware radius'].forEach((t, i) => {
    ctx.beginPath(); ctx.arc(x + 246 * k, y + 136 * k + i * 36 * k, 5 * k, 0, Math.PI * 2); ctx.fillStyle = '#ffcc00'; ctx.fill();
    text(ctx, t, x + 262 * k, y + 142 * k + i * 36 * k, { size: 16 * k, weight: 400, font: F, color: '#333' });
  });
  fillRR(ctx, x + 236 * k, y + 300 * k, 380 * k, 220 * k, 16 * k, grad(ctx, 0, y + 300 * k, 0, y + 520 * k, ['#c7e3ff', '#8ab8ff']));
  for (let i = 0; i < 3; i++) lg(ctx, x + (256 + i * 40) * k, y + (320 + i * 40) * k, 220 * k, 110 * k, 14 * k);
  // Photos window, overlapping
  const x2 = 610 * k, y2 = 150 * k, w2 = 520 * k, h2 = 470 * k;
  windowFrame(ctx, x2, y2, w2, h2, 'Photos', k, { light: false });
  const hues = [200, 20, 280, 140, 330, 45, 190, 260, 100];
  for (let i = 0; i < 9; i++) {
    const cx = x2 + 14 * k + (i % 3) * 166 * k, cy = y2 + 50 * k + Math.floor(i / 3) * 136 * k;
    fillRR(ctx, cx, cy, 160 * k, 130 * k, 8 * k, grad(ctx, cx, cy, cx + 160 * k, cy + 130 * k, [`hsl(${hues[i]},70%,62%)`, `hsl(${hues[i] + 40},60%,38%)`]));
  }
  lg(ctx, x2 + w2 / 2 - 130 * k, y2 + h2 - 64 * k, 260 * k, 46 * k, 23 * k, { dark: true });
  text(ctx, 'Years   Months   All Photos', x2 + w2 / 2, y2 + h2 - 34 * k, { size: 14 * k, weight: 600, font: F, align: 'center' });
  // dock
  lg(ctx, w / 2 - 330 * k, h - 106 * k, 660 * k, 92 * k, 34 * k);
  ['messages', 'safari', 'mail', 'photos', 'notes', 'music', 'files', 'settings'].forEach((id, i) => appIcon(ctx, id, w / 2 - 310 * k + i * 78 * k, h - 92 * k, 64 * k));
}

// ---- macOS 27 desktop ------------------------------------------------------------------------------------
function macDesk(ctx, w, h, { variant = 'mbp' } = {}) {
  const k = w / 1440;
  wallpaper(ctx, w, h, variant === 'imac' ? 'tahoe' : 'blue');
  // transparent menu bar
  text(ctx, 'Finder    File    Edit    View    Go    Window    Help', 44 * k, 26 * k, { size: 15 * k, weight: 600, font: F });
  text(ctx, `${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}   ${clockStr()}`, w - 24 * k, 26 * k, { size: 15 * k, weight: 600, font: F, align: 'right' });
  glyph(ctx, 'wifi', w - 250 * k, 18 * k, 18 * k, '#fff'); glyph(ctx, 'search', w - 216 * k, 19 * k, 16 * k, '#fff');
  if (variant === 'imac') {
    // desktop widgets + Control Center
    lg(ctx, 40 * k, 70 * k, 300 * k, 140 * k, 26 * k);
    text(ctx, 'Up Next', 62 * k, 106 * k, { size: 15 * k, weight: 700, font: F });
    text(ctx, 'Spatial UI review', 62 * k, 140 * k, { size: 22 * k, weight: 600, font: F });
    text(ctx, '2:00 PM · Studio B', 62 * k, 170 * k, { size: 15 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.8)' });
    lg(ctx, 40 * k, 228 * k, 300 * k, 300 * k, 26 * k);
    text(ctx, 'Screen Time', 62 * k, 264 * k, { size: 15 * k, weight: 700, font: F });
    [0.5, 0.8, 0.35, 0.9, 0.6, 0.4, 0.7].forEach((v, i) => fillRR(ctx, (66 + i * 38) * k, (500 - v * 200) * k, 24 * k, v * 200 * k, 6 * k, i === 3 ? '#5ac8fa' : 'rgba(255,255,255,0.55)'));
    lg(ctx, w - 380 * k, 50 * k, 350 * k, 420 * k, 28 * k);
    [['wifi', 'Wi-Fi', '#0a84ff'], ['bt', 'Bluetooth', '#0a84ff'], ['moon', 'Focus', '#5e5ce6']].forEach(([g, t, c], i) => {
      ctx.beginPath(); ctx.arc(w - 340 * k, (100 + i * 58) * k, 20 * k, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
      glyph(ctx, g, w - 340 * k, (100 + i * 58) * k, 20 * k, '#fff');
      text(ctx, t, w - 306 * k, (106 + i * 58) * k, { size: 16 * k, weight: 600, font: F });
    });
    for (const [label, y, v] of [['Display', 300, 0.75], ['Sound', 380, 0.45]]) {
      text(ctx, label, w - 356 * k, y * k, { size: 15 * k, weight: 700, font: F });
      fillRR(ctx, w - 356 * k, (y + 14) * k, 300 * k, 30 * k, 15 * k, 'rgba(255,255,255,0.18)');
      fillRR(ctx, w - 356 * k, (y + 14) * k, 300 * v * k, 30 * k, 15 * k, '#fff');
    }
  } else {
    // Finder window with a floating glass sidebar
    const x = 200 * k, y = 110 * k, ww = 820 * k, hh = 560 * k;
    windowFrame(ctx, x, y, ww, hh, '', k * 1.1);
    lg(ctx, x + 10 * k, y + 10 * k, 210 * k, hh - 20 * k, 20 * k, { tint: 'rgba(210,218,232,0.8)', rim: 0.95 });
    trafficLights(ctx, x + 32 * k, y + 34 * k, 13 * k);
    ['Favorites', 'AirDrop', 'Recents', 'Applications', 'Desktop', 'Documents', 'Downloads', 'Spatial UI'].forEach((t, i) => {
      if (i === 7) fillRR(ctx, x + 18 * k, y + 64 * k + i * 38 * k, 194 * k, 32 * k, 9 * k, 'rgba(10,132,255,0.25)');
      text(ctx, t, x + (i ? 36 : 28) * k, y + 86 * k + i * 38 * k, { size: (i ? 15 : 12.5) * k, weight: i ? 500 : 700, font: F, color: i ? '#222' : '#777' });
    });
    text(ctx, 'Spatial UI', x + 250 * k, y + 44 * k, { size: 18 * k, weight: 700, font: F, color: '#111' });
    const files = ['Glass Layers', 'Island Stack', 'Ornaments', 'Depth Grid', 'Motion', 'Specs', 'Icons', 'Prototype'];
    files.forEach((t, i) => {
      const cx = x + 280 * k + (i % 4) * 130 * k, cy = y + 90 * k + Math.floor(i / 4) * 170 * k;
      fillRR(ctx, cx, cy, 90 * k, 70 * k, 10 * k, grad(ctx, cx, cy, cx, cy + 70 * k, ['#8ccaff', '#3f8ef0']));
      fillRR(ctx, cx, cy - 8 * k, 40 * k, 14 * k, 5 * k, '#6fb2ff');
      text(ctx, t, cx + 45 * k, cy + 98 * k, { size: 14 * k, weight: 500, font: F, color: '#222', align: 'center' });
    });
  }
  lg(ctx, w / 2 - 420 * k, h - 96 * k, 840 * k, 84 * k, 26 * k);
  ['files', 'safari', 'messages', 'mail', 'maps', 'photos', 'music', 'tv', 'notes', 'calendar', 'store', 'settings'].forEach((id, i) => appIcon(ctx, id, w / 2 - 404 * k + i * 68 * k, h - 86 * k, 62 * k));
}

// ---- watchOS 27 Smart Stack ------------------------------------------------------------------------------
function watchOS(ctx, w, h) {
  const k = w / 300;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  text(ctx, clockStr(), w - 22 * k, 46 * k, { size: 34 * k, weight: 700, font: F, color: '#fff', align: 'right' });
  text(ctx, new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }).toUpperCase(), 22 * k, 40 * k, { size: 16 * k, weight: 700, font: F, color: '#ff9f0a' });
  // stacked widgets, the next ones peeking behind
  fillRR(ctx, 26 * k, 240 * k, w - 52 * k, 60 * k, 22 * k, 'rgba(255,255,255,0.08)');
  fillRR(ctx, 18 * k, 222 * k, w - 36 * k, 60 * k, 24 * k, 'rgba(255,255,255,0.12)');
  lg(ctx, 10 * k, 70 * k, w - 20 * k, 160 * k, 30 * k, { tint: 'rgba(60,64,78,0.85)' });
  ['#fa114f', '#a6ff00', '#00f5ea'].forEach((c, i) => {
    ctx.beginPath(); ctx.arc(70 * k, 150 * k, (46 - i * 13) * k, 0, Math.PI * 2); ctx.strokeStyle = c + '44'; ctx.lineWidth = 10 * k; ctx.stroke();
    ctx.beginPath(); ctx.arc(70 * k, 150 * k, (46 - i * 13) * k, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * [0.82, 0.64, 0.9][i]); ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.stroke();
  });
  [['412/500', '#fa114f'], ['24/30 MIN', '#a6ff00'], ['10/12 HRS', '#00f5ea']].forEach(([t, c], i) => text(ctx, t, 136 * k, (124 + i * 30) * k, { size: 18 * k, weight: 700, font: F, color: c }));
  lg(ctx, 10 * k, 300 * k, w - 20 * k, 52 * k, 26 * k, { tint: 'rgba(60,64,78,0.6)' });
  glyph(ctx, 'sun', 40 * k, 326 * k, 22 * k, '#ffd60a');
  text(ctx, '72° Sunny', 62 * k, 333 * k, { size: 17 * k, weight: 600, font: F });
}

// ---- tvOS 27 ---------------------------------------------------------------------------------------------
function tvOS(ctx, w, h) {
  const k = w / 1600;
  // top shelf hero
  const hero = grad(ctx, 0, 0, w, h * 0.62, ['#1a2f5a', '#5a2a6e', '#c04a4a']);
  ctx.fillStyle = hero; ctx.fillRect(0, 0, w, h);
  blobs(ctx, w, h * 0.62, 'rgba(0,0,0,0)', [[0.7, 0.3, 0.4, 'rgba(255,190,120,0.6)'], [0.25, 0.6, 0.35, 'rgba(90,140,255,0.5)']]);
  ctx.fillStyle = grad(ctx, 0, h * 0.35, 0, h, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']); ctx.fillRect(0, 0, w, h);
  text(ctx, 'HORIZON LINE', 90 * k, 300 * k, { size: 74 * k, weight: 800, font: F, spacing: 6 * k });
  text(ctx, 'New episode Friday · Drama · 4K Dolby Vision', 92 * k, 350 * k, { size: 24 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.85)' });
  lg(ctx, 90 * k, 380 * k, 220 * k, 60 * k, 30 * k, { tint: 'rgba(255,255,255,0.9)' });
  text(ctx, 'Play S2, E1', 200 * k, 419 * k, { size: 22 * k, weight: 700, font: F, color: '#111', align: 'center' });
  lg(ctx, 326 * k, 380 * k, 60 * k, 60 * k, 30 * k); glyph(ctx, 'plus', 356 * k, 410 * k, 26 * k, '#fff');
  // glass tab bar at top
  lg(ctx, w / 2 - 300 * k, 40 * k, 600 * k, 64 * k, 32 * k);
  ['Search', 'Home', 'Apple TV', 'Movies', 'Library'].forEach((t, i) => {
    if (i === 1) fillRR(ctx, w / 2 - 300 * k + 128 * k, 48 * k, 96 * k, 48 * k, 24 * k, 'rgba(255,255,255,0.9)');
    text(ctx, t, w / 2 - 240 * k + i * 118 * k, 81 * k, { size: 20 * k, weight: 600, font: F, color: i === 1 ? '#111' : '#fff', align: 'center' });
  });
  // app row
  const apps = ['tv', 'music', 'photos', 'fitness', 'store', 'settings'];
  apps.forEach((id, i) => {
    const x = 90 * k + i * 240 * k, y = 520 * k, ww = 220 * k, hh = 132 * k;
    const [cols, g] = APPS[id];
    ctx.save(); if (i === 0) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30 * k; }
    fillRR(ctx, x, y - (i === 0 ? 16 * k : 0), ww * (i === 0 ? 1.08 : 1), hh * (i === 0 ? 1.08 : 1), 24 * k, grad(ctx, 0, y, 0, y + hh, cols)); ctx.restore();
    if (id === 'photos') glyph(ctx, 'photos', x + ww / 2, y + hh / 2, 70 * k, '#ff9f0a'); else glyph(ctx, g, x + ww / 2, y + hh / 2 - (i === 0 ? 8 * k : 0), 64 * k, cols[0] === '#ffffff' ? '#222' : '#fff');
  });
}

// ---- visionOS 27 windows -----------------------------------------------------------------------------------
function visionHome(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const k = w / 900;
  const ids = ['tv', 'music', 'safari', 'photos', 'messages', 'mail', 'notes', 'settings', 'store', 'maps', 'calendar', 'fitness'];
  ids.forEach((id, i) => {
    const row = Math.floor(i / 4), col = i % 4, x = 100 * k + col * 190 * k + (row === 1 ? 95 * k : 0) - (row === 1 && col === 3 ? 380 * k : 0), y = 40 * k + row * 175 * k;
    if (row === 1 && col === 3) return;
    appIcon(ctx, id, x, y, 120 * k, { round: true, label: true });
  });
}
function visionSafari(ctx, w, h) {
  const k = w / 1000;
  lg(ctx, 0, 0, w, h, 50 * k, { tint: 'rgba(110,116,130,0.55)', rim: 0.7 });
  fillRR(ctx, 30 * k, 90 * k, w - 60 * k, h - 120 * k, 30 * k, '#fbfbfd');
  lg(ctx, w / 2 - 260 * k, 20 * k, 520 * k, 52 * k, 26 * k, { tint: 'rgba(255,255,255,0.25)' });
  text(ctx, 'displayxr.com', w / 2, 54 * k, { size: 22 * k, weight: 600, font: F, align: 'center' });
  text(ctx, 'Depth, without the headset.', 70 * k, 180 * k, { size: 46 * k, weight: 800, font: F, color: '#111' });
  text(ctx, 'Glasses-free 3D for every app and page.', 70 * k, 230 * k, { size: 24 * k, weight: 400, font: F, color: '#555' });
  fillRR(ctx, 70 * k, 270 * k, w - 140 * k, h - 420 * k, 24 * k, grad(ctx, 0, 270 * k, w, h, ['#6aa9ff', '#a36bff', '#ff7aa8']));
}
function visionPhotos(ctx, w, h) {
  const k = w / 800;
  const g = grad(ctx, 0, 0, w, h, ['#ffb36b', '#ff6f91', '#6a5cff']);
  fillRR(ctx, 0, 0, w, h, 40 * k, g);
  blobs(ctx, w, h, 'rgba(0,0,0,0)', [[0.3, 0.75, 0.45, 'rgba(10,20,60,0.75)'], [0.75, 0.2, 0.3, 'rgba(255,240,200,0.6)']]);
  ctx.globalCompositeOperation = 'destination-in'; fillRR(ctx, 0, 0, w, h, 40 * k, '#000'); ctx.globalCompositeOperation = 'source-over';
  text(ctx, 'Spatial Photo · Big Sur', 40 * k, h - 40 * k, { size: 26 * k, weight: 700, font: F });
}

// ---- iPhone Duo (foldable): two-pane Messages + Notes ---------------------------------------------------
function duo(ctx, w, h) {
  const k = w / 900;
  wallpaper(ctx, w, h, 'sea');
  statusBar(ctx, w, 36 * k, { font: F, size: 16 * k, pad: 30 * k });
  // left pane: Messages list on glass
  lg(ctx, 18 * k, 60 * k, w / 2 - 30 * k, h - 80 * k, 30 * k, { tint: 'rgba(20,24,34,0.55)' });
  text(ctx, 'Messages', 42 * k, 112 * k, { size: 32 * k, weight: 800, font: F });
  [['Maya', 'Prototype looks amazing in 3D!', '#ff9f0a'], ['Design Team', 'Island stack v3 is up', '#0a84ff'], ['Alex', 'Lunch at 1?', '#30d158'], ['Sam', 'Sent the glass specs', '#bf5af2'], ['Jordan', 'Can we test on the panel?', '#ff375f']].forEach(([n, m, c], i) => {
    const y = 150 * k + i * 92 * k;
    if (i === 0) fillRR(ctx, 30 * k, y - 10 * k, w / 2 - 54 * k, 84 * k, 18 * k, 'rgba(10,132,255,0.45)');
    ctx.beginPath(); ctx.arc(76 * k, y + 32 * k, 28 * k, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
    text(ctx, n[0], 76 * k, y + 42 * k, { size: 26 * k, weight: 700, font: F, align: 'center' });
    text(ctx, n, 120 * k, y + 24 * k, { size: 19 * k, weight: 700, font: F });
    text(ctx, m, 120 * k, y + 52 * k, { size: 16 * k, weight: 400, font: F, color: 'rgba(255,255,255,0.75)' });
  });
  // right pane: conversation
  const x = w / 2 + 12 * k, ww = w / 2 - 30 * k;
  fillRR(ctx, x, 60 * k, ww, h - 80 * k, 30 * k, 'rgba(250,250,252,0.96)');
  text(ctx, 'Maya', x + ww / 2, 110 * k, { size: 22 * k, weight: 700, font: F, color: '#111', align: 'center' });
  const bubble = (t, y, me) => {
    ctx.font = `400 ${18 * k}px ${F}`; const tw = ctx.measureText(t).width + 36 * k;
    fillRR(ctx, me ? x + ww - tw - 20 * k : x + 20 * k, y, tw, 46 * k, 23 * k, me ? '#0a84ff' : '#e9e9eb');
    text(ctx, t, me ? x + ww - tw : x + 38 * k, y + 30 * k, { size: 18 * k, weight: 400, font: F, color: me ? '#fff' : '#111' });
  };
  bubble('How does the fold feel?', 150 * k, false); bubble('Like a tiny iPad', 210 * k, true); bubble('Prototype looks amazing in 3D!', 270 * k, false);
  fillRR(ctx, x + 20 * k, 340 * k, ww * 0.6, ww * 0.42, 22 * k, grad(ctx, 0, 340 * k, 0, 340 * k + ww * 0.42, ['#ffb36b', '#6a5cff']));
  lg(ctx, x + 20 * k, h - 92 * k, ww - 40 * k, 52 * k, 26 * k, { tint: 'rgba(0,0,0,0.06)', rim: 0.3 });
  text(ctx, 'iMessage', x + 44 * k, h - 59 * k, { size: 18 * k, weight: 400, font: F, color: '#999' });
}

// =====================================================================================================
// Spatial concepts
// =====================================================================================================

// Small helper: a textured mesh whose texture repaints on demand.
function texPanel(w, h, r, px, draw, opts = {}) {
  const tex = canvasTex(Math.round(px * w / h), px, draw);
  const m = panel(w, h, r, tex, { transparent: true, ...opts });
  m.userData.tex = tex;
  return m;
}

// 1. Liquid Glass, layered: a home screen pulled apart into its real layers.
function conceptLayers() {
  const group = new THREE.Group(), targets = [];
  const H = 0.84, W = H * 0.46;
  const frame = new THREE.Group(); frame.position.x = -0.16; group.add(frame);
  // wallpaper, deepest
  const wall = texPanel(W, H, 0.06, 900, (c, w, h) => { wallpaper(c, w, h, 'blue'); });
  wall.material.transparent = false; wall.material.depthWrite = true;
  wall.position.z = -0.24; frame.add(wall);
  // widgets layer
  const widgets = texPanel(W * 0.92, 0.2, 0.03, 400, (c, w, h) => {
    const k = w / 380;
    lg(c, 0, 0, 180 * k, h, 26 * k);
    text(c, '72°', 18 * k, 92 * k, { size: 54 * k, weight: 300, font: F });
    text(c, 'Sunny · Cupertino', 18 * k, 130 * k, { size: 17 * k, weight: 600, font: F });
    lg(c, 200 * k, 0, 180 * k, h, 26 * k);
    text(c, 'MONDAY', 218 * k, 40 * k, { size: 15 * k, weight: 700, font: F, color: '#ff6961' });
    text(c, 'Design review', 218 * k, 100 * k, { size: 19 * k, weight: 600, font: F });
    text(c, '10:00 AM', 218 * k, 128 * k, { size: 16 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.8)' });
  });
  widgets.position.set(0, H * 0.3, -0.13); frame.add(widgets);
  // icons: each its own glass tile that lifts on hover
  const ids = ['photos', 'camera', 'mail', 'clock', 'maps', 'notes', 'store', 'settings', 'fitness', 'wallet', 'tv', 'health'];
  const icons = [], s = W * 0.19, gap = (W * 0.92 - 4 * s) / 3;
  ids.forEach((id, i) => {
    const m = texPanel(s, s * 1.32, 0, 256, (c, w, h) => appIcon(c, id, 0, 0, w, { label: true }));
    const x = -W * 0.46 + s / 2 + (i % 4) * (s + gap), y = H * 0.12 - Math.floor(i / 4) * s * 1.42;
    m.position.set(x, y, -0.06);
    m.userData = { ...m.userData, kind: 'icon', id, home: m.position.clone(), z: new Spring(-0.06, 220, 20), sc: new Spring(1, 220, 20) };
    frame.add(m); targets.push(m); icons.push(m);
  });
  // search pill + dock, floating highest
  const dock = texPanel(W * 0.96, 0.13, 0.05, 300, (c, w, h) => {
    const k = h / 100;
    lg(c, 0, 0, w, h, 42 * k);
    ['phone', 'safari', 'messages', 'music'].forEach((id, i) => appIcon(c, id, w * 0.06 + i * w * 0.235, 16 * k, 68 * k));
  });
  dock.position.set(0, -H * 0.4, 0.05); frame.add(dock);
  const search = texPanel(0.12, 0.036, 0.018, 120, (c, w, h) => { lg(c, 0, 0, w, h, h / 2); glyph(c, 'search', h * 0.6, h / 2, h * 0.45, '#fff'); text(c, 'Search', w / 2 + h * 0.2, h * 0.66, { size: h * 0.42, weight: 600, font: F, align: 'center' }); });
  search.position.set(0, -H * 0.31, 0.03); frame.add(search);
  // a thin glass slab at the device plane so the layers read as "inside" the phone
  const shell = glassCard(W + 0.02, H + 0.02, 0.07, { opacity: 0.05, depth: 0.004 });
  shell.position.z = 0.0; frame.add(shell);
  // the app sheet that springs out of an icon
  const sheet = texPanel(W * 1.05, H * 0.8, 0.05, 900, () => {});
  sheet.visible = false; frame.add(sheet);
  const sheetT = new Spring(0, 140, 17);
  let openId = null, openFrom = null;
  const drawSheet = (id) => {
    const c = sheet.userData.tex.image.getContext('2d'), w = c.canvas.width, h = c.canvas.height, k = w / 420;
    c.clearRect(0, 0, w, h);
    lg(c, 0, 0, w, h, 44 * k, { tint: 'rgba(28,30,40,0.82)', rim: 0.8 });
    appIcon(c, id, 26 * k, 26 * k, 64 * k);
    text(c, APP_NAMES[id], 106 * k, 70 * k, { size: 30 * k, weight: 800, font: F });
    for (let i = 0; i < 5; i++) {
      lg(c, 24 * k, (120 + i * 96) * k, w - 48 * k, 82 * k, 22 * k, { tint: 'rgba(255,255,255,0.1)' });
      fillRR(c, 40 * k, (134 + i * 96) * k, 54 * k, 54 * k, 14 * k, `hsl(${(i * 67 + id.length * 30) % 360},70%,60%)`);
      text(c, ['Today', 'Shared with you', 'Pinned', 'Recent', 'Suggested'][i], 108 * k, (158 + i * 96) * k, { size: 19 * k, weight: 700, font: F });
      text(c, 'Glass floats above, content scrolls beneath', 108 * k, (182 + i * 96) * k, { size: 14.5 * k, weight: 400, font: F, color: 'rgba(255,255,255,0.7)' });
    }
    sheet.userData.tex.needsUpdate = true;
  };
  sheet.userData.kind = 'sheet'; targets.push(sheet);
  const spread = new Spring(0.2, 30, 9); spread.to = 1;
  // Layer callouts to the right of the phone, each riding at its layer's depth.
  const tag = (title, sub, y) => {
    const m = texPanel(0.36, 0.07, 0, 140, (c, w, h) => {
      const k = h / 70;
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(46 * k, h / 2); c.stroke();
      c.beginPath(); c.arc(4 * k, h / 2, 4 * k, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
      text(c, title, 58 * k, 30 * k, { size: 22 * k, weight: 700, font: F });
      text(c, sub, 58 * k, 56 * k, { size: 16 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.65)' });
    });
    m.position.set(W / 2 + 0.17, y, 0); frame.add(m); return m;
  };
  const tags = [
    [tag('Glass controls', 'dock and search, in front of the screen', -H * 0.38), () => dock.position.z],
    [tag('App icons', 'lift out of the glass on hover', -H * 0.02), () => -0.06 * spread.v],
    [tag('Widgets', 'just under the glass', H * 0.3), () => widgets.position.z],
    [tag('Wallpaper', 'deepest layer, behind the screen', H * 0.46), () => wall.position.z],
  ];
  return {
    group, targets,
    enter() { spread.v = 0.15; spread.to = 1; },
    update(dt, t, hit) {
      const sp = spread.step(dt);
      wall.position.z = -0.24 * sp; widgets.position.z = -0.13 * sp; dock.position.z = 0.05 * sp; search.position.z = 0.03 * sp;
      frame.rotation.y = -0.3 + Math.sin(t * 0.3) * 0.14;
      for (const [m, z] of tags) m.position.z = z(); frame.rotation.x = Math.sin(t * 0.23) * 0.05;
      const hov = hit?.object?.userData.kind === 'icon' ? hit.object : null;
      for (const m of icons) {
        const u = m.userData;
        u.z.to = (hov === m ? 0.1 : -0.06) * sp + (hov === m ? 0 : 0); u.sc.to = hov === m ? 1.18 : 1;
        m.position.z = u.z.step(dt); m.scale.setScalar(u.sc.step(dt));
      }
      const o = sheetT.step(dt);
      sheet.visible = o > 0.01;
      if (sheet.visible && openFrom) {
        sheet.position.set(openFrom.x * (1 - o), openFrom.y * (1 - o), openFrom.z + (0.12 - openFrom.z) * o);
        sheet.scale.setScalar(0.15 + 0.85 * o);
        sheet.material.opacity = Math.min(1, o * 1.4);
      }
    },
    click(hit) {
      const m = hit?.object;
      if (openId) { openId = null; sheetT.to = 0; return; }
      if (m?.userData.kind === 'icon') { openId = m.userData.id; openFrom = m.position.clone(); drawSheet(openId); sheetT.v = 0; sheetT.to = 1; }
    },
  };
}

// 2. Dynamic Island, volumetric: live activities rise out of the island as a stack of glass capsules.
const ACTIVITIES = [
  { id: 'music', title: 'Glass Horizons', sub: 'Aurora Lane', color: ['#ff9f0a', '#ff375f'], draw: 'wave' },
  { id: 'ride', title: 'Driver arriving', sub: '3 min · Silver EV · 7KD 219', color: ['#30d158', '#0a84ff'], draw: 'eta' },
  { id: 'timer', title: 'Timer', sub: 'Pasta', color: ['#ff9f0a', '#ffcc00'], draw: 'timer' },
  { id: 'flight', title: 'UA 1543 · SFO → JFK', sub: 'Boarding 10:40 · Gate 72', color: ['#5ac8fa', '#5e5ce6'], draw: 'flight' },
  { id: 'score', title: 'Warriors 98 – 94 Lakers', sub: 'Q4 · 2:31', color: ['#ffcc00', '#5856d6'], draw: 'score' },
];
function drawActivity(c, w, h, a, t, expanded) {
  const k = h / 120;
  c.clearRect(0, 0, w, h);
  c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16 * k;
  fillRR(c, 6 * k, 6 * k, w - 12 * k, h - 12 * k, (h - 12 * k) / 2, 'rgba(6,6,8,0.96)'); c.restore();
  strokeRR(c, 7 * k, 7 * k, w - 14 * k, h - 14 * k, (h - 14 * k) / 2, 'rgba(255,255,255,0.22)', 2 * k);
  fillRR(c, 26 * k, 24 * k, 72 * k, 72 * k, 18 * k, grad(c, 0, 24 * k, 0, 96 * k, a.color));
  const icon = { music: 'music', ride: 'car', timer: 'clock', flight: 'plane', score: 'sparkle' }[a.id];
  glyph(c, icon, 62 * k, 60 * k, 40 * k, '#fff');
  text(c, a.title, 116 * k, 54 * k, { size: 25 * k, weight: 700, font: F });
  text(c, a.sub, 116 * k, 86 * k, { size: 19 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.7)' });
  const rx = w - 40 * k;
  if (a.draw === 'wave') for (let i = 0; i < 6; i++) { const v = 0.35 + 0.65 * Math.abs(Math.sin(t * 3 + i * 1.3)); fillRR(c, rx - 70 * k + i * 12 * k, 60 * k - v * 26 * k, 7 * k, v * 52 * k, 3 * k, a.color[0]); }
  if (a.draw === 'eta') { text(c, '3', rx - 40 * k, 70 * k, { size: 44 * k, weight: 700, font: F, color: '#30d158', align: 'right' }); text(c, 'min', rx, 70 * k, { size: 18 * k, weight: 600, font: F, color: '#30d158', align: 'right' }); }
  if (a.draw === 'timer') { const s = Math.max(0, 540 - Math.floor(t)) ; text(c, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, rx, 72 * k, { size: 38 * k, weight: 600, font: F, color: '#ff9f0a', align: 'right' }); }
  if (a.draw === 'flight') { glyph(c, 'plane', rx - 30 * k, 60 * k, 40 * k, '#5ac8fa'); }
  if (a.draw === 'score') { text(c, 'LIVE', rx, 70 * k, { size: 20 * k, weight: 800, font: F, color: '#ff453a', align: 'right' }); }
  if (expanded) {
    fillRR(c, 116 * k, h - 30 * k, w - 160 * k, 6 * k, 3 * k, 'rgba(255,255,255,0.2)');
    fillRR(c, 116 * k, h - 30 * k, (w - 160 * k) * (0.3 + 0.5 * ((t * 0.05) % 1)), 6 * k, 3 * k, a.color[0]);
  }
}
function conceptIsland() {
  const group = new THREE.Group(), targets = [];
  const ph = D.phone({ color: 0x2f3f5c, cut: 'island', screen: { draw: iosLock } });
  const phone = new THREE.Group(); phone.add(ph); phone.scale.setScalar(0.82);
  phone.position.set(-0.52, -0.06, -0.12); phone.rotation.y = 0.32; group.add(phone);
  const islandPos = new THREE.Vector3(-0.52 + 0.0, 0.25, -0.08);
  const caps = ACTIVITIES.map((a, i) => {
    const m = texPanel(0.62, 0.124, 0, 240, (c, w, h, t) => drawActivity(c, w, h, a, t, false));
    m.userData = { ...m.userData, kind: 'cap', i, a, p: { x: new Spring(islandPos.x), y: new Spring(islandPos.y), z: new Spring(islandPos.z), s: new Spring(0.2) } };
    group.add(m); targets.push(m);
    return m;
  });
  let order = ACTIVITIES.map((_, i) => i), rise = 0, repaint = 0;
  const layout = (hovI) => {
    order.forEach((ci, slot) => {
      const p = caps[ci].userData.p, hov = hovI === ci;
      // slot 0 = the expanded primary, nearest the viewer; the rest step up and back
      p.x.to = 0.16 + slot * 0.05; p.y.to = slot ? 0.07 - (slot - 1) * 0.125 : 0.24; p.z.to = 0.12 - slot * 0.085 + (hov ? 0.05 : 0);
      p.s.to = (slot === 0 ? 1.25 : 1 - slot * 0.06) * (hov ? 1.06 : 1);
    });
  };
  // a faint beam linking the island to the stack
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x9fc6ff, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.02, 1, 12, 1, true), beamMat);
  beam.visible = false; // reads as a grey bar in 2D; kept for experiments on the panel
  group.add(beam);
  return {
    group, targets,
    enter() { rise = 0; caps.forEach((m) => { const p = m.userData.p; p.x.v = islandPos.x; p.y.v = islandPos.y; p.z.v = islandPos.z; p.s.v = 0.1; }); },
    update(dt, t, hit) {
      rise = Math.min(1, rise + dt * 0.9);
      layout(hit?.object?.userData.kind === 'cap' ? hit.object.userData.i : -1);
      caps.forEach((m, i) => {
        const p = m.userData.p, slot = order.indexOf(i), go = clamp(rise * 1.6 - slot * 0.15, 0, 1);
        const x = p.x.step(dt), y = p.y.step(dt), z = p.z.step(dt), s = p.s.step(dt);
        m.position.set(islandPos.x + (x - islandPos.x) * go, islandPos.y + (y - islandPos.y) * go, islandPos.z + (z - islandPos.z) * go);
        m.scale.setScalar(Math.max(0.05, s * (0.25 + 0.75 * go)));
        m.renderOrder = 10 - slot;
      });
      repaint -= dt;
      if (repaint <= 0) { repaint = 1 / 15; caps.forEach((m, i) => { const slot = order.indexOf(i); if (slot < 3) { const a = m.userData.a; const c = m.userData.tex.image.getContext('2d'); drawActivity(c, c.canvas.width, c.canvas.height, a, t, slot === 0); m.userData.tex.needsUpdate = true; } }); }
      const top = caps[order[0]].position;
      const mid = top.clone().add(islandPos).multiplyScalar(0.5), len = top.distanceTo(islandPos);
      beam.position.copy(mid); beam.scale.set(1, len, 1);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(islandPos).normalize());
      phone.rotation.y = 0.32 + Math.sin(t * 0.4) * 0.08;
    },
    click(hit) {
      const m = hit?.object;
      if (m?.userData.kind === 'cap') { const i = m.userData.i; order = [i, ...order.filter((x) => x !== i)]; }
      else order.push(order.shift());
    },
  };
}

// 3. Windows & ornaments: a visionOS-style window with its tab bar and toolbar floating in front, and a volume.
function conceptOrnaments() {
  const group = new THREE.Group(), targets = [];
  const TABS = [['photos', 'Library'], ['heart', 'For You'], ['map', 'Places'], ['search', 'Search']];
  let tab = 0, tabHover = -1;
  const win = texPanel(0.92, 0.58, 0.05, 900, (c, w, h) => drawWindow(c, w, h));
  function drawWindow(c, w, h) {
    const k = w / 920;
    lg(c, 0, 0, w, h, 50 * k, { tint: 'rgba(96,102,118,0.62)', rim: 0.75 });
    text(c, TABS[tab][1], 40 * k, 74 * k, { size: 40 * k, weight: 800, font: F });
    if (tab === 0 || tab === 1) {
      for (let i = 0; i < 12; i++) {
        const x = 40 * k + (i % 4) * 212 * k, y = 104 * k + Math.floor(i / 4) * 150 * k, hue = (i * 37 + tab * 120) % 360;
        fillRR(c, x, y, 200 * k, 138 * k, 16 * k, grad(c, x, y, x + 200 * k, y + 138 * k, [`hsl(${hue},70%,65%)`, `hsl(${hue + 50},60%,35%)`]));
      }
    } else if (tab === 2) {
      fillRR(c, 40 * k, 104 * k, w - 80 * k, h - 140 * k, 26 * k, grad(c, 0, 104 * k, w, h, ['#3d7a5c', '#2a5f8f']));
      for (const [x, y, n] of [[0.3, 0.5, 'Big Sur'], [0.62, 0.38, 'Yosemite'], [0.5, 0.75, 'Monterey']]) {
        c.beginPath(); c.arc(x * w, y * h, 22 * k, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
        glyph(c, 'photos', x * w, y * h, 30 * k, '#ff9f0a');
        text(c, n, x * w, y * h + 52 * k, { size: 20 * k, weight: 700, font: F, align: 'center' });
      }
    } else {
      lg(c, 40 * k, 104 * k, w - 80 * k, 70 * k, 35 * k, { tint: 'rgba(255,255,255,0.18)' });
      glyph(c, 'search', 84 * k, 139 * k, 30 * k, '#fff');
      text(c, 'Spatial photos from this summer', 116 * k, 149 * k, { size: 24 * k, weight: 500, font: F, color: 'rgba(255,255,255,0.7)' });
      ['Beaches', 'Sunsets', 'Panoramas', 'Spatial videos'].forEach((t, i) => { lg(c, (40 + i * 210) * k, 200 * k, 196 * k, 56 * k, 28 * k, { tint: 'rgba(255,255,255,0.12)' }); text(c, t, (138 + i * 210) * k, 236 * k, { size: 20 * k, weight: 600, font: F, align: 'center' }); });
    }
  }
  win.position.set(-0.12, 0.04, -0.14); group.add(win);
  // tab bar ornament on the left edge: expands to show labels when hovered
  const tabBar = texPanel(0.09, 0.32, 0.045, 400, (c, w, h) => drawTabs(c, w, h));
  function drawTabs(c, w, h) {
    const k = w / 90;
    c.clearRect(0, 0, w, h);
    lg(c, 0, 0, w, h, 44 * k, { tint: 'rgba(90,96,110,0.7)', rim: 0.8 });
    TABS.forEach(([g], i) => {
      const y = (40 + i * 74) * k;
      if (i === tab) { c.beginPath(); c.arc(w / 2, y + 12 * k, 28 * k, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fill(); }
      if (i === tabHover) { c.beginPath(); c.arc(w / 2, y + 12 * k, 30 * k, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2 * k; c.stroke(); }
      glyph(c, g, w / 2, y + 12 * k, 30 * k, '#fff');
    });
  }
  tabBar.position.set(-0.63, 0.04, 0.0); tabBar.userData.kind = 'tabs'; group.add(tabBar); targets.push(tabBar);
  // label flyout that appears next to the tab bar on hover
  const labels = texPanel(0.16, 0.32, 0.04, 400, (c, w, h) => {
    const k = h / 320;
    lg(c, 0, 0, w, h, 40 * k, { tint: 'rgba(90,96,110,0.7)', rim: 0.8 });
    TABS.forEach(([, t], i) => text(c, t, 20 * k, (64 + i * 74) * k, { size: 22 * k, weight: i === tab ? 800 : 600, font: F }));
  });
  labels.position.set(-0.5, 0.04, 0.02); labels.material.opacity = 0; group.add(labels);
  // toolbar ornament hanging under the window, in front of it
  const tools = texPanel(0.38, 0.07, 0.035, 180, (c, w, h) => {
    const k = h / 70;
    lg(c, 0, 0, w, h, 35 * k, { tint: 'rgba(90,96,110,0.75)', rim: 0.8 });
    ['heart', 'plus', 'search', 'gear'].forEach((g, i) => glyph(c, g, w * (0.14 + i * 0.24), h / 2, 30 * k, '#fff'));
  });
  tools.position.set(-0.12, -0.28, 0.06); group.add(tools);
  // window grabber bar
  const grab = new THREE.Mesh(screenGeo(0.1, 0.012, 0.006), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  grab.position.set(-0.12, -0.36, 0.0); group.add(grab);
  // a volume: a glass box with a sculpture you can spin
  const vol = new THREE.Group(); vol.position.set(0.58, -0.04, 0.0); group.add(vol);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.3), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.1, clearcoat: 1, depthWrite: false }));
  vol.add(box);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  vol.add(edges);
  const sculpt = new THREE.Mesh(new THREE.TorusKnotGeometry(0.075, 0.026, 160, 24), new THREE.MeshPhysicalMaterial({ color: 0x8fb8ff, metalness: 0.2, roughness: 0.08, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1 }));
  sculpt.userData.kind = 'vol'; vol.add(sculpt); targets.push(sculpt);
  const volGrab = grab.clone(); volGrab.position.set(0, -0.25, 0.0); vol.add(volGrab);
  const open = new Spring(0, 160, 18), spin = { v: 0.6 };
  let sheen = 0;
  return {
    group, targets,
    update(dt, t, hit) {
      const k = hit?.object?.userData.kind;
      // which tab the pointer is over (by local y on the bar)
      let th = -1;
      if (k === 'tabs') { const ly = tabBar.worldToLocal(hit.point.clone()).y; th = clamp(Math.floor((0.16 - ly) / 0.32 * 4.3), 0, 3); }
      if (th !== tabHover) { tabHover = th; tabBar.userData.tex.redraw(); }
      open.to = k === 'tabs' ? 1 : 0;
      const o = open.step(dt);
      labels.material.opacity = clamp(o, 0, 1); labels.visible = o > 0.02;
      labels.position.x = -0.6 + 0.1 * o; labels.scale.x = Math.max(0.01, o);
      tabBar.position.z = 0.0 + 0.04 * o;
      if (k === 'vol') spin.v = damp(spin.v, 3, 3, dt); else spin.v = damp(spin.v, 0.6, 2, dt);
      sculpt.rotation.y += spin.v * dt; sculpt.rotation.x = Math.sin(t * 0.5) * 0.4;
      sheen = damp(sheen, k ? 1 : 0, 4, dt);
      win.rotation.y = Math.sin(t * 0.25) * 0.05; win.position.z = -0.14 + sheen * 0.015;
      group.rotation.y = Math.sin(t * 0.2) * 0.06;
    },
    click(hit) {
      if (hit?.object?.userData.kind === 'tabs' && tabHover >= 0) {
        tab = tabHover; win.userData.tex.redraw(); tabBar.userData.tex.redraw(); labels.userData.tex.redraw();
      } else if (hit?.object?.userData.kind === 'vol') spin.v = 12;
    },
  };
}

export { appIcon, lg, wallpaper, APPS, APP_NAMES, trafficLights };

// =====================================================================================================
export default {
  id: 'apple',
  name: 'Apple',
  accent: '#5ac8fa',
  glow: '#7aa8ff',
  lang: 'Liquid Glass',
  langBlurb: "Apple's design language across iOS, iPadOS, macOS, watchOS, tvOS and visionOS: controls and navigation are made of a translucent glass that refracts what is under it, floats in its own layer above content and shrinks out of the way as you scroll. Concentric corners match the hardware.",
  devices: [
    {
      name: 'iPhone 18 Pro', short: 'iPhone 18 Pro', os: 'iOS 27', year: '2026',
      blurb: 'The home screen in Liquid Glass: icons and widgets get glass edges, the dock floats as a glass shelf, and Search sits in a pill above it.',
      ui: ['Floating glass dock and search pill', 'Clear and tinted icon styles with specular edges', 'Widgets as glass cards over the wallpaper', 'Dynamic Island for live activities'],
      build: () => D.phone({ color: 0x3a4a68, cut: 'island', cams: 'apple', screen: { draw: iosHome } }),
    },
    {
      name: 'iPhone 18 Pro Max · Lock Screen', short: 'Lock Screen', os: 'iOS 27', year: '2026',
      blurb: 'The lock screen clock is cut from glass and scales to fit the photo; notifications and Now Playing float on glass platters.',
      ui: ['Glass clock that refracts the wallpaper', 'Notifications stack on translucent platters', 'Flashlight and Camera as glass buttons'],
      build: () => D.phone({ w: 0.38, h: 0.82, color: 0xc06a2f, cut: 'island', cams: 'apple', screen: { draw: iosLock } }),
    },
    {
      name: 'iPhone Duo', short: 'iPhone Duo', os: 'iOS 27', year: '2026',
      blurb: "Apple's first foldable opens into a small tablet, so iOS shows two panes: a glass sidebar list and the conversation side by side.",
      ui: ['Two-pane layouts when unfolded', 'Glass sidebar over the wallpaper', 'Same Liquid Glass controls as iPhone'],
      build: () => D.foldable({ w: 0.36, h: 0.5, color: 0xd9dade, open: Math.PI * 0.84, cams: 'apple', screen: { draw: duo } }),
    },
    {
      name: 'iPad Pro', short: 'iPad Pro', os: 'iPadOS 27', year: '2026',
      blurb: 'Windows you can resize and overlap, with traffic-light controls, a menu bar and a glass dock, while staying touch-first.',
      ui: ['Free-form windows with traffic lights', 'Menu bar on swipe down', 'Floating glass sidebars and tab bars', 'Glass dock'],
      build: () => D.tablet({ color: 0x8e9299, screen: { draw: ipadOS } }),
    },
    {
      name: 'MacBook Pro', short: 'MacBook Pro', os: 'macOS 27', year: '2026',
      blurb: 'A fully transparent menu bar, a glass sidebar that floats inside the window, and a translucent dock.',
      ui: ['Transparent menu bar', 'Floating glass sidebars in Finder and apps', 'Larger, concentric window corners', 'Glass dock and Control Center'],
      build: () => D.laptop({ color: 0x2e3036, screen: { draw: (c, w, h) => macDesk(c, w, h) } }),
    },
    {
      name: 'iMac', short: 'iMac', os: 'macOS 27', year: '2026',
      blurb: 'Widgets live on the desktop, Control Center is a glass panel of toggles and sliders, all over the wallpaper.',
      ui: ['Desktop widgets', 'Glass Control Center', 'Colourful hardware, neutral glass UI'],
      build: () => D.desktop({ color: 0x9cc3e6, screen: { draw: (c, w, h) => macDesk(c, w, h, { variant: 'imac' }) } }),
    },
    {
      name: 'Apple Watch', short: 'Watch', os: 'watchOS 27', year: '2026',
      blurb: 'The Smart Stack: glass widgets that stack under the watch face, with Activity rings and weather a scroll away.',
      ui: ['Smart Stack of glass widgets', 'Activity rings', 'Glass controls over a black OLED face'],
      fit: [0.5, 0.66],
      build: () => D.watch({ shape: 'rect', size: 0.4, color: 0x222428, band: 0x2c3b52, screen: { draw: watchOS } }),
    },
    {
      name: 'Apple Vision Pro', short: 'Vision Pro', os: 'visionOS 27', year: '2026',
      blurb: 'Where Liquid Glass came from: glass windows floating in the room, round app icons on the Home View and spatial photos.',
      ui: ['Windows made of glass that adapt to the light in the room', 'Round icons on the Home View', 'Ornaments float in front of windows', 'Look and tap to select'],
      fit: [1.05, 0.7],
      build: () => D.headset({
        windows: [
          { w: 0.62, h: 0.42, x: -0.36, y: 0.14, z: -0.12, ry: 0.22, screen: { draw: visionSafari } },
          { w: 0.5, h: 0.3, x: 0.22, y: 0.26, z: -0.2, screen: { draw: visionHome } },
          { w: 0.42, h: 0.3, x: 0.48, y: -0.04, z: -0.1, ry: -0.3, screen: { draw: visionPhotos } },
        ],
      }),
    },
    {
      name: 'Apple TV 4K', short: 'Apple TV', os: 'tvOS 27', year: '2026',
      blurb: 'A glass tab bar over full-bleed artwork, and the app row and buttons pick up the same glass highlights.',
      ui: ['Glass tab bar at the top', 'Full-screen top shelf artwork', 'Focus lifts tiles with a glass sheen'],
      build: () => D.streamer({ box: 'square', boxColor: 0x111214, screen: { draw: tvOS } }),
    },
  ],
  concepts: [
    {
      name: 'Liquid Glass, layered', short: 'Glass layers', tagline: 'The home screen pulled apart into its real layers',
      blurb: 'Liquid Glass is already designed as layers: wallpaper, then content, then floating glass controls. On a 3D display those layers can sit at real depths, so the dock and search float in front of the glass and the wallpaper sinks behind it.',
      points: ['Wallpaper behind the screen, widgets just under the glass', 'Icons lift out of the glass when you hover', 'Opening an app springs a glass sheet out of its icon toward you'],
      how: 'Hover an icon to lift it. Click it to open the app sheet, click again to close.',
      hint: 'Hover an icon · click to open',
      build: conceptLayers,
    },
    {
      name: 'Dynamic Island, volumetric', short: 'Island stack', tagline: 'Live Activities rise out of the island as a stack',
      blurb: 'The Dynamic Island already grows to show what is going on. Here it grows forward too: each live activity is a capsule in a stack that rises out of the island, with the one you care about nearest you.',
      points: ['Music, ride, timer, flight and score capsules', 'The front capsule expands with live detail', 'Older activities step back and up, still readable'],
      how: 'Hover a capsule to pull it forward. Click it to make it the primary activity; click empty space to cycle.',
      hint: 'Click a capsule to bring it to the front',
      build: conceptIsland,
    },
    {
      name: 'Windows and ornaments', short: 'Ornaments', tagline: 'visionOS window layout on a glasses-free display',
      blurb: "visionOS puts a window's tab bar and toolbar in front of it as ornaments, and 3D content in volumes. A 3D display can do the same at arm's length: the window sits just behind the glass, its controls float in front, and the volume holds a real object.",
      points: ['The tab bar ornament expands with labels when you look at it', 'The toolbar floats under and in front of the window', 'A volume holds a 3D object you can spin'],
      how: 'Hover the tab bar on the left to expand it and click a tab. Hover or click the sculpture to spin it.',
      hint: 'Hover the left tab bar · click the sculpture',
      build: conceptOrnaments,
    },
  ],
  layouts,
};
