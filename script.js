// ─── Element References ───────────────────────────────────────────────────────
const card = document.getElementById('card');
const cardHolo = document.getElementById('cardHolo');
const cardSparkle = document.getElementById('cardSparkle');
const maskOverlay = document.getElementById('cardMaskOverlay');
const tiltToggle = document.getElementById('tiltToggle');

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
    currentMask: 'mask',
    currentBlend: 'screen',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

// ─── Mask & Blend Application ─────────────────────────────────────────────────
function applyMask() {
    const dataUrl = './mask.png';

    // Update visible overlay src
    maskOverlay.src = dataUrl;

    // Update CSS mask-image on holo layers
    const maskCss = `url("${dataUrl}")`;
    [cardHolo, cardSparkle].forEach(el => {
        el.style.webkitMaskImage = maskCss;
        el.style.maskImage = maskCss;
        el.style.webkitMaskSize = '100% 100%';
        el.style.maskSize = '100% 100%';
    });

    // Ensure screen blend mode for mask.png
    maskOverlay.style.mixBlendMode = 'screen';
}

function applyBlend(blendMode) {
    [cardHolo, cardSparkle].forEach(el => {
        el.style.mixBlendMode = blendMode;
    });
    state.currentBlend = blendMode;
}

// ─── Core Update ──────────────────────────────────────────────────────────────
function applyCardState(rotX, rotY, glareX, glareY, intensity) {
    // Only apply physical tilt if enabled
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
    const rainbowPos = 50 + (rotY / CONFIG.MAX_ROTATION) * 30;
    card.style.setProperty('--rainbow-angle', `${rainbowAngle}deg`);
    card.style.setProperty('--rainbow-pos', `${rainbowPos}%`);

    const holoOpacity = clamp(intensity * 0.7, 0, 0.7);
    const sparkleOpacity = clamp(intensity * 0.5, 0, 0.5);
    card.style.setProperty('--holo-opacity', holoOpacity.toFixed(3));
    card.style.setProperty('--sparkle-opacity', sparkleOpacity.toFixed(3));
}

// ─── Animation Loop ───────────────────────────────────────────────────────────
function tick() {
    const smoothing = state.isHovering ? CONFIG.SMOOTHING : CONFIG.SPRING_BACK;

    state.currentRotX = lerp(state.currentRotX, state.targetRotX, smoothing);
    state.currentRotY = lerp(state.currentRotY, state.targetRotY, smoothing);
    state.currentGlareX = lerp(state.currentGlareX, state.targetGlareX, smoothing);
    state.currentGlareY = lerp(state.currentGlareY, state.targetGlareY, smoothing);

    const dist = Math.sqrt(state.currentRotX ** 2 + state.currentRotY ** 2);
    const intensity = clamp(dist / CONFIG.MAX_ROTATION, 0, 1);

    applyCardState(state.currentRotX, state.currentRotY, state.currentGlareX, state.currentGlareY, intensity);
    state.rafId = requestAnimationFrame(tick);
}

// ─── Return to center ─────────────────────────────────────────────────────────
function resetIdleTimer() {
    if (state.idleTimer) clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(returnToCenter, CONFIG.IDLE_TIMEOUT);
}

function returnToCenter() {
    state.isHovering = false;
    state.targetRotX = 0;
    state.targetRotY = 0;
    state.targetGlareX = 50;
    state.targetGlareY = 50;
}

// ─── Pointer Input ────────────────────────────────────────────────────────────
function handlePointerMove(clientX, clientY) {
    // Always calculate targets so effects update even if tilt is off
    const rect = card.getBoundingClientRect();
    const normX = clamp((clientX - rect.left - rect.width / 2) / (rect.width / 2), -1, 1);
    const normY = clamp((clientY - rect.top - rect.height / 2) / (rect.height / 2), -1, 1);
    state.targetRotY = normX * CONFIG.MAX_ROTATION;
    state.targetRotX = -normY * CONFIG.MAX_ROTATION;
    state.targetGlareX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    state.targetGlareY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
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
    // Always calculate targets

    const rotY = clamp(e.gamma ?? 0, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
    const rotX = clamp((e.beta ?? 0) - 30, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
    state.targetRotY = rotY;
    state.targetRotX = -rotX;
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
                    } catch (err) { }
                };
                document.addEventListener('touchstart', req, { once: true });
                document.addEventListener('click', req, { once: true });
            });
    } else {
        setupDeviceOrientation();
    }
}

// ─── Controls: Mask Switcher removed ──────────────────────────────────────────

// ─── Controls: Blend Mode Switcher ───────────────────────────────────────────
document.getElementById('blendPills').addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    const blend = btn.dataset.blend;
    document.querySelectorAll('#blendPills .pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    applyBlend(blend);
});

// ─── Controls: Tilt Toggle ────────────────────────────────────────────────────
tiltToggle.addEventListener('click', () => {
    state.tiltEnabled = !state.tiltEnabled;
    tiltToggle.classList.toggle('active', state.tiltEnabled);
    tiltToggle.querySelector('.toggle-text').textContent = state.tiltEnabled ? 'on' : 'off';
    if (!state.tiltEnabled) returnToCenter();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
// Apply initial mask
applyMask();
applyBlend('screen');
tick();
