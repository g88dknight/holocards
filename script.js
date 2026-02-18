// ─── Element References ───────────────────────────────────────────────────────
const card        = document.getElementById('card');
const cardFace    = document.getElementById('cardFace');
const cardImage   = document.getElementById('cardImage');
const cardHolo    = document.getElementById('cardHolo');
const cardSparkle = document.getElementById('cardSparkle');
const cardPattern = document.getElementById('cardPattern');
const maskOverlay = document.getElementById('cardMaskOverlay');
const tiltToggle  = document.getElementById('tiltToggle');

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
    MAX_ROTATION: 18,
    IDLE_TIMEOUT: 3000,
    SMOOTHING: 0.12,
    SPRING_BACK: 0.08,
};

// ─── App State ────────────────────────────────────────────────────────────────
let state = {
    targetRotX: 0,
    targetRotY: 0,
    currentRotX: 0,
    currentRotY: 0,
    targetGlareX: 50,
    targetGlareY: 50,
    currentGlareX: 50,
    currentGlareY: 50,
    isHovering: false,
    tiltEnabled: true,
    idleTimer: null,
    gyroIdleTimer: null,
    rafId: null,
    // per-layer blend modes
    blendMask: 'screen',
    blendPattern: 'color-dodge',
    blendHolo: 'screen',
    // z-index values (user-editable via drag)
    zMask: 2,
    zPattern: 1,
    zHolo: 11,   // represents both holo+sparkle group
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

// ─── Apply z-index from state ─────────────────────────────────────────────────
function applyZIndex() {
    maskOverlay.style.zIndex  = state.zMask;
    cardPattern.style.zIndex  = state.zPattern;
    // holo group: holo=base, sparkle=base+1, shine=base+3, glare=base+4, rim=base+5
    const z = state.zHolo;
    cardHolo.style.zIndex    = z;
    cardSparkle.style.zIndex = z + 1;
    document.querySelector('.card-shine').style.zIndex = z + 3;
    document.querySelector('.card-glare').style.zIndex = z + 4;
    document.querySelector('.card-rim').style.zIndex   = z + 5;

    // Update badge labels in editor
    document.getElementById('zMask').textContent    = state.zMask;
    document.getElementById('zPattern').textContent = state.zPattern;
    document.getElementById('zHolo').textContent    = state.zHolo;
}

// ─── Apply blend modes ────────────────────────────────────────────────────────
function applyBlendModes() {
    maskOverlay.style.mixBlendMode = state.blendMask;
    cardPattern.style.mixBlendMode = state.blendPattern;
    cardHolo.style.mixBlendMode    = state.blendHolo;
    cardSparkle.style.mixBlendMode = state.blendHolo; // sparkle follows holo
}

// ─── Apply mask to holo layers ────────────────────────────────────────────────
function applyMask(maskUrl) {
    const url = maskUrl || './mask.png';
    maskOverlay.src = url;
    const maskCss = `url("${url}")`;
    [cardHolo, cardSparkle].forEach(el => {
        el.style.webkitMaskImage = maskCss;
        el.style.maskImage       = maskCss;
        el.style.webkitMaskSize  = '100% 100%';
        el.style.maskSize        = '100% 100%';
    });
}

// ─── Apply pattern texture ────────────────────────────────────────────────────
function applyPatternTexture(url) {
    // Rebuild background-image with new url, keeping the rainbow gradient
    cardPattern.style.setProperty('--pattern-url', `url("${url}")`);
    // We use a CSS variable trick — fallback handled by the inline style override
    const angle = getComputedStyle(card).getPropertyValue('--rainbow-angle') || '180deg';
    const pos   = getComputedStyle(card).getPropertyValue('--rainbow-pos')   || '50%';
    cardPattern.style.backgroundImage = buildPatternBg(angle.trim(), pos.trim());
}

function buildPatternBg(angle, pos) {
    return `repeating-linear-gradient(calc(${angle} + 45deg),
        hsla(270,100%,70%,0.12) 0%,hsla(300,100%,70%,0.12) 4%,
        hsla(330,100%,70%,0.12) 8%,hsla(0,100%,70%,0.12) 12%,
        hsla(30,100%,70%,0.12) 16%,hsla(60,100%,70%,0.12) 20%,
        hsla(90,100%,70%,0.12) 24%,hsla(120,100%,70%,0.12) 28%,
        hsla(150,100%,70%,0.12) 32%,hsla(180,100%,70%,0.12) 36%,
        hsla(210,100%,70%,0.12) 40%,hsla(240,100%,70%,0.12) 44%,
        hsla(270,100%,70%,0.12) 48%,transparent 52%,transparent 100%),
        ${state._patternUrl || 'url("./pattern.png")'}`;
}

// ─── Core Update ──────────────────────────────────────────────────────────────
function applyCardState(rotX, rotY, glareX, glareY, intensity) {
    const cssRotX = state.tiltEnabled ? rotX : 0;
    const cssRotY = state.tiltEnabled ? rotY : 0;

    card.style.setProperty('--rotate-x', `${cssRotX}deg`);
    card.style.setProperty('--rotate-y', `${cssRotY}deg`);

    const shinePosX = 50 + (rotY / CONFIG.MAX_ROTATION) * 40;
    const shinePosY = 50 - (rotX / CONFIG.MAX_ROTATION) * 40;
    card.style.setProperty('--shine-pos-x', `${shinePosX}%`);
    card.style.setProperty('--shine-pos-y', `${shinePosY}%`);

    card.style.setProperty('--glare-pos-x', `${glareX}%`);
    card.style.setProperty('--glare-pos-y', `${glareY}%`);

    const glareOpacity = clamp(Math.sqrt(rotX * rotX + rotY * rotY) / CONFIG.MAX_ROTATION, 0, 1) * 0.85;
    card.style.setProperty('--glare-opacity', glareOpacity.toFixed(3));

    const rainbowAngle = 135 + (rotY / CONFIG.MAX_ROTATION) * 30;
    const rainbowPos   = 50  + (rotY / CONFIG.MAX_ROTATION) * 30;
    card.style.setProperty('--rainbow-angle', `${rainbowAngle}deg`);
    card.style.setProperty('--rainbow-pos',   `${rainbowPos}%`);

    // pattern background-position tracks rainbow-pos
    cardPattern.style.backgroundPosition =
        `calc(${rainbowPos}% + 10%) calc(${rainbowPos}% + 10%), center`;

    const holoOpacity    = clamp(intensity * 0.7, 0, 0.7);
    const sparkleOpacity = clamp(intensity * 0.5, 0, 0.5);
    card.style.setProperty('--holo-opacity',    holoOpacity.toFixed(3));
    card.style.setProperty('--sparkle-opacity', sparkleOpacity.toFixed(3));
}

// ─── Animation Loop ───────────────────────────────────────────────────────────
function tick() {
    const smoothing = state.isHovering ? CONFIG.SMOOTHING : CONFIG.SPRING_BACK;

    state.currentRotX   = lerp(state.currentRotX,   state.targetRotX,   smoothing);
    state.currentRotY   = lerp(state.currentRotY,   state.targetRotY,   smoothing);
    state.currentGlareX = lerp(state.currentGlareX, state.targetGlareX, smoothing);
    state.currentGlareY = lerp(state.currentGlareY, state.targetGlareY, smoothing);

    const dist      = Math.sqrt(state.currentRotX ** 2 + state.currentRotY ** 2);
    const intensity = clamp(dist / CONFIG.MAX_ROTATION, 0, 1);

    applyCardState(
        state.currentRotX, state.currentRotY,
        state.currentGlareX, state.currentGlareY,
        intensity
    );
    state.rafId = requestAnimationFrame(tick);
}

// ─── Return to center ─────────────────────────────────────────────────────────
function resetIdleTimer() {
    if (state.idleTimer) clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(returnToCenter, CONFIG.IDLE_TIMEOUT);
}

function returnToCenter() {
    state.isHovering  = false;
    state.targetRotX  = 0;
    state.targetRotY  = 0;
    state.targetGlareX = 50;
    state.targetGlareY = 50;
}

// ─── Pointer Input ────────────────────────────────────────────────────────────
function handlePointerMove(clientX, clientY) {
    const rect  = card.getBoundingClientRect();
    const normX = clamp((clientX - rect.left - rect.width  / 2) / (rect.width  / 2), -1, 1);
    const normY = clamp((clientY - rect.top  - rect.height / 2) / (rect.height / 2), -1, 1);
    state.targetRotY   = normX * CONFIG.MAX_ROTATION;
    state.targetRotX   = -normY * CONFIG.MAX_ROTATION;
    state.targetGlareX = clamp(((clientX - rect.left) / rect.width)  * 100, 0, 100);
    state.targetGlareY = clamp(((clientY - rect.top)  / rect.height) * 100, 0, 100);
    resetIdleTimer();
}

document.addEventListener('mousemove', (e) => {
    state.isHovering = true;
    handlePointerMove(e.clientX, e.clientY);
});

document.addEventListener('mouseleave', () => {
    state.isHovering = false;
    returnToCenter();
});

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    state.isHovering = true;
    handlePointerMove(touch.clientX, touch.clientY);
}, { passive: false });

