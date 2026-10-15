// Spatial UI/UX Lab: app shell.
//
// One three.js renderer on one persistent <canvas> for the life of the page. In the DisplayXR Browser
// on a 3D display the canvas is an inline-3D window: the runtime owns the eyes (a display rig, 1 unit
// tall), each frame draws once per eye into its half of the double-width buffer, and the page moves
// the CONTENT, never a camera. Anywhere else it renders a 2D preview with a little mouse parallax.
//
// Each brand (js/brands/*.js) has a device carousel (its current interfaces) and three spatial
// concepts. ?brand=apple|google|samsung picks the brand, ?view=devices|1|2|3 the view, ?mono forces 2D.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createInline3D } from '@displayxr/inline3d';
import { EyeCamera, EdgeFeather, DepthCursor, raycastHitTest } from '@displayxr/inline3d/three';
import { fitTo, Spring, clamp, damp } from './kit.js';

const VIRTUAL_DISPLAY_HEIGHT = 1;
const ROTATE_SECONDS = 7;      // dwell on a device that has no 3D apps
const APP_SECONDS = 5.5;       // dwell on each 3D app before the next one (or the next device)
const BRANDS = ['apple', 'google', 'samsung'];
const BRAND_LABELS = { apple: ['Apple', 'Liquid Glass'], google: ['Google', 'Material 3 Expressive'], samsung: ['Samsung', 'One UI'] };

const $ = (id) => document.getElementById(id);
const scrub = $('scrub'), ticks = $('ticks');
const canvas = $('stage'), cover = $('cover'), statusEl = $('status'), info = $('info');
const params = new URLSearchParams(location.search);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- renderer --------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 1);
renderer.setPixelRatio(1);
renderer.autoClear = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(0.6, 1, 1.2); scene.add(key);
scene.add(new THREE.HemisphereLight(0xffffff, 0x202028, 0.5));
const root = new THREE.Group(); scene.add(root);
const content = new THREE.Group(); root.add(content);

// A soft brand-coloured glow far behind the glass.
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.35, toneMapped: false }));
glow.position.z = -0.42; glow.renderOrder = -10; root.add(glow);
const floorLine = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.625, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, side: THREE.DoubleSide }));
floorLine.rotation.x = -Math.PI / 2; floorLine.position.set(0, -0.4, -0.2); floorLine.scale.set(1.4, 0.55, 1); root.add(floorLine);

const eye = new EyeCamera(THREE);
const feather = new EdgeFeather(THREE, { px: 24 });
const monoCam = new THREE.PerspectiveCamera(40, 16 / 9, 0.02, 20);
const monoDist = VIRTUAL_DISPLAY_HEIGHT / 2 / Math.tan(THREE.MathUtils.degToRad(20));
monoCam.position.set(0, 0, monoDist);

// ---- state -------------------------------------------------------------------------------------------
const st = {
  brandId: BRANDS.includes(params.get('brand')) ? params.get('brand') : 'apple',
  view: params.get('view') || 'devices',   // 'devices' or '1' | '2' | '3'
  playing: !params.has('hold'),
  sel: 0, pos: new Spring(0, 60, 15), clock: 0,
  spin: 0, spinV: 0, dragging: false,
  depth: 1,
};
let brand = null;               // the loaded brand module
let carousel = null;            // { group, items: [{ wrap, dev, screens }] }
let concept = null;             // { group, targets, update, click, hover? }
const conceptCache = new Map(); // `${brand}:${i}` -> built concept
const brandCache = new Map();

// ---- picking -----------------------------------------------------------------------------------------
const pickCam = new THREE.PerspectiveCamera(); pickCam.matrixAutoUpdate = false;
let havePickCam = false;
const _a = new THREE.Matrix4(), _b = new THREE.Matrix4(), _pa = new THREE.Vector3(), _pb = new THREE.Vector3();
function setPickCam(eyes) {
  _a.fromArray(eyes[0].xf); _b.fromArray(eyes[eyes.length - 1].xf);
  _pa.setFromMatrixPosition(_a).add(_pb.setFromMatrixPosition(_b)).multiplyScalar(0.5);
  _a.setPosition(_pa);
  pickCam.matrixWorld.copy(_a); pickCam.matrixWorldInverse.copy(_a).invert();
  pickCam.projectionMatrix.fromArray(eyes[0].proj); pickCam.projectionMatrixInverse.copy(pickCam.projectionMatrix).invert();
  havePickCam = true;
}
const camera = () => (sbs ? (havePickCam ? pickCam : null) : monoCam);
const ray = new THREE.Raycaster();
const pointer = { x: 0, y: 0, inside: false, down: null, moved: 0 };
let hoverHit = null;
const cursorTargets = [];   // refilled each frame for the DepthCursor

