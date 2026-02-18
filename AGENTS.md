# Holocards — Holographic Trading Card

## Project Overview

**Holocards** is a premium interactive holographic trading card experience built with vanilla HTML, CSS, and JavaScript. It renders a physical-feeling trading card with real-time 3D tilt, prismatic rainbow shimmer, sparkle/glitter texture, pattern holo overlay, specular glare — all driven by mouse movement, touch, and device gyroscope.

The card features **Emory**, a Personal AI Assistant character created by **Kraken Lab** (developed by Tom Allen).

The holographic effects are ported from [simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css) — the exact same scanline + bar-pattern rainbow gradient stack, glare system, and CSS custom property naming convention.

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
├── back.png          # Card back image (shown on flip)
├── mask.png          # Holographic mask — defines where holo/sparkle effects appear
├── pattern.png       # Pattern texture — holo overlay below mask (z-index: 1)
├── glitter.png       # Glitter texture — used by sparkle layer
├── masks.js          # Legacy mask data (base64 embeds, currently unused)
├── vercel.json       # Vercel deployment config
├── CLAUDE.md         # AI agent context (this file)
└── AGENTS.md         # AI agent context (mirror of CLAUDE.md)
```

---

## How It Works

### Visual Layer Stack (bottom → top)
1. **`.card-image`** (z-index: 0) — Portrait photo, base layer
2. **`.card-pattern`** (z-index: 1) — `pattern.png` + rainbow gradient, `mix-blend-mode: color-dodge`, opacity 0.35
3. **`.card-mask`** (z-index: 2) — Visible overlay from `mask.png`, `mix-blend-mode: screen`
4. **`.card__shine`** (z-index: 11) — Scanline rainbow holo (pokemon-css `regular-holo` style), `mix-blend-mode: color-dodge`
   - `:before` — bar pattern, `mix-blend-mode: hard-light`
   - `:after` — radial cursor highlight, `mix-blend-mode: luminosity`
5. **`.card__glare`** (z-index: 12) — Radial specular glare, `mix-blend-mode: overlay`
   - `:after` — secondary radial layer, `mix-blend-mode: overlay`
6. **`.card-sparkle`** (z-index: 13) — `glitter.png` grain, `mix-blend-mode: screen`
7. **`.card-rim`** (z-index: 16) — Inset border glow (decorative)

### DOM Hierarchy (pokemon-css style)
```
.card#card
  .card__translater          ← scale + XY translate
    button.card__rotator     ← 3D tilt, click-to-flip, box-shadow glow
      img.card__back         ← back.png, rotateY(180deg), shown when .card.flipped
      div.card__front        ← front face, backface-visibility: hidden
        img.card-image
        div.card-pattern
        img.card-mask
        div.card__shine
        div.card__glare
        div.card-sparkle
        div.card-rim
```

### Card Flip
- Click on `.card__rotator` toggles `.card.flipped`
- `.card.flipped .card__rotator` applies `rotateY(calc(var(--rotate-x) + 180deg))`
- `backface-visibility: hidden` on `.card__front` / `visible` on `.card__back`
- Flip transition: `0.6s cubic-bezier(0.23, 1, 0.32, 1)`

### CSS Custom Properties (driven by JS)
| Property | Description |
|---|---|
| `--pointer-x/y` | Cursor position % on card — drives shine `:before` background-position and glare radial center |
| `--background-x/y` | Gradient shift % — drives shine main layer background-position |
| `--card-opacity` | Effect intensity 0–1 — drives shine and glare opacity |
| `--card-scale` | Scale factor — 1.04 on hover, 1.0 idle |
| `--rotate-x/y` | Card tilt in degrees |
| `--rainbow-angle` | Pattern gradient angle (deg) |
| `--rainbow-pos` | Pattern gradient position (%) |
| `--mask` | CSS url() of current mask image — used by `.card.masked` rules |

### JavaScript Architecture
- **`tick()`** — `requestAnimationFrame` loop at 60fps
- **`lerp(a, b, t)`** — Linear interpolation (spring-feel with t=0.08)
- **`handlePointerMove(x, y)`** — Normalizes cursor to card-relative coords
- **`applyCardState()`** — Sets all CSS vars per frame
- **`applyMask(url)`** — Sets `--mask` CSS var + adds `.masked` class; applies `src` to overlay img
- **`applyBlendModes()`** — Applies per-layer `mix-blend-mode` from state
- **`applyZIndex()`** — Sets z-index on mask, pattern, holo group from state
- **`reassignZIndices()`** — Called after drag-reorder in editor
- **Idle state** — After 3s of no input, targets return to center (spring-back)
- **Input priority**: Mouse/touch > DeviceOrientation (gyroscope)
- **iOS 13+**: Requests `DeviceOrientationEvent.requestPermission()` on first click
- **Tilt toggle**: Only affects card rotation, holo effects always active

### Editor Panel
The right-side `.editor` panel provides realtime controls:
- **Tilt toggle** — enable/disable card rotation
- **Layer order** — drag-to-reorder stack: holo / mask / pattern; z-indices auto-reassigned
- **Blend modes** — independent selects for mask, pattern, holo
- **Swap images** — file `<input>` for card.png, mask.png, pattern.png, back.png; blob URLs for instant preview
- Panel collapsible via header click

### Layout
- **Title** `.card-title` — fixed, `top: 50px`, centered
- **Card** — centered via flexbox
- **Editor** `.editor` — fixed right side, vertically centered
- **Hint** `.hint` — fixed bottom, fades in/out on load

### Masks & Textures
- Default assets referenced by file path (`url('./mask.png')`, etc.)
- `applyMask()` sets `--mask` CSS var → `.card.masked` CSS rules apply `mask-image` to shine, glare, sparkle
- Pattern texture rebuilt as `backgroundImage` combining rainbow gradient + texture URL

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

- **Pokemon Cards CSS port**: shine/glare effects directly ported from simeydotme's `regular-holo.css` — repeating rainbow gradient 400% × 400%, scanlines, bar pattern `:before`, radial `:after`
- **CSS custom properties**: All visual state flows from JS → CSS vars → layers
- **`--pointer-x/y`** drives both the shine `:before` bar shift and glare radial center
- **`--background-x/y`** drives the main shine gradient pan
- **`--card-opacity`** gates both shine and glare simultaneously
- **Card flip**: CSS `rotateY(180deg)` with `backface-visibility` — click on `.card__rotator` toggles `.card.flipped`
- **Spring-feel lerp**: t=0.08 hover, t=0.05 spring-back (matches pokemon-css stiffness: 0.066)
- **Scale on hover**: `--card-scale: 1.04` via lerp for lift effect
- **Box-shadow glow**: `.card.active .card__rotator` shows full edge + glow shadow
- **`.card.masked`**: CSS class added by `applyMask()` — activates `mask-image` rules on shine/glare/sparkle
- **No build tools**: Zero-dependency, instantly deployable

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