document.addEventListener('touchend', () => {
    state.isHovering = false;
    returnToCenter();
});

// ─── Device Orientation ───────────────────────────────────────────────────────
function handleOrientation(e) {
    if (state.isHovering) return;
    const rotY = clamp(e.gamma ?? 0, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
    const rotX = clamp((e.beta ?? 0) - 30, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
    state.targetRotY   = rotY;
    state.targetRotX   = -rotX;
    state.targetGlareX = 50 + (rotY / CONFIG.MAX_ROTATION) * 40;
    state.targetGlareY = 50 - (rotX / CONFIG.MAX_ROTATION) * 40;
    if (state.gyroIdleTimer) clearTimeout(state.gyroIdleTimer);
    state.gyroIdleTimer = setTimeout(returnToCenter, CONFIG.IDLE_TIMEOUT);
}

function setupDeviceOrientation() {
    window.addEventListener('deviceorientation', handleOrientation);
}

if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(p => { if (p === 'granted') setupDeviceOrientation(); })
            .catch(() => {
                const req = async () => {
                    try {
                        const p = await DeviceOrientationEvent.requestPermission();
                        if (p === 'granted') setupDeviceOrientation();
                    } catch (err) {}
                };
                document.addEventListener('touchstart', req, { once: true });
                document.addEventListener('click',      req, { once: true });
            });
    } else {
        setupDeviceOrientation();
    }
}