function targets() {
  if (st.view === 'devices') return carousel ? [...carousel.items.map((it) => it.hitbox), ...(activeInst(carousel.items[st.sel])?.targets || [])] : [];
  return concept?.targets || [];
}
function shown(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
function pick() {
  const cam = camera();
  if (!cam || !pointer.inside) return null;
  ray.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), cam);
  // three's raycaster ignores .visible, so skip hits on hidden meshes (closed sheets, faded panels).
  return ray.intersectObjects(targets(), true).find((h) => shown(h.object)) || null;
}

// ---- brand loading -----------------------------------------------------------------------------------
async function loadBrand(id) {
  if (!brandCache.has(id)) brandCache.set(id, (await import(`./brands/${id}.js`)).default);
  return brandCache.get(id);
}

function buildCarousel(b) {
  const group = new THREE.Group(), items = [];
  for (const dev of b.devices) {
    let model;
    try { model = dev.build(); } catch (e) { console.error('[spatial-ui] device build failed', dev.name, e); continue; }
    const screens = [];
    model.traverse((o) => { if (o.userData.screens) screens.push(...o.userData.screens); });
    const wrap = new THREE.Group();
    const fitted = fitTo(model, dev.fit?.[0] ?? 0.95, dev.fit?.[1] ?? 0.66);
    wrap.add(fitted);
    // Invisible box for picking (cheaper and steadier than the model's own meshes).
    const hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.2), new THREE.MeshBasicMaterial({ visible: false }));
    hitbox.userData.item = items.length;
    wrap.add(hitbox);
    // Where the screen sits in wrap space, so the device's 3D apps can grow out of it.
    wrap.updateMatrixWorld(true);
    const sb = new THREE.Box3();
    fitted.traverse((o) => { if (o.isMesh && o.material?.map && screens.includes(o.material.map)) sb.expandByObject(o); });
    if (sb.isEmpty()) sb.setFromObject(fitted);
    const size = sb.getSize(new THREE.Vector3()), c = sb.getCenter(new THREE.Vector3());
    const box = { w: size.x, h: size.y, cx: c.x, cy: c.y, z: sb.max.z };
    const holder = new THREE.Group();
    holder.position.set(c.x, c.y, sb.max.z + 0.004);
    holder.visible = false;
    wrap.add(holder);
    group.add(wrap);
    items.push({ wrap, dev, screens, hitbox, box, holder, apps: dev.apps || [], cur: -1, inst: new Map(), ext: new Spring(0, 90, 14) });
  }
  return { group, items };
}

// ---- 3D apps on the device screens ----------------------------------------------------------------------
// dev.apps: [{ name, glyph?, blurb?, build(box) → { group, targets?, update?(dt, t, hit, ext), click?(hit), enter?() } }]
// box = { w, h } of the screen; the app's group sits at the screen centre with +z out of the glass, and
// main.js grows it out of the screen (scale.z 0 → 1) when it appears.
const within = (o, root) => { for (; o; o = o.parent) if (o === root) return true; return false; };
const activeInst = (it) => (it && it.cur >= 0 ? it.inst.get(it.cur) : null);
function showApp(it, i) {
  if (!it.apps.length) return;
  i = ((i % it.apps.length) + it.apps.length) % it.apps.length;
  if (it.cur === i) return;
  const prev = activeInst(it);
  if (prev) prev.group.visible = false;
  let inst = it.inst.get(i);
  if (!inst) {
    try { inst = it.apps[i].build(it.box); it.holder.add(inst.group); it.inst.set(i, inst); }
    catch (e) { console.error('[spatial-ui] 3D app build failed', it.dev.name, it.apps[i].name, e); return; }
  }
  inst.group.visible = true;
  it.cur = i; it.ext.v = 0; it.ext.to = 1; st.clock = 0;
  inst.enter?.();
  if (it === carousel.items[st.sel]) renderInfo();
}

