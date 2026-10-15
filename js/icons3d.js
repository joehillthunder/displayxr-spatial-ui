// Solid 3D app icons and text labels, for the "3D icon layout" and "Reimagined" scenes.
//
// icon3d() extrudes the icon's silhouette into a real slab (glossy sides in the icon's colour) and puts
// the 2D icon art on its front face, so a home screen grid can stand out of the glass with true depth.

import * as THREE from 'three';
import { rrShape, canvasTex, FONT } from './kit.js';

// Icon silhouettes, all centred on the origin and `s` wide.
export function iconShape(kind, s) {
  const h = s / 2, sh = new THREE.Shape();
  const poly = (fn, n = 96) => { for (let i = 0; i <= n; i++) { const [x, y] = fn((i / n) * Math.PI * 2); i ? sh.lineTo(x, y) : sh.moveTo(x, y); } return sh; };
  switch (kind) {
    case 'circle': return poly((t) => [Math.cos(t) * h, Math.sin(t) * h]);
    case 'rounded': return rrShape(s, s, s * 0.26);
    case 'samsung': return poly((t) => { const c = Math.cos(t), n = Math.sin(t), e = 2 / 3.6; return [h * Math.sign(c) * Math.abs(c) ** e, h * Math.sign(n) * Math.abs(n) ** e]; });
    case 'cookie': return poly((t) => { const r = h * (0.92 + 0.08 * Math.cos(t * 9)); return [Math.cos(t) * r, Math.sin(t) * r]; }, 180);
    case 'clover': return poly((t) => { const r = h * (0.84 + 0.16 * Math.cos(t * 4)); return [Math.cos(t) * r, Math.sin(t) * r]; }, 160);
    case 'pill': return rrShape(s * 1.6, s * 0.8, s * 0.4);
    case 'squircle':
    default: return poly((t) => { const c = Math.cos(t), n = Math.sin(t), e = 2 / 5; return [h * Math.sign(c) * Math.abs(c) ** e, h * Math.sign(n) * Math.abs(n) ** e]; });
  }
}

function faceGeo(shape, w, h) {
  const g = new THREE.ShapeGeometry(shape, 24);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return g;
}

// A solid icon. face(ctx, w, h) paints the front art edge to edge (the silhouette clips it).
// side: body colour (defaults to a neutral); glass: true makes the body a clear tinted glass.
export function icon3d({ shape = 'squircle', size = 0.1, depth = 0.03, face, side = 0xdddddd, px = 256, glass = false } = {}) {
  const g = new THREE.Group();
  const sh = iconShape(shape, size);
  const w = shape === 'pill' ? size * 1.6 : size, h = shape === 'pill' ? size * 0.8 : size;
  const b = Math.min(depth * 0.35, size * 0.08);
  const body = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.0005, depth - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.9, bevelSegments: 4, curveSegments: 24 });
  body.translate(0, 0, -depth / 2 + b);
  body.computeVertexNormals();
  const mat = glass
    ? new THREE.MeshPhysicalMaterial({ color: side, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({ color: side, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
  const bodyMesh = new THREE.Mesh(body, mat);
  g.add(bodyMesh);
  let tex = null;
  if (face) {
    tex = canvasTex(Math.round(px * w / h), px, face);
    const f = new THREE.Mesh(faceGeo(sh, w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true }));
    f.position.z = depth / 2 + b * 0.05 + 0.0008;
    g.add(f);
    g.userData.faceMesh = f;
  }
  g.userData.tex = tex;
  g.userData.body = bodyMesh;
  return g;
}

// A text label on a transparent plane, `height` units tall; width follows the text.
export function label3d(str, { height = 0.022, color = '#fff', font = FONT.ui, weight = 600, px = 64, shadow = true } = {}) {
  const c = document.createElement('canvas').getContext('2d');
  c.font = `${weight} ${px * 0.72}px ${font}`;
  const tw = Math.ceil(c.measureText(str).width + px * 0.4);
  const tex = canvasTex(tw, px, (ctx, w, h) => {
    ctx.font = `${weight} ${px * 0.72}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = px * 0.12; }
    ctx.fillStyle = color; ctx.fillText(str, w / 2, h / 2 + px * 0.04);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(height * tw / px, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.userData.tex = tex;
  return m;
}

// Grid positions for a cols x rows layout centred on (cx, cy), cell pitch dx, dy (row 0 at the top).
export function gridPositions(cols, rows, dx, dy, cx = 0, cy = 0) {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([cx + (c - (cols - 1) / 2) * dx, cy - (r - (rows - 1) / 2) * dy]);
  return out;
}
