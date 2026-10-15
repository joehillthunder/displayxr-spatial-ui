# CLAUDE.md — Spatial UI/UX Lab (displayxr-spatial-ui)

Apple / Google / Samsung design languages on current devices + 3 spatial UI concepts per brand, for glasses-free 3D (Leia panel) via the DisplayXR inline-3D SDK. Linked from the DisplayXR HQ hub (joehillthunder.github.io, Spatial UI/UX wing → `displayxr-spatial-ui/?brand=<id>`).

## Stack and hosting
- Static ES modules, **no build step, no package.json**. three **0.161.0** and `@displayxr/inline3d` **1.45.1** via the jsDelivr import map in `index.html`. Keep those versions pinned (same as every other DisplayXR demo).
- GitHub Pages from `main` root (legacy build + `.nojekyll`). The gh token has no `workflow` scope, so don't add Actions workflows.
- No python or node on the demo PC. Serve locally with the PowerShell HttpListener script (`serve.ps1 -Root <repo> -Port <n>`); port 8765 is the Muse bridge and 8791 is Battle School, so avoid those.

## Files
- `js/main.js`: the only renderer and canvas, the inline-3D session, the device carousel, the concept host, picking, URL state and the UI panel. Brand modules load lazily with `import('./brands/<id>.js')`.
- `js/kit.js`: units, `Spring`/`damp`, rounded geometry (`screenGeo`, `slabGeo`, `panel`, `glassCard`, `fitTo`), `canvasTex(w,h,draw)` (call `tex.redraw(t)` to repaint), 2D helpers (`rr`, `fillRR`, `squircle`, `text`, `blobs`, `statusBar`) and `glyph()`, a set of icons that belong to no brand.
- `js/devices.js`: procedural device builders (`phone`, `tablet`, `foldable` with axis `'y'` book or `'x'` flip, `laptop`, `watch`, `tv`, `desktop`, `hub`, `streamer`, `headset`, `glasses`). Each takes `screen: { draw(ctx,w,h,t) }` and returns a Group with `userData.screens`.
- `js/icons3d.js`: `icon3d({ shape, size, depth, face, side, glass })` (an extruded icon with 2D art on its face; shapes `squircle`, `circle`, `rounded`, `samsung`, `cookie`, `clover`, `pill`), plus `label3d()` and `gridPositions()`.
- `js/pop3d.js`: props for device 3D apps; every builder returns a Group with `userData.update(dt, t)` (run them with `updateAll`).
- Device 3D apps: `dev.apps = [{ name, blurb, build(box) → { group, targets?, update?(dt, t, hit, ext), click?(hit), enter?() } }]` in `<brand>-apps.js`. `box = { w, h }` is the screen; the group sits at the screen centre with +z out of the glass. main.js grows it out (scale.z 0 → 1), auto-plays each app for 5.5 s, and routes taps (on `targets` → `click`; elsewhere on the device → next app). Keep pop-outs within about 0.2 in z. Count elapsed time with `dt`, not with differences in `t`. The `os` layout key is the Spatial OS scene.
- `js/brands/{apple,google,samsung}.js`: default export `{ id, name, accent, glow, lang, langBlurb, devices[], layouts[], concepts[] }`. `layouts` live in `<brand>-layouts.js` with the keys `icons` (today's phone home screen in 3D), `phone`, `tablet`, `monitor` and `home` (the reimagined interfaces), in that order.
  - device: `{ name, short, os, year, blurb, ui[], fit?, build() }`
  - concept: `{ name, short, tagline, blurb, points[], how, hint, build() → { group, targets, update(dt,t,hit), click(hit), enter?, drag?, dragEnd? } }`

## Scene rules (woven canvas)
- Units: the virtual display is **1 unit tall** (`VIRTUAL_DISPLAY_HEIGHT = 1`), about 1.78 wide. z = 0 is the glass and +z points at the viewer. Keep concept content within x ±0.8, y ±0.42, z −0.35…+0.2 for comfortable depth.
- One persistent `<canvas>`, and the page moves **content, never a camera** (display rig). Nothing may sit on the canvas or its ancestors: no border, radius, shadow, filter, opacity, background or backdrop-filter. The `#cover` stays until `firstWoven` and is then removed with a hard cut.
- Repaint canvas textures only when state changes, or on a throttled timer. The carousel repaints the front ±1 devices once a second for the clocks.
- Interfaces are hand-drawn recreations. Use no real logos and no brand marks (product names in text are fine). Keep the footer disclaimer.

## Testing
- URL hooks: `?brand=`, `?view=devices|icons|phone|tablet|monitor|home|os|1|2|3`, `?device=N`, `?hold`, `?mono` (forces 2D), `?settle=N` (fast-forwards N animation steps), `?debug` (logs fps). `window.lab` exposes `{ st, setBrand, setView, select, brand, carousel }`.
- Screenshots: headless Edge with `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --virtual-time-budget=9000 --screenshot=...`, launched from **PowerShell `Start-Process -Wait`**. Launched from Git Bash, it wrote no PNG. Use a separate `--user-data-dir` per run, and add `--enable-logging --v=0` to get console output in `chrome_debug.log`.
- Headless virtual time runs almost no `requestAnimationFrame` frames, so **always add `&settle=300`** when checking animated concepts.
- Check every brand × (devices + views 1–3) for console errors before pushing. Woven output on the real panel can't be screenshotted with GDI; ask the user to check depth and comfort on the Leia display.

## Device lineup (as of Oct 2026, update when lineups change)
- Apple: iPhone 18 Pro / Pro Max (iOS 27), iPhone Duo foldable, iPad Pro, MacBook Pro, iMac (macOS 27), Apple Watch (watchOS 27), Vision Pro (visionOS 27) and Apple TV 4K (tvOS 27).
- Google: Pixel 11 Pro, Pixel 11 Pro Fold (Android 17), Pixel Watch 5, Pixel Tablet, Chromebook Plus, Google TV Streamer, Nest Hub and Android XR glasses.
- Samsung: Galaxy S26 Ultra, Z Fold8 Ultra and Z Flip8 (One UI 9 / Android 17), Galaxy Watch, Tab S11 Ultra, Galaxy Book, Neo QLED TV and Galaxy XR.

## Git
- Commit to `main` only when asked. End commit messages with the Co-Authored-By trailer.
- Other Claude sessions often edit DisplayXR repos at the same time. Check file mtimes and `git status` before touching shared files, and use your own worktree for the hub repo.