function disposeTree(o) {
  o.traverse((m) => {
    m.geometry?.dispose?.();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) { mat.map?.dispose?.(); mat.dispose?.(); }
  });
}

async function setBrand(id, { keepView = false } = {}) {
  st.brandId = id;
  const b = await loadBrand(id);
  if (st.brandId !== id) return;
  brand = b;
  document.documentElement.style.setProperty('--accent', b.accent);
  glow.material.color.set(b.glow || b.accent);
  if (carousel) { content.remove(carousel.group); disposeTree(carousel.group); }
  carousel = buildCarousel(b);
  renderTicks();
  st.sel = 0; st.pos.v = st.pos.to = 0; st.clock = 0;
  if (!keepView) st.view = 'devices';
  renderNav();
  await setView(st.view);
}

// Every interactive scene a brand has, in nav order: the 3D icon layout, the reimagined form factors
// (brand.layouts, keyed 'icons' | 'phone' | 'tablet' | 'monitor' | 'home'), then the spatial concepts ('1'..'3').
const FORMS = { icons: '3D icon layout', phone: 'Phone', tablet: 'Tablet', monitor: 'Monitor', home: 'Home view', os: 'Spatial OS' };
function sceneViews() {
  if (!brand) return [];
  const layouts = (brand.layouts || []).map((l) => ({
    key: l.key, def: l, group: l.key === 'icons' ? '3D icons' : l.key === 'os' ? 'Spatial OS' : 'Reimagined',
    label: l.key === 'icons' ? 'App grid in 3D' : l.key === 'os' ? (l.short || 'Spatial OS') : FORMS[l.key] || l.short || l.name,
  }));
  const reimagined = layouts.filter((x) => x.group === 'Reimagined');
  reimagined.forEach((x, i) => { x.n = i + 1; x.of = reimagined.length; });
  return [
    ...layouts,
    ...brand.concepts.map((c, i) => ({ key: String(i + 1), def: c, group: 'Spatial concepts', label: `${i + 1}. ${c.short || c.name}`, n: i + 1, of: brand.concepts.length })),
  ];
}
const findView = (v) => sceneViews().find((x) => x.key === v);

async function setView(v) {
  if (v !== 'devices' && !findView(v)) v = 'devices';
  st.view = v;
  content.clear();
  concept = null;
  if (v === 'devices') content.add(carousel.group);
  else {
    const keyId = `${brand.id}:${v}`;
    if (!conceptCache.has(keyId)) {
      try { conceptCache.set(keyId, findView(v).def.build()); } catch (e) { console.error('[spatial-ui] scene build failed', v, e); }
    }
    concept = conceptCache.get(keyId);
    if (concept) { content.add(concept.group); concept.enter?.(); }
  }
  const q = new URLSearchParams(location.search);
  q.set('brand', brand.id); q.set('view', v);
  history.replaceState(null, '', '?' + q.toString());
  $('scrubWrap').hidden = v !== 'devices';
  renderViews(); renderInfo();
}

// Scrub bar under the stage: drag through the devices; release snaps to the nearest one.
function renderTicks() {
  scrub.max = String(Math.max(0, carousel.items.length - 1));
  const n = carousel.items.length;
  ticks.innerHTML = carousel.items.map((x, i) => {
    const p = n > 1 ? i / (n - 1) : 0, shift = i === 0 ? 0 : i === n - 1 ? -100 : -50;
    return `<button data-i="${i}" style="left:${(p * 100).toFixed(2)}%;transform:translateX(${shift}%)">${esc(x.dev.short || x.dev.name)}</button>`;
  }).join('');
  ticks.querySelectorAll('button').forEach((b) => (b.onclick = () => select(Number(b.dataset.i), true)));
}
scrub.addEventListener('input', () => {
  const v = Number(scrub.value), k = Math.round(v);
  st.scrubbing = true; st.pos.v = st.pos.to = v; st.pos.vel = 0;
  if (k !== st.sel) { st.sel = k; renderInfo(); }
});
scrub.addEventListener('change', () => { st.scrubbing = false; select(Math.round(Number(scrub.value)), true); });

