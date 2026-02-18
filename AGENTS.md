# Holocards — Holographic Trading Card

## Project Overview

**Holocards** is a premium interactive holographic trading card experience built with vanilla HTML, CSS, and JavaScript. It renders a physical-feeling trading card with real-time 3D tilt, prismatic rainbow shimmer, sparkle/glitter texture, specular glare, and an idle float animation — all driven by mouse movement, touch, and device gyroscope.

The card features **Emory**, a Personal AI Assistant character created by **Kraken Lab** (developed by Tom Allen).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic) |
| Styling | Vanilla CSS (CSS custom properties, mix-blend-mode, mask-image) |
| Logic | Vanilla JavaScript (ES6+, requestAnimationFrame, DeviceOrientation API) |
| Fonts | Google Fonts — Inter |
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
├── mask.png          # Holographic mask — defines where holo effects appear
├── vercel.json       # Vercel deployment config
├── CLAUDE.md         # AI agent context (this file)
└── AGENTS.md         # AI agent context (mirror of CLAUDE.md)
```

---

## How It Works

### Visual Layer Stack (bottom → top)
1. **`.card-image`** — The portrait photo (base layer)
2. **`.card-holo`** — Prismatic rainbow gradient, masked by `mask.png`, `mix-blend-mode: color-dodge`
3. **`.card-sparkle`** — SVG fractal noise grain for foil/glitter texture, `mix-blend-mode: color-dodge`
4. **`.card-shine`** — Diagonal light sweep tracking cursor, `mix-blend-mode: soft-light`
5. **`.card-glare`** — Radial specular highlight following mouse within card, `mix-blend-mode: overlay`
6. **`.card-rim`** — Inset border glow (purely decorative)

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
- **Idle state** — After 3s of no input, card enters CSS `float` keyframe animation
- **Input priority**: Mouse/touch > DeviceOrientation (gyroscope)
- **iOS 13+**: Requests `DeviceOrientationEvent.requestPermission()` on first click

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
- **`mask.png` for holo area**: The mask defines exactly which parts of the card get the holographic treatment (card art area, not the text/border regions)
- **`mix-blend-mode`**: Each layer uses a different blend mode to composite naturally over the photo without harsh overlays
- **Lerp smoothing**: Instead of directly setting rotation, values are interpolated each frame for a fluid, physical feel
- **Idle animation**: Prevents the card from looking "dead" when no input is detected

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