// ─── Editor: Tilt Toggle ──────────────────────────────────────────────────────
tiltToggle.addEventListener('click', () => {
    state.tiltEnabled = !state.tiltEnabled;
    tiltToggle.classList.toggle('active', state.tiltEnabled);
    tiltToggle.querySelector('.toggle-text').textContent = state.tiltEnabled ? 'on' : 'off';
    if (!state.tiltEnabled) returnToCenter();
});

// ─── Editor: Collapse ─────────────────────────────────────────────────────────
const editor         = document.getElementById('editor');
const editorCollapse = document.getElementById('editorCollapse');
const editorHeader   = document.querySelector('.editor-header');

editorHeader.addEventListener('click', () => {
    editor.classList.toggle('collapsed');
});

// ─── Editor: Blend Mode Selects ───────────────────────────────────────────────
document.getElementById('blendMask').addEventListener('change', (e) => {
    state.blendMask = e.target.value;
    applyBlendModes();
});

document.getElementById('blendPattern').addEventListener('change', (e) => {
    state.blendPattern = e.target.value;
    applyBlendModes();
});

document.getElementById('blendHolo').addEventListener('change', (e) => {
    state.blendHolo = e.target.value;
    applyBlendModes();
});

// ─── Editor: Layer Order (drag-to-reorder) ────────────────────────────────────
const layerStack = document.getElementById('layerStack');
let dragSrc = null;