// ---- UI ------------------------------------------------------------------------------------------------
function renderNav() {
  const nav = $('brands'); nav.innerHTML = '';
  for (const id of BRANDS) {
    const btn = document.createElement('button');
    btn.innerHTML = `${BRAND_LABELS[id][0]}<small>${BRAND_LABELS[id][1]}</small>`;
    btn.setAttribute('aria-pressed', String(id === st.brandId));
    btn.onclick = () => { if (id !== st.brandId) setBrand(id); };
    nav.append(btn);
  }
}
function renderViews() {
  const el = $('views'); el.innerHTML = '';
  const add = (v, label) => {
    const b = document.createElement('button');
    b.textContent = label; b.setAttribute('aria-pressed', String(st.view === v));
    b.onclick = () => setView(v);
    el.append(b);
  };
  const head = (t) => { const s = document.createElement('span'); s.className = 'grp'; s.textContent = t; el.append(s); };
  add('devices', `Today's devices (${brand.devices.length})`);
  let group = null;
  for (const x of sceneViews()) {
    if (x.group !== group) { group = x.group; head(group); }
    add(x.key, x.label);
  }
  $('play').disabled = st.view !== 'devices';
}
function renderInfo() {
  if (!brand) return;
  if (st.view === 'devices') {
    const it = carousel.items[st.sel], d = it.dev;
    info.innerHTML = `
      <div class="eyebrow">${esc(brand.name)} · today's interface</div>
      <h2>${esc(d.name)}</h2>
      <div class="sub">${esc(d.os)}${d.year ? ' · ' + esc(d.year) : ''}</div>
      <p>${esc(d.blurb)}</p>
      ${it.apps.length ? `<div class="apps"><div class="apps-h">3D screen · tap the device for the next app</div>${it.apps.map((a, i) => `<button data-a="${i}" ${i === it.cur ? 'aria-current="true"' : ''}>${esc(a.name)}</button>`).join('')}${it.cur >= 0 && it.apps[it.cur].blurb ? `<p class="appblurb">${esc(it.apps[it.cur].blurb)}</p>` : ''}</div>` : ''}
      ${d.ui?.length ? `<ul>${d.ui.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>` : ''}
      <div class="dots">${carousel.items.map((x, i) => `<button data-i="${i}" ${i === st.sel ? 'aria-current="true"' : ''}>${esc(x.dev.short || x.dev.name)}</button>`).join('')}</div>
      <div class="lang"><b>${esc(brand.lang)}.</b> ${esc(brand.langBlurb)}</div>`;
    info.querySelectorAll('.dots button').forEach((b) => (b.onclick = () => select(Number(b.dataset.i), true)));
    info.querySelectorAll('.apps button').forEach((b) => (b.onclick = () => { showApp(it, Number(b.dataset.a)); st.userHold = 10; }));
    $('counter').textContent = `${st.sel + 1} / ${carousel.items.length}`;
    $('hint').textContent = it.apps.length ? 'Touch what pops out · tap the screen for the next app · drag to turn' : 'Drag to turn the device · click a side device to bring it forward';
  } else {
    const x = findView(st.view), c = x.def;
    const where = x.group === '3D icons' ? 'today\'s layout, in 3D' : x.n ? `${x.group.toLowerCase()} ${x.n} of ${x.of}` : x.group.toLowerCase();
    info.innerHTML = `
      <div class="eyebrow">${esc(brand.name)} · ${esc(where)}</div>
      <h2>${esc(c.name)}</h2>
      <div class="sub">${esc(c.tagline || '')}</div>
      <p>${esc(c.blurb)}</p>
      ${c.points?.length ? `<ul>${c.points.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>` : ''}
      <div class="how">${esc(c.how || 'Hover to lift, click to open.')}</div>
      <div class="lang"><b>${esc(brand.lang)}.</b> ${esc(brand.langBlurb)}</div>`;
    $('counter').textContent = x.n ? `${x.group} · ${x.n} / ${x.of}` : x.group;
    $('hint').textContent = c.hint || 'Hover and click the floating UI';
  }
}

function select(i, user = false) {
  const n = carousel.items.length;
  st.sel = ((i % n) + n) % n;
  // Spring toward the nearest copy of the target so the carousel takes the short way round.
  let to = st.sel; const p = st.pos.to;
  while (to - p > n / 2) to -= n;
  while (p - to > n / 2) to += n;
  st.pos.to = to;
  st.clock = 0;
  if (user) st.userHold = 4;
  renderInfo();
}
function step(dir) {
  if (st.view === 'devices') select(st.sel + dir, true);
  else {
    const keys = ['devices', ...sceneViews().map((x) => x.key)];
    setView(keys[(keys.indexOf(st.view) + dir + keys.length) % keys.length]);
  }
}

$('prev').onclick = () => step(-1);
$('next').onclick = () => step(1);
$('play').onclick = () => { st.playing = !st.playing; $('play').textContent = st.playing ? 'Pause' : 'Play'; };
$('play').textContent = st.playing ? 'Pause' : 'Play';
$('depth').oninput = (e) => { st.depth = Number(e.target.value); };
addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === ' ') { e.preventDefault(); $('play').click(); }
  else if ('0123'.includes(e.key) && brand) setView(e.key === '0' ? 'devices' : e.key);
  else if ('aAgGsS'.includes(e.key) && e.key.length === 1) setBrand({ a: 'apple', g: 'google', s: 'samsung' }[e.key.toLowerCase()]);
});

