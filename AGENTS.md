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
      .card__back-wrap            ← back face (rotateY 180deg)
        img.card__back            ← back.png
        div.card-back-pattern     ← disabled (display:none)
        img.card__back-mask       ← disabled (display:none)
        div.card__back-shine      ← disabled (display:none)
        div.card__back-glare      ← disabled (display:none)
        div.card-rim
      div.card__front             ← front face, backface-visibility: hidden
        img.card-image            ← z-index: 0, portrait photo
        div.card-pattern          ← z-index: 11, pattern.png + rainbow gradient
        img.card-mask             ← z-index: 1, mask-front.png
        div.card__shine           ← z-index: 2, holo effect (variant-specific)
        div.card__glare           ← z-index: 3, glare (variant-specific)
        div.card-rim              ← z-index: 16, inset glow
```

**Back face holo is disabled** — `card-back-pattern`, `card__back-mask`, `card__back-shine`, `card__back-glare` all have `display:none` in CSS. Re-enable by removing those rules if needed.

### Card Flip
- Click `.card__rotator` → toggles `.card.flipped`
- `.card.flipped .card__rotator` adds 180deg to `--rotate-y` (Y-axis flip): `rotateX(--rotate-x) rotateY(--rotate-y + 180deg)`
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
- **`applyCardState(rotX, rotY, glareX, glareY)`** — sets all CSS custom properties each frame; `rotX`→`--rotate-x` (rotateX), `rotY`→`--rotate-y` (rotateY)
- **`handlePointerMove()`** — cursor right → rotY positive (card tilts right toward viewer); cursor down → rotX positive
- **`resetToCenter()`** — sets all to 0/50
- **`CONFIG.MAX_ROTATION: 6`** — tilt intensity (degrees); **`CONFIG.GYRO_SCALE: 0.25`** — gyroscope sensitivity multiplier
- **`applyMask(url)`** — canvas `toDataURL()` trick to apply mask-image (works on `file://` and `http://`)
- **`applyBackMask(url)`** — same for back face mask (currently not rendered since back holo is disabled)
- Card flip on click, gyroscope on mobile, iOS permission request
- `touchmove`/`touchend` skip buttons/controls to avoid blocking mobile taps

### Editor Panel
- **Holo type** — 6-button row in bottom bar, sets `data-rarity` on `.card`
- **Layer order** — drag-to-reorder list, default: holo:30, pattern:20, mask:10
- **Blend modes** — selects for mask/pattern/holo layers
- **Swap images** — file inputs for card, mask-front, mask-back, pattern, back
- Desktop editor: fixed top-right, collapsible, hidden on mobile
- Mobile: hamburger in header opens bottom drawer (cloned from desktop editor)
- Tilt toggle: fixed bottom bar, shared between desktop and mobile

### Mobile Layout
- Header (52px fixed top, transparent, no border), card centered in remaining space, bottom bar fixed
- `body` on mobile: `padding-top:52px; padding-bottom:110px; flex-direction:column; justify-content:flex-start`
- `.card-container` has `flex:1` to fill available height, centers card inside
- Card scales via CSS vars: `--card-width: min(420px, 92vw)` (almost full screen)
- Bottom bar transparent (no fill/border), stacks vertically (tilt row + holo 6-column row), buttons larger
- `mobile-editor-overlay`: `pointer-events:none` when inactive to not block taps
- Holo gradient coarseness fix: mobile `@media` overrides `background-size`, `--space`, `--glittersize` per variant
  - Cosmos/V-Star: much finer stripes (`--space: 2–2.5%`, larger `background-size` scale)
  - Rainbow/Amazing: glitter tiles scaled to 100px (mobile); percentage-based gradients scale automatically

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
