// ─── Element References ───────────────────────────────────────────────────────
const card        = document.getElementById('card');
const cardRotator = document.getElementById('cardRotator');
const cardImage   = document.getElementById('cardImage');
const cardPattern = document.getElementById('cardPattern');
const maskOverlay = document.getElementById('cardMaskOverlay');
const tiltToggle  = document.getElementById('tiltToggle');

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
    MAX_ROTATION: 12,
    IDLE_TIMEOUT: 3000,
};

// ─── State ────────────────────────────────────────────────────────────────────
let state = {
    tiltEnabled:   true,
    isHovering:    false,
    idleTimer:     null,
    gyroIdleTimer: null,
    _patternUrl:   null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function round(v, p = 3)  { return parseFloat(v.toFixed(p)); }

// ─── CSS var setter ───────────────────────────────────────────────────────────
function set(prop, val) { card.style.setProperty(prop, val); }

// ─── Apply mask (sets --mask var + .masked class + overlay src) ───────────────
function applyMask(url) {
    const u = url || './mask.png';
    maskOverlay.src = u;
    set('--mask', `url("${u}")`);
    card.classList.add('masked');
}

// ─── Core frame update — called directly on every pointer event ───────────────
function applyCardState(rotX, rotY, glareX, glareY) {
    // tilt (respects toggle)
    const cssRotX = state.tiltEnabled ? rotX : 0;
    const cssRotY = state.tiltEnabled ? rotY : 0;
    set('--rotate-x', `${round(cssRotX)}deg`);
    set('--rotate-y', `${round(cssRotY)}deg`);

    // pointer position (0–100%)
    set('--pointer-x', `${round(glareX)}%`);
    set('--pointer-y', `${round(glareY)}%`);

    // pointer-from-* (0–1)
    const fromLeft   = round(glareX / 100, 4);
    const fromTop    = round(glareY / 100, 4);
    const fromCenter = clamp(
        round(Math.sqrt(Math.pow(fromLeft - 0.5, 2) + Math.pow(fromTop - 0.5, 2)) * Math.SQRT2, 4),
        0, 1
    );
    set('--pointer-from-left',   fromLeft);
    set('--pointer-from-top',    fromTop);
    set('--pointer-from-center', fromCenter);

    // background-x/y
    const bgX = round(50 + (rotY / CONFIG.MAX_ROTATION) * 30);
    const bgY = round(50 - (rotX / CONFIG.MAX_ROTATION) * 30);
    set('--background-x', `${bgX}%`);
    set('--background-y', `${bgY}%`);

    // card-opacity (based on distance from center)
    const dist     = Math.sqrt(rotX * rotX + rotY * rotY);
    const intensity = clamp(dist / CONFIG.MAX_ROTATION, 0, 1);
    set('--card-opacity', round(intensity, 3));

    // pattern layer vars
    const rAngle = 135 + (rotY / CONFIG.MAX_ROTATION) * 30;
    const rPos   = 50  + (rotY / CONFIG.MAX_ROTATION) * 30;
    set('--rainbow-angle', `${round(rAngle)}deg`);
    set('--rainbow-pos',   `${round(rPos)}%`);
    cardPattern.style.backgroundPosition =
        `calc(${round(rPos)}% + 10%) calc(${round(rPos)}% + 10%), center`;
}

// ─── Reset to center ──────────────────────────────────────────────────────────
function resetToCenter() {
    applyCardState(0, 0, 50, 50);
}

// ─── Idle timer ───────────────────────────────────────────────────────────────
function resetIdleTimer() {
    if (state.idleTimer) clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => {
        state.isHovering = false;
        resetToCenter();
    }, CONFIG.IDLE_TIMEOUT);
}

// ─── Pointer Input ────────────────────────────────────────────────────────────
function handlePointerMove(clientX, clientY) {
    const rect  = card.getBoundingClientRect();
    const normX = clamp((clientX - rect.left  - rect.width  / 2) / (rect.width  / 2), -1, 1);
    const normY = clamp((clientY - rect.top   - rect.height / 2) / (rect.height / 2), -1, 1);
    const rotY   =  normX * CONFIG.MAX_ROTATION;
    const rotX   = -normY * CONFIG.MAX_ROTATION;
    const glareX = clamp(((clientX - rect.left) / rect.width)  * 100, 0, 100);
    const glareY = clamp(((clientY - rect.top)  / rect.height) * 100, 0, 100);
    applyCardState(rotX, rotY, glareX, glareY);
    resetIdleTimer();
}

document.addEventListener('mousemove', (e) => {
    state.isHovering = true;
    handlePointerMove(e.clientX, e.clientY);
});

document.addEventListener('mouseleave', () => {
    state.isHovering = false;
    resetToCenter();
});

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    state.isHovering = true;
    handlePointerMove(t.clientX, t.clientY);
}, { passive: false });

document.addEventListener('touchend', () => {
    state.isHovering = false;
    resetToCenter();
});

// ─── Card Flip on Click ───────────────────────────────────────────────────────
cardRotator.addEventListener('click', () => {
    card.classList.toggle('flipped');
});

// ─── Device Orientation ───────────────────────────────────────────────────────
function handleOrientation(e) {
    if (state.isHovering) return;
    const rotY  = clamp(e.gamma ?? 0, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
    const rotX  = clamp((e.beta ?? 0) - 30, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
    const glareX = 50 + (rotY / CONFIG.MAX_ROTATION) * 40;
    const glareY = 50 - (rotX / CONFIG.MAX_ROTATION) * 40;
    applyCardState(-rotX, rotY, glareX, glareY);
    if (state.gyroIdleTimer) clearTimeout(state.gyroIdleTimer);
    state.gyroIdleTimer = setTimeout(resetToCenter, CONFIG.IDLE_TIMEOUT);
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

// ─── Editor: Tilt Toggle ──────────────────────────────────────────────────────
tiltToggle.addEventListener('click', () => {
    state.tiltEnabled = !state.tiltEnabled;
    tiltToggle.classList.toggle('active', state.tiltEnabled);
    tiltToggle.querySelector('.toggle-text').textContent = state.tiltEnabled ? 'on' : 'off';
    if (!state.tiltEnabled) resetToCenter();
});

// ─── Editor: Holo Type Switcher ───────────────────────────────────────────────
document.querySelectorAll('.holo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.holo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        card.dataset.rarity = btn.dataset.rarity;
    });
});

// ─── Editor: Blend Modes ──────────────────────────────────────────────────────
const cardShine = document.getElementById('cardShine');
const cardGlare = document.getElementById('cardGlare');

document.getElementById('blendMask').addEventListener('change', (e) => {
    maskOverlay.style.mixBlendMode = e.target.value;
});
document.getElementById('blendPattern').addEventListener('change', (e) => {
    cardPattern.style.mixBlendMode = e.target.value;
});
document.getElementById('blendHolo').addEventListener('change', (e) => {
    cardShine.style.mixBlendMode = e.target.value;
    cardGlare.style.mixBlendMode = e.target.value;
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
resetToCenter();