// Pointer: hover/click picking plus drag-to-turn the front device.
function setPointer(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  pointer.inside = true;
}
canvas.addEventListener('pointermove', (e) => {
  setPointer(e);
  if (pointer.down) {
    const dx = e.clientX - pointer.down.x;
    pointer.moved = Math.max(pointer.moved, Math.abs(dx) + Math.abs(e.clientY - pointer.down.y));
    if (st.view === 'devices' && pointer.moved > 4) { st.dragging = true; st.spin = pointer.down.spin + dx * 0.01; }
    if (concept?.drag && pointer.moved > 4) concept.drag(dx, e.clientY - pointer.down.y);
  }
});
canvas.addEventListener('pointerleave', () => { pointer.inside = false; });
canvas.addEventListener('pointerdown', (e) => {
  setPointer(e);
  pointer.down = { x: e.clientX, y: e.clientY, spin: st.spin }; pointer.moved = 0;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', (e) => {
  setPointer(e);
  const wasClick = pointer.moved < 5;
  pointer.down = null; st.dragging = false;
  concept?.dragEnd?.();
  if (!wasClick) return;
  const hit = pick();
  if (st.view === 'devices') {
    if (hit) {
      const front = carousel.items[st.sel], inst = activeInst(front), k = hit.object.userData.item;
      // Touching what popped out goes to the app; touching the front device's screen opens its next 3D app.
      if (inst && within(hit.object, front.holder)) { inst.click?.(hit); st.userHold = 10; }
      else if (k !== undefined && k !== st.sel) select(k, true);
      else { showApp(front, front.cur + 1); st.userHold = 10; }
    }
  } else if (concept?.click) concept.click(hit);
});

// ---- per-frame update --------------------------------------------------------------------------------
let last = 0, repaint = 0, mono = { x: 0, y: 0 };
const _wrap = (o, n) => { o = ((o % n) + n) % n; return o > n / 2 ? o - n : o; };

