# Holocards — Holographic Trading Card

## Project Overview

**Holocards** is a premium interactive holographic trading card experience built with vanilla HTML, CSS, and JavaScript. It renders a physical-feeling trading card with real-time 3D tilt, prismatic rainbow shimmer, sparkle/glitter texture, pattern holo overlay, specular glare — all driven by mouse movement, touch, and device gyroscope.

The card features **Emory**, a Personal AI Assistant character created by **Kraken Lab** (developed by Tom Allen).

Holographic effects are ported verbatim from [simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css). Six effect variants are available via a switcher in the editor panel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic) |
| Styling | Vanilla CSS (CSS custom properties, mix-blend-mode, mask-image) |
| Logic | Vanilla JavaScript (ES6+, requestAnimationFrame, DeviceOrientation API) |
| Fonts | Google Fonts — Geist, Inter |
| Deployment | Vercel (static site) |

**No build tools. No frameworks. No dependencies.**

---

## File Structure

```
holocards/
├── index.html        # Main HTML entry point
├── style.css         # All styles — card layers, holo variants, editor
├── script.js         # Interactive logic — tilt, lerp loop, flip, events
├── card.png          # Card portrait image (Emory)
├── back.png          # Card back image (shown on flip)
├── mask.png          # Holographic mask — defines where holo effects appear
├── pattern.png       # Pattern texture — holo overlay below mask (z-index: 1)
├── glitter.png       # Glitter texture — used by rainbow/amazing rare effects
├── masks.js          # Legacy mask data (currently unused)
├── vercel.json       # Vercel deployment config
├── CLAUDE.md         # AI agent context (this file)
└── AGENTS.md         # AI agent context (mirror of CLAUDE.md)
```

---

## How It Works

### DOM Hierarchy
```
.card#card[data-rarity="..."]     ← rarity drives CSS variant, .masked/.flipped state
  .card__translater
    button.card__rotator          ← 3D tilt target, click-to-flip
      img.card__back              ← back.png, rotateY(180deg)
      div.card__front             ← front face, backface-visibility: hidden
        img.card-image            ← z-index: 0, portrait photo
        div.card-pattern          ← z-index: 1, pattern.png + rainbow gradient
        img.card-mask             ← z-index: 2, mask.png, mix-blend-mode: screen
        div.card__shine           ← z-index: 11, holo effect (variant-specific)
        div.card__glare           ← z-index: 12, glare (variant-specific)
        div.card-rim              ← z-index: 16, inset glow
```

### Card Flip
- Click `.card__rotator` → toggles `.card.flipped`
- `.card.flipped .card__rotator` adds 180deg to `--rotate-x` (Y-axis flip)
- Transition: `0.6s cubic-bezier(0.23, 1, 0.32, 1)`

### Holo Variants (data-rarity attribute)
| Value | Name |
|---|---|
| `rare holo` | Holofoil Rare — scanline + rainbow bars |
| `rare holo cosmos` | Cosmos Holofoil — galaxy swirl gradient |
| `reverse holo` | Reverse Holo — foil everywhere except art |
| `rare rainbow` | Rainbow / Secret Rare — glitter + rainbow shift |
| `rare holo vstar` | V-Star — sunpillar columns |
| `amazing rare` | Amazing Rare — glitter + saturation pass |

### CSS Custom Properties (driven by JS)
| Property | Description |
|---|---|
| `--pointer-x/y` | Cursor % on card (0–100%) |
| `--pointer-from-left/top` | Cursor as 0–1 fraction |
| `--pointer-from-center` | Distance from center (0–1) |
| `--background-x/y` | Gradient shift % (50% ± offset) |
| `--card-opacity` | Effect intensity 0–1 |
| `--rotate-x/y` | Tilt in degrees |
| `--rainbow-angle/pos` | Pattern layer gradient angle/position |
| `--mask` | CSS url() of mask image |
| `--glitter` | CSS url() of glitter texture |
| `--glittersize` | Glitter tile size (200px) |

### JavaScript Architecture
- **`tick()`** — requestAnimationFrame loop, lerp smoothing
- **`applyCardState()`** — sets all CSS custom properties each frame
- **`applyMask(url)`** — sets `--mask` var, adds `.masked` class, updates overlay src
- **`handlePointerMove()`** — normalizes cursor to card-relative coords
- **SMOOTHING** `0.12` (hover), **SPRING_BACK** `0.08` (idle return)
- Card flip on click, gyroscope on mobile, iOS permission request

### Editor Panel
- **Holo type** — 2×3 button grid, sets `data-rarity` on `.card`
- **Swap images** — file inputs for card.png, mask.png, pattern.png, back.png
- Panel collapsible via header click

---

## Workflow Rules

After any code changes:
1. **Always update `CLAUDE.md` and `AGENTS.md`** to reflect the current state
2. **Always commit and push** to git

---

## Deployment (Vercel)

Static site, no build step.

```bash
npm i -g vercel && vercel --prod
```

---

## Character: Emory

- **Name**: Emory — Personal AI Assistant
- **Brand**: Kraken Lab® / Kraken Oner
- **Developer**: Tom Allen

---

## Author

**Tom Allen** — [Kraken Lab](https://github.com/g88dknight)