layerStack.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.layer-item');
    if (!item) return;
    dragSrc = item;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
});

layerStack.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.layer-item');
    if (!item || item === dragSrc) return;
    // Highlight drop target
    layerStack.querySelectorAll('.layer-item').forEach(i => i.classList.remove('drag-over'));
    item.classList.add('drag-over');
});

layerStack.addEventListener('dragleave', (e) => {
    const item = e.target.closest('.layer-item');
    if (item) item.classList.remove('drag-over');
});

layerStack.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target.closest('.layer-item');
    if (!target || target === dragSrc) return;
    target.classList.remove('drag-over');

    // Reorder DOM
    const items   = [...layerStack.querySelectorAll('.layer-item')];
    const srcIdx  = items.indexOf(dragSrc);
    const tgtIdx  = items.indexOf(target);

    if (srcIdx < tgtIdx) {
        layerStack.insertBefore(dragSrc, target.nextSibling);
    } else {
        layerStack.insertBefore(dragSrc, target);
    }

    reassignZIndices();
});

layerStack.addEventListener('dragend', (e) => {
    layerStack.querySelectorAll('.layer-item').forEach(i => {
        i.classList.remove('dragging', 'drag-over');
    });
    dragSrc = null;
});

// Make items draggable
layerStack.querySelectorAll('.layer-item').forEach(item => {
    item.setAttribute('draggable', 'true');
});

// Z-index mapping: top of list = highest z
// Layer order is: [top … bottom] in the DOM list (top = visually on top)
// We assign z-indices based on position: top item gets highest z
const Z_BASES = { holo: 11, mask: 2, pattern: 1 };
const Z_STEP = 10;

function reassignZIndices() {
    const items = [...layerStack.querySelectorAll('.layer-item')];
    // items[0] = topmost visually = highest z
    const total = items.length;
    items.forEach((item, i) => {
        const layer = item.dataset.layer;
        // top item (i=0) gets the highest z-index
        const z = (total - i) * Z_STEP;
        if (layer === 'holo') {
            state.zHolo    = z;
        } else if (layer === 'mask') {
            state.zMask    = z;
        } else if (layer === 'pattern') {
            state.zPattern = z;
        }
    });
    applyZIndex();
}

// ─── Editor: File Uploads ─────────────────────────────────────────────────────
function setupUpload(inputId, nameId, onLoad) {
    const input = document.getElementById(inputId);
    const nameEl = document.getElementById(nameId);
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        // Shorten filename for display
        const short = file.name.length > 18 ? file.name.slice(0, 15) + '…' : file.name;
        nameEl.textContent = short;
        onLoad(url);
    });
}

setupUpload('uploadCard', 'nameCard', (url) => {
    cardImage.src = url;
});

setupUpload('uploadMask', 'nameMask', (url) => {
    applyMask(url);
});

setupUpload('uploadPattern', 'namePattern', (url) => {
    state._patternUrl = `url("${url}")`;
    // Rebuild pattern background: gradient + new texture
    cardPattern.style.backgroundImage =
        `repeating-linear-gradient(calc(var(--rainbow-angle, 180deg) + 45deg),
            hsla(270,100%,70%,0.12) 0%,hsla(300,100%,70%,0.12) 4%,
            hsla(330,100%,70%,0.12) 8%,hsla(0,100%,70%,0.12) 12%,
            hsla(30,100%,70%,0.12) 16%,hsla(60,100%,70%,0.12) 20%,
            hsla(90,100%,70%,0.12) 24%,hsla(120,100%,70%,0.12) 28%,
            hsla(150,100%,70%,0.12) 32%,hsla(180,100%,70%,0.12) 36%,
            hsla(210,100%,70%,0.12) 40%,hsla(240,100%,70%,0.12) 44%,
            hsla(270,100%,70%,0.12) 48%,transparent 52%,transparent 100%),
        url("${url}")`;
});

// ─── Init ─────────────────────────────────────────────────────────────────────
applyMask('./mask.png');
applyBlendModes();
applyZIndex();
tick();
