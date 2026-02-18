// ─── Element References ───────────────────────────────────────────────────────
const card        = document.getElementById('card');
const cardRotator = document.getElementById('cardRotator');
const cardImage   = document.getElementById('cardImage');
const cardPattern = document.getElementById('cardPattern');
const maskOverlay = document.getElementById('cardMaskOverlay');

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
    MAX_ROTATION: 18,
    IDLE_TIMEOUT: 3000,
    SMOOTHING:    0.12,
    SPRING_BACK:  0.08,
};

// ─── State ────────────────────────────────────────────────────────────────────
let state = {
    targetRotX:  0,
    targetRotY:  0,
    currentRotX: 0,
    currentRotY: 0,
    targetGlareX:  50,
    targetGlareY:  50,
    currentGlareX: 50,
    currentGlareY: 50,
    isHovering:    false,
    idleTimer:     null,
    gyroIdleTimer: null,
    _patternUrl:   null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function round(v, p = 3) { return parseFloat(v.toFixed(p)); }

// ─── CSS var setter ───────────────────────────────────────────────────────────
function set(prop, val) { card.style.setProperty(prop, val); }

// ─── Apply mask (sets --mask var + .masked class + overlay src) ───────────────
function applyMask(url) {
    const u = url || './mask.png';
    maskOverlay.src = u;
    set('--mask', `url("${u}")`);
    card.classList.add('masked');
}

// ─── Apply pattern texture ────────────────────────────────────────────────────
function buildPatternBg(angle, pos) {
    const tex = state._patternUrl || 'url("./pattern.png")';
    return `repeating-linear-gradient(calc(${angle} + 45deg),
        hsla(270,100%,70%,0.12) 0%,hsla(300,100%,70%,0.12) 4%,
        hsla(330,100%,70%,0.12) 8%,hsla(0,100%,70%,0.12) 12%,
        hsla(30,100%,70%,0.12) 16%,hsla(60,100%,70%,0.12) 20%,
        hsla(90,100%,70%,0.12) 24%,hsla(120,100%,70%,0.12) 28%,
        hsla(150,100%,70%,0.12) 32%,hsla(180,100%,70%,0.12) 36%,
        hsla(210,100%,70%,0.12) 40%,hsla(240,100%,70%,0.12) 44%,
        hsla(270,100%,70%,0.12) 48%,transparent 52%,transparent 100%),
        ${tex}`;
}

// ─── Core frame update ────────────────────────────────────────────────────────
function applyCardState(rotX, rotY, glareX, glareY, intensity) {
    // tilt
    set('--rotate-x', `${round(rotX)}deg`);
    set('--rotate-y', `${round(rotY)}deg`);

    // pointer position (0–100%) — pokemon-css naming
    set('--pointer-x', `${round(glareX)}%`);
    set('--pointer-y', `${round(glareY)}%`);

    // pointer-from-* (0–1) — used by cosmos, rainbow, reverse, vstar
    const fromLeft   = round(glareX / 100, 4);
    const fromTop    = round(glareY / 100, 4);
    const fromCenter = round(
        Math.sqrt(Math.pow(fromLeft - 0.5, 2) + Math.pow(fromTop - 0.5, 2)) * Math.SQRT2,
        4
    );
    set('--pointer-from-left',   fromLeft);
    set('--pointer-from-top',    fromTop);
    set('--pointer-from-center', clamp(fromCenter, 0, 1));

    // background-x/y (50% ± offset) — used by holo, vstar
    const bgX = round(50 + (rotY / CONFIG.MAX_ROTATION) * 30);
    const bgY = round(50 - (rotX / CONFIG.MAX_ROTATION) * 30);
    set('--background-x', `${bgX}%`);
    set('--background-y', `${bgY}%`);

    // card-opacity — gates shine/glare intensity
    set('--card-opacity', round(intensity, 3));

    // pattern (rainbow) vars — used by card-pattern layer
    const rAngle = 135 + (rotY / CONFIG.MAX_ROTATION) * 30;
    const rPos   = 50  + (rotY / CONFIG.MAX_ROTATION) * 30;
    set('--rainbow-angle', `${round(rAngle)}deg`);
    set('--rainbow-pos',   `${round(rPos)}%`);
    cardPattern.style.backgroundPosition =
        `calc(${round(rPos)}% + 10%) calc(${round(rPos)}% + 10%), center`;
}

// ─── Animation Loop ───────────────────────────────────────────────────────────
function tick() {
    const t = state.isHovering ? CONFIG.SMOOTHING : CONFIG.SPRING_BACK;

    state.currentRotX   = lerp(state.currentRotX,   state.targetRotX,   t);
    state.currentRotY   = lerp(state.currentRotY,   state.targetRotY,   t);
    state.currentGlareX = lerp(state.currentGlareX, state.targetGlareX, t);
    state.currentGlareY = lerp(state.currentGlareY, state.targetGlareY, t);

    const dist      = Math.sqrt(state.currentRotX ** 2 + state.currentRotY ** 2);
    const intensity = clamp(dist / CONFIG.MAX_ROTATION, 0, 1);

    applyCardState(
        state.currentRotX, state.currentRotY,
        state.currentGlareX, state.currentGlareY,
        intensity
    );

    requestAnimationFrame(tick);
}

// ─── Idle / spring-back ───────────────────────────────────────────────────────
function resetIdleTimer() {
    if (state.idleTimer) clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(returnToCenter, CONFIG.IDLE_TIMEOUT);
}

function returnToCenter() {
    state.isHovering   = false;
    state.targetRotX   = 0;
    state.targetRotY   = 0;
    state.targetGlareX = 50;
    state.targetGlareY = 50;
}

// ─── Pointer Input ────────────────────────────────────────────────────────────
function handlePointerMove(clientX, clientY) {
    const rect  = card.getBoundingClientRect();
    const normX = clamp((clientX - rect.left  - rect.width  / 2) / (rect.width  / 2), -1, 1);
    const normY = clamp((clientY - rect.top   - rect.height / 2) / (rect.height / 2), -1, 1);
    state.targetRotY   =  normX * CONFIG.MAX_ROTATION;
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
    const t = e.touches[0];
    state.isHovering = true;
    handlePointerMove(t.clientX, t.clientY);
}, { passive: false });