let frames = 0;
if (params.has('debug')) setInterval(() => console.info(`[spatial-ui] fps ${frames / 2}`, (frames = 0)), 2000);
function tick(dt, t) {
  frames++;
  root.scale.z = damp(root.scale.z, st.depth, 8, dt);
  cursorTargets.length = 0; cursorTargets.push(...targets());
  hoverHit = pick();
  canvas.classList.toggle('hovering', !!hoverHit);
  if (st.view === 'devices' && carousel) {
    const n = carousel.items.length, frontIt = carousel.items[st.sel];
    // Auto-play: show each of the front device's 3D apps in turn, then move to the next device.
    if (st.userHold > 0) st.userHold -= dt;
    else if (st.playing && !st.dragging && !st.scrubbing) {
      st.clock += dt;
      if (frontIt.apps.length ? st.clock > APP_SECONDS : st.clock > ROTATE_SECONDS) {
        if (frontIt.apps.length && frontIt.cur >= 0 && frontIt.cur < frontIt.apps.length - 1) showApp(frontIt, frontIt.cur + 1);
        else select(st.sel + 1);
      }
    }
    const pos = st.scrubbing ? st.pos.v : st.pos.step(dt);
    if (!st.scrubbing) scrub.value = String(((pos % n) + n) % n);
    if (!st.dragging) st.spin = damp(st.spin, 0, 2.5, dt);
    for (let i = 0; i < n; i++) {
      const it = carousel.items[i], o = _wrap(i - pos, n), a = Math.abs(o), s = Math.sign(o);
      const x = s * (Math.min(a, 1) * 0.62 + Math.max(0, Math.min(a, 2.5) - 1) * 0.26);
      const z = -Math.min(a, 2.5) * 0.15 + (a < 0.5 ? 0.03 * (1 - a * 2) : 0);
      const front = Math.max(0, 1 - a);
      it.wrap.position.set(x, 0.02, z);
      it.wrap.rotation.y = -clamp(o, -1, 1) * 0.75 + front * (Math.sin(t * 0.45) * (it.cur >= 0 ? 0.12 : 0.32) + st.spin);
      it.wrap.scale.setScalar(1 - Math.min(a, 2.5) * 0.16);
      it.wrap.visible = a < 2.7;
      it.hitbox.scale.set(a < 0.5 ? 1 : 0.6, 1, 1);
      // The front device's 3D app grows out of its screen; others sink back in and reset.
      const isFront = i === st.sel && a < 0.35;
      if (isFront && it.apps.length && it.cur < 0) showApp(it, 0);
      if (it.cur >= 0) {
        it.ext.to = isFront ? 1 : 0;
        const e = Math.max(0, it.ext.step(dt));
        it.holder.visible = e > 0.01;
        const g = 0.55 + 0.45 * Math.min(1, e);
        it.holder.scale.set(g, g, Math.max(0.001, e));
        const inst = activeInst(it);
        if (it.holder.visible) inst?.update?.(dt, t, hoverHit && within(hoverHit.object, it.holder) ? hoverHit : null, e);
        if (!isFront && e < 0.02) { if (inst) inst.group.visible = false; it.holder.visible = false; it.cur = -1; }
      }
    }
    repaint -= dt;
    if (repaint <= 0) {
      repaint = 1;
      for (const k of [-1, 0, 1]) carousel.items[(st.sel + k + n) % n].screens.forEach((tx) => tx.redraw(t));
    }
  } else if (concept) {
    concept.update?.(dt, t, hoverHit);
  }
}

// ---- drawing -----------------------------------------------------------------------------------------
function drawEye(cam, vp) {
  renderer.setViewport(vp.x, vp.y, vp.width, vp.height);
  renderer.setScissor(vp.x, vp.y, vp.width, vp.height);
  renderer.render(scene, cam);
  feather.render(renderer, vp);
}
function drawStereo(eyes) {
  renderer.setScissorTest(true);
  renderer.setViewport(0, 0, canvas.width, canvas.height);
  renderer.setScissor(0, 0, canvas.width, canvas.height);
  renderer.clear();
  for (const e of eyes) drawEye(eye.setFromMatrices(e.proj, e.xf), e.vp);
  renderer.setScissorTest(false);
}
function drawMono() {
  const w = canvas.width, h = canvas.height;
  renderer.setScissorTest(true);
  renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h);
  renderer.clear();
  if (sbs) {
    monoCam.aspect = (w / 2) / h; monoCam.updateProjectionMatrix();
    drawEye(monoCam, { x: 0, y: 0, width: w / 2, height: h });
    drawEye(monoCam, { x: w / 2, y: 0, width: w / 2, height: h });
  } else {
    monoCam.aspect = w / h; monoCam.updateProjectionMatrix();
    drawEye(monoCam, { x: 0, y: 0, width: w, height: h });
  }
  renderer.setScissorTest(false);
}

let wall = null, handle = null, sbs = false, lastGood = null, cursor = null;

function onXRFrame(views, layer) {
  const now = performance.now();
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now;
  tick(dt, now / 1000);
  let ok = views && views.length >= 2;
  const eyes = [];
  if (ok) {
    for (const v of views) {
      const vp = layer.getViewport(v);
      if (!vp) { ok = false; break; }
      eyes.push({ proj: Float32Array.from(v.projectionMatrix), xf: Float32Array.from(v.transform.matrix), vp: { x: vp.x, y: vp.y, width: vp.width, height: vp.height } });
    }
  }
  if (ok) { cursor?.update(views, { layer }); lastGood = eyes; setPickCam(eyes); drawStereo(eyes); }
  else if (lastGood) drawStereo(lastGood);
  else drawMono();
}

