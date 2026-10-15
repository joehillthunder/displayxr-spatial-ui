# Spatial UI/UX Lab

Apple, Google and Samsung design languages on their current devices, and three spatial UI concepts for each brand, in glasses-free 3D on [DisplayXR](https://joehillthunder.github.io/).

**Live:** https://joehillthunder.github.io/displayxr-spatial-ui/ · part of the DisplayXR HQ Spatial UI/UX wing.

| Brand | Design language | Spatial concepts |
|---|---|---|
| Apple (`?brand=apple`) | Liquid Glass · iOS 27, iPadOS 27, macOS 27, watchOS 27, tvOS 27, visionOS 27 | Glass layers · Volumetric Dynamic Island · Windows and ornaments |
| Google (`?brand=google`) | Material 3 Expressive · Android 17, Wear OS, ChromeOS, Google TV, Android XR | Elevation for real · Shape-morph Quick Settings · Gemini space |
| Samsung (`?brand=samsung`) | One UI 9 · Android 17, One UI Watch, Tizen, Android XR | Now Bar deck · Edge Panels in depth · SmartThings 3D map |

Each brand page has:

- **Today's devices**: a carousel of current devices (rotates every 7 s, drag to turn the front one) with hand-drawn recreations of today's interface.
- **3D icons**: today's phone home screen in its traditional layout, rebuilt with solid 3D app icons standing out of the glass.
- **Reimagined**: new spatial interfaces for a phone, a tablet, a desk monitor and the living-room home view.
- **Spatial concepts**: three interactive explorations of the brand's design language in depth.

## Run

Static ES modules, no build step. three 0.161 and `@displayxr/inline3d` 1.45.1 load from jsDelivr through the import map in `index.html`. Serve the folder with any static server and open `index.html`. In the DisplayXR Browser on a 3D display the canvas becomes an inline-3D window (display rig, virtual display height 1); elsewhere it renders a 2D preview.

URL options: `?brand=apple|google|samsung`, `?view=devices|icons|phone|tablet|monitor|home|1|2|3`, `?device=N`, `?hold` (no auto-rotate), `?mono` (force 2D). Test hooks: `?settle=N` fast-forwards N animation steps (headless browsers barely run rAF), `?debug` logs fps.

Keys: ← → step, Space pause, 0–3 views, A/G/S brands.

## Layout

- `js/main.js`: renderer, inline-3D session, carousel, concept host, picking.
- `js/kit.js`: rounded geometry, canvas textures, 2D drawing helpers and a brand-neutral icon set.
- `js/devices.js`: procedural device models (phone, foldable, tablet, laptop, watch, TV, desktop, smart display, streamer, headset, glasses).
- `js/icons3d.js`: solid extruded app icons (`icon3d`), text labels (`label3d`) and grid positions.
- `js/brands/<brand>.js`: devices (name, OS, notes, `build()`) and concepts (`build()` returns `{ group, targets, update, click }`).
- `js/brands/<brand>-layouts.js`: `layouts` keyed `icons`, `phone`, `tablet`, `monitor`, `home` (same shape as concepts).

Interfaces are recreations for comparing design languages, not screenshots; the spatial concepts are explorations, not announced products. Product names are trademarks of their owners.
