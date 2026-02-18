# Holocards — Holographic Trading Card

## Project Overview

**Holocards** is a premium interactive holographic trading card experience built with vanilla HTML, CSS, and JavaScript. It renders a physical-feeling trading card with real-time 3D tilt, prismatic rainbow shimmer, sparkle/glitter texture, pattern holo overlay, specular glare — all driven by mouse movement, touch, and device gyroscope.

The card features **Emory**, a Personal AI Assistant character created by **Kraken Lab** (developed by Tom Allen).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic) |
| Styling | Vanilla CSS (CSS custom properties, mix-blend-mode, mask-image) |
| Logic | Vanilla JavaScript (ES6+, requestAnimationFrame, DeviceOrientation API) |
| Fonts | Google Fonts — Geist, Inter |
| Deployment | Vercel (static site) |

**No build tools. No frameworks. No dependencies.** Pure browser-native code.

---

## File Structure

```
holocards/
├── index.html        # Main HTML entry point
├── style.css         # All styles — card layers, animations, effects
├── script.js         # Interactive logic — tilt, lerp loop, events
├── card.png          # Card portrait image (Emory)
├── mask.png          # Holographic mask — defines where holo/sparkle effects appear
├── pattern.png       # Pattern texture — holo overlay below mask (z-index: 1)
├── glitter.png       # Glitter texture — used by sparkle layer instead of SVG noise
├── masks.js          # Legacy mask data (base64 embeds, currently unused)
├── vercel.json       # Vercel deployment config
├── CLAUDE.md         # AI agent context (this file)
└── AGENTS.md         # AI agent context (mirror of CLAUDE.md)
```

---

## How It Works

### Visual Layer Stack (bottom → top)
1. **`.card-image`** — The portrait photo (base layer)
2. **`.card-pattern`** (z-index: 1) — `pattern.png` texture with holo rainbow shimmer, `mix-blend-mode: color-dodge`, fixed opacity 0.35 — sits **below** the mask overlay
3. **`.card-mask`** (z-index: 2) — Visible overlay (text, border, logo) from `mask.png`, `mix-blend-mode: screen`
4. **`.card-holo`** (z-index: 11) — Prismatic rainbow gradient, masked by `mask.png` via JS, `mix-blend-mode: screen`
5. **`.card-sparkle`** (z-index: 12) — `glitter.png` texture, masked by `mask.png` via JS, `mix-blend-mode: screen`
6. **`.card-shine`** (z-index: 14) — Diagonal light sweep tracking cursor, `mix-blend-mode: soft-light`
7. **`.card-glare`** (z-index: 15) — Radial specular highlight following mouse, `mix-blend-mode: overlay`
8. **`.card-rim`** (z-index: 16) — Inset border glow (purely decorative)

### CSS Custom Properties (driven by JS)
| Property | Description |
|---|---|
| `--rotate-x` | Card tilt on X axis (deg) |
| `--rotate-y` | Card tilt on Y axis (deg) |
| `--shine-pos-x/y` | Shine sweep position (%) |
| `--glare-pos-x/y` | Specular glare position within card (%) |
| `--glare-opacity` | Glare intensity (0–1), scales with tilt distance |
| `--holo-opacity` | Rainbow layer opacity (0–0.7) |
| `--sparkle-opacity` | Sparkle grain opacity (0–0.5) |
| `--rainbow-angle` | Holo gradient angle (deg), shifts with tilt |
| `--rainbow-pos` | Holo gradient position (%), shifts with tilt |

### JavaScript Architecture
- **`tick()`** — `requestAnimationFrame` loop running at 60fps
- **`lerp(a, b, t)`** — Linear interpolation for smooth transitions
- **`handlePointerMove(x, y)`** — Normalizes cursor position relative to card center
- **`applyMask(url)`** — Applies mask image (file path or blob URL) to holo/sparkle as CSS mask-image and to the visible overlay `<img>`
- **`applyBlendModes()`** — Applies per-layer blend modes from `state.blendMask/blendPattern/blendHolo`
- **`applyZIndex()`** — Sets z-index on mask, pattern, and holo group from `state.zMask/zPattern/zHolo`
- **`reassignZIndices()`** — Called after drag-reorder; distributes z-indices based on DOM order in layer stack
- **Idle state** — After 3s of no input, targets return to center (spring-back lerp)
- **Input priority**: Mouse/touch > DeviceOrientation (gyroscope)
- **iOS 13+**: Requests `DeviceOrientationEvent.requestPermission()` on first click
- **Tilt toggle**: Only affects card rotation (`--rotate-x/y`), holo effects always active

### Editor Panel
The right-side `.editor` panel provides realtime controls:
- **Tilt toggle** — enable/disable card rotation
- **Layer order** — drag-to-reorder stack: holo / mask / pattern; z-indices auto-reassigned (step of 10)
- **Blend modes** — individual `<select>` for mask, pattern, and holo (holo blend also applies to sparkle)
- **Swap images** — file `<input>` for card.png, mask.png, pattern.png; uses `URL.createObjectURL` for instant preview
- Panel is collapsible via header click

### Layout
- **Title** `.card-title` — fixed position, `top: 50px`, centered horizontally, font-size 18px
- **Card** — centered in viewport via flexbox
- **Editor** `.editor` — fixed, right side, vertically centered
- **Hint** `.hint` — fixed `bottom: 16px`, fades in/out over 3s on load

### Masks & Textures
- Default assets referenced by file path (`url('./mask.png')`, `url('./pattern.png')`)
- JS applies mask dynamically via inline styles — supports runtime swap with blob URLs from file upload
- Pattern texture is rebuilt as a `backgroundImage` string combining rainbow gradient + texture URL

---

## Workflow Rules

After any code changes:
1. **Always update `CLAUDE.md` and `AGENTS.md`** to reflect the current state of the codebase
2. **Always commit and push** the changes to git

---

## Deployment (Vercel)

This is a **static site** — no server, no build step required.

### Deploy via Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

### Deploy via GitHub Integration
1. Push to GitHub (already done)
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Framework: **Other** (static)
4. Root directory: `/` (default)
5. No build command needed

The `vercel.json` sets proper cache headers for assets.

---

## Key Design Decisions

- **No build tools**: Keeps the project zero-dependency and instantly deployable anywhere
- **CSS custom properties for effects**: All visual state flows from JS → CSS vars → visual layers, keeping logic clean
- **File-path references for masks/textures**: Using `url('./mask.png')` instead of base64 makes it trivial to swap images at runtime for future mask/texture switcher features
- **`mix-blend-mode`**: Each layer uses a different blend mode to composite naturally over the photo without harsh overlays
- **Lerp smoothing**: Instead of directly setting rotation, values are interpolated each frame for a fluid, physical feel
- **Tilt-independent effects**: Holo effects are always active regardless of tilt toggle state
- **Pattern below mask (default)**: `pattern.png` starts at z-index: 1 (below mask), but the editor allows free drag-reorder of all three layer groups
- **Per-layer blend modes**: Each of mask / pattern / holo has its own independent blend mode selector in the editor
- **File upload as blob URLs**: `URL.createObjectURL` allows instant image swap without any server round-trip

---

## Character: Emory

- **Name**: Emory
- **Role**: Personal AI Assistant
- **Brand**: Kraken Lab® / Kraken Oner
- **Developer**: Tom Allen
- **Card type**: Holographic foil trading card

---

## Author

**Tom Allen** — [Kraken Lab](https://github.com/g88dknight)