function onMonoFrame(now) {
  if (sbs) return;
  requestAnimationFrame(onMonoFrame);
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now;
  tick(dt, now / 1000);
  const tx = pointer.inside ? pointer.x * 0.12 : 0, ty = pointer.inside ? pointer.y * 0.07 : 0;
  mono.x += (tx - mono.x) * 0.05; mono.y += (ty - mono.y) * 0.05;
  monoCam.position.set(mono.x, mono.y, monoDist); monoCam.lookAt(0, 0, 0); monoCam.updateMatrixWorld();
  drawMono();
}

// ---- sizing ------------------------------------------------------------------------------------------
const gl = renderer.getContext();
const glMax = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0]);
function sizeCanvas() {
  const dpr = devicePixelRatio || 1;
  let w = Math.round((canvas.clientWidth || 640) * dpr), h = Math.round((canvas.clientHeight || 360) * dpr);
  const totalW = sbs ? w * 2 : w;
  const maxW = sbs ? Math.min(glMax, Math.round(screen.width * dpr)) : glMax;
  const s = Math.min(1, maxW / totalW, glMax / h);
  w = Math.floor(w * s); h = Math.floor(h * s);
  const bw = sbs ? w * 2 : w;
  if (canvas.width === bw && canvas.height === h) return;
  renderer.setSize(bw, h, false);
  if (sbs && lastGood) drawStereo(lastGood); else drawMono();
}
new ResizeObserver(sizeCanvas).observe(canvas);

function setStatus(text, kind) { statusEl.textContent = text; statusEl.dataset.kind = kind || ''; }

// ---- boot ----------------------------------------------------------------------------------------------
async function boot() {
  sizeCanvas();
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]); } catch {}
  const wantView = st.view;
  st.view = wantView;
  await setBrand(st.brandId, { keepView: true });
  if (params.has('device')) { select(Number(params.get('device')) || 0); st.pos.v = st.pos.to; }
  // Test hook: ?settle=N fast-forwards N animation steps (headless browsers barely run rAF).
  if (params.has('settle')) { const n = Number(params.get('settle')) || 240; const t0 = Math.max(0, performance.now() / 1000 - n / 60); for (let i = 0; i < n; i++) tick(1 / 60, t0 + i / 60); }

  if (!params.has('mono')) {
    try { wall = await createInline3D({ lazy: false }); } catch (e) { console.warn('[spatial-ui] inline-3D unavailable', e); }
  }
  if (wall?.supported) {
    sbs = true;
    sizeCanvas();
    cursor = new DepthCursor(THREE, { canvas, hitTest: raycastHitTest(THREE, cursorTargets), raysPerFrame: 3 });
    scene.add(cursor.object);
    handle = wall.addScene(canvas, onXRFrame, {
      virtualDisplayHeight: VIRTUAL_DISPLAY_HEIGHT,
      rectCover: 'auto',
      onLayerLost: () => {
        sbs = false; lastGood = null; havePickCam = false;
        if (cursor) { scene.remove(cursor.object); cursor.dispose(); cursor = null; }
        sizeCanvas(); requestAnimationFrame(onMonoFrame);
        setStatus('3D layer lost: showing 2D', 'warn');
      },
    });
    console.info('[spatial-ui] inline-3D session live: addScene registered, waiting for the first woven frame');
    const r = await handle.firstWoven;
    cover.remove();
    console.info(`[spatial-ui] firstWoven woven=${r.woven} confirmed=${r.confirmed} reason=${r.reason} ms=${Math.round(r.ms)}`);
    setStatus(r.woven ? 'Glasses-free 3D on (DisplayXR)' : '3D window not woven: ' + r.reason, r.woven ? 'ok' : 'warn');
  } else {
    console.info('[spatial-ui] no inline-3D session: rendering 2D');
    cover.remove();
    setStatus('2D preview · open in the DisplayXR Browser for depth', '');
    requestAnimationFrame(onMonoFrame);
  }
  window.lab = { st, setBrand, setView, select, get brand() { return brand; }, get carousel() { return carousel; } };
}
boot().catch((e) => { console.error(e?.stack || e); setStatus('Could not start: ' + (e?.message || e), 'warn'); cover.textContent = 'Could not start the lab.'; });