document.addEventListener('touchend', () => {
    state.isHovering = false;
    returnToCenter();
});

// ─── Card Flip on Click ───────────────────────────────────────────────────────
cardRotator.addEventListener('click', () => {
    card.classList.toggle('flipped');
});

// ─── Device Orientation ───────────────────────────────────────────────────────
function handleOrientation(e) {
    if (state.isHovering) return;
    const rotY = clamp(e.gamma ?? 0, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
    const rotX = clamp((e.beta  ?? 0) - 30, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
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
                    } catch (_) {}
                };
                document.addEventListener('touchstart', req, { once: true });
                document.addEventListener('click',      req, { once: true });
            });
    } else {
        setupDeviceOrientation();
    }
}

// ─── Editor: Collapse ─────────────────────────────────────────────────────────
document.querySelector('.editor-header').addEventListener('click', () => {
    document.getElementById('editor').classList.toggle('collapsed');
});

// ─── Editor: Holo Type Switcher ───────────────────────────────────────────────
document.querySelectorAll('.holo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.holo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        card.dataset.rarity = btn.dataset.rarity;
    });
});

// ─── Editor: File Uploads ─────────────────────────────────────────────────────
function setupUpload(inputId, nameId, onLoad) {
    const input  = document.getElementById(inputId);
    const nameEl = document.getElementById(nameId);
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url   = URL.createObjectURL(file);
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
    cardPattern.style.backgroundImage =
        `repeating-linear-gradient(calc(var(--rainbow-angle, 0deg) + 45deg),
            hsla(270,100%,70%,0.12) 0%,hsla(300,100%,70%,0.12) 4%,
            hsla(330,100%,70%,0.12) 8%,hsla(0,100%,70%,0.12) 12%,
            hsla(30,100%,70%,0.12) 16%,hsla(60,100%,70%,0.12) 20%,
            hsla(90,100%,70%,0.12) 24%,hsla(120,100%,70%,0.12) 28%,
            hsla(150,100%,70%,0.12) 32%,hsla(180,100%,70%,0.12) 36%,
            hsla(210,100%,70%,0.12) 40%,hsla(240,100%,70%,0.12) 44%,
            hsla(270,100%,70%,0.12) 48%,transparent 52%,transparent 100%),
        url("${url}")`;
});

setupUpload('uploadBack', 'nameBack', (url) => {
    document.querySelector('.card__back').src = url;
});

// ─── Init ─────────────────────────────────────────────────────────────────────
applyMask('./mask.png');
tick();
