// ─── Element References ───────────────────────────────────────────────────────
const card = document.getElementById('card');
const cardContainer = document.getElementById('cardContainer');

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
    MAX_ROTATION: 18,       // Max tilt in degrees
    IDLE_TIMEOUT: 3000,     // ms before idle animation kicks in
    SMOOTHING: 0.12,        // Lerp factor (lower = smoother/slower)
    SPRING_BACK: 0.08,      // Return-to-center speed when no input
};

// ─── State ────────────────────────────────────────────────────────────────────
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
    isIdle: false,
    idleTimer: null,
    rafId: null,
    lastX: null,
    lastY: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

// ─── Core Update ──────────────────────────────────────────────────────────────
function applyCardState(rotX, rotY, glareX, glareY, intensity) {
    // Transform
    card.style.setProperty('--rotate-x', `${rotX}deg`);
    card.style.setProperty('--rotate-y', `${rotY}deg`);

    // Shine position (moves with tilt)
    const shinePosX = 50 + (rotY / CONFIG.MAX_ROTATION) * 40;
    const shinePosY = 50 - (rotX / CONFIG.MAX_ROTATION) * 40;
    card.style.setProperty('--shine-pos-x', `${shinePosX}%`);
    card.style.setProperty('--shine-pos-y', `${shinePosY}%`);

    // Glare position
    card.style.setProperty('--glare-pos-x', `${glareX}%`);
    card.style.setProperty('--glare-pos-y', `${glareY}%`);

    // Glare opacity based on tilt intensity
    const distance = Math.sqrt(rotX * rotX + rotY * rotY);
    const glareOpacity = clamp(distance / CONFIG.MAX_ROTATION, 0, 1) * 0.85;
    card.style.setProperty('--glare-opacity', glareOpacity.toFixed(3));

    // Holographic rainbow: angle and position shift with tilt
    const rainbowAngle = 135 + (rotY / CONFIG.MAX_ROTATION) * 30;
    const rainbowPos = 50 + (rotY / CONFIG.MAX_ROTATION) * 30;
    card.style.setProperty('--rainbow-angle', `${rainbowAngle}deg`);
    card.style.setProperty('--rainbow-pos', `${rainbowPos}%`);

    // Holo and sparkle opacity scale with tilt
    const holoOpacity = clamp(intensity * 0.7, 0, 0.7);
    const sparkleOpacity = clamp(intensity * 0.5, 0, 0.5);
    card.style.setProperty('--holo-opacity', holoOpacity.toFixed(3));
    card.style.setProperty('--sparkle-opacity', sparkleOpacity.toFixed(3));
}

// ─── Animation Loop ───────────────────────────────────────────────────────────
function tick() {
    const smoothing = state.isHovering ? CONFIG.SMOOTHING : CONFIG.SPRING_BACK;

    // Lerp toward targets
    state.currentRotX = lerp(state.currentRotX, state.targetRotX, smoothing);
    state.currentRotY = lerp(state.currentRotY, state.targetRotY, smoothing);
    state.currentGlareX = lerp(state.currentGlareX, state.targetGlareX, smoothing);
    state.currentGlareY = lerp(state.currentGlareY, state.targetGlareY, smoothing);

    // Calculate intensity (0–1)
    const dist = Math.sqrt(
        state.currentRotX * state.currentRotX +
        state.currentRotY * state.currentRotY
    );
    const intensity = clamp(dist / CONFIG.MAX_ROTATION, 0, 1);

    applyCardState(
        state.currentRotX,
        state.currentRotY,
        state.currentGlareX,
        state.currentGlareY,
        intensity
    );

    state.rafId = requestAnimationFrame(tick);
}

// ─── Input Handling ───────────────────────────────────────────────────────────
function handlePointerMove(clientX, clientY) {
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;

    // Normalized position relative to card center (-1 to 1)
    const normX = clamp((clientX - cardCenterX) / (rect.width / 2), -1, 1);
    const normY = clamp((clientY - cardCenterY) / (rect.height / 2), -1, 1);

    state.targetRotY = normX * CONFIG.MAX_ROTATION;
    state.targetRotX = -normY * CONFIG.MAX_ROTATION;

    // Glare position as percentage within card
    state.targetGlareX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    state.targetGlareY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);

    state.lastX = clientX;
    state.lastY = clientY;

    resetIdleTimer();
}

function resetIdleTimer() {
    if (state.idleTimer) clearTimeout(state.idleTimer);
    if (state.isIdle) {
        state.isIdle = false;
        card.classList.remove('is-idle');
        card.classList.add('is-resting');
        setTimeout(() => card.classList.remove('is-resting'), 600);
    }
    state.idleTimer = setTimeout(startIdle, CONFIG.IDLE_TIMEOUT);
}

function startIdle() {
    if (!state.isHovering) {
        state.isIdle = true;
        state.targetRotX = 0;
        state.targetRotY = 0;
        state.targetGlareX = 50;
        state.targetGlareY = 50;
        card.classList.add('is-idle');
    }
}

// ─── Mouse Events ─────────────────────────────────────────────────────────────
document.addEventListener('mousemove', (e) => {
    state.isHovering = true;
    handlePointerMove(e.clientX, e.clientY);
});

document.addEventListener('mouseleave', () => {
    state.isHovering = false;
    state.targetRotX = 0;
    state.targetRotY = 0;
    state.targetGlareX = 50;
    state.targetGlareY = 50;
    resetIdleTimer();
});

// ─── Touch Events ─────────────────────────────────────────────────────────────
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    state.isHovering = true;
    handlePointerMove(touch.clientX, touch.clientY);
}, { passive: false });

document.addEventListener('touchend', () => {
    state.isHovering = false;
    state.targetRotX = 0;
    state.targetRotY = 0;
    state.targetGlareX = 50;
    state.targetGlareY = 50;
    resetIdleTimer();
});

// ─── Device Orientation (Mobile Gyroscope) ────────────────────────────────────
let orientationPermissionGranted = false;

function setupDeviceOrientation() {
    window.addEventListener('deviceorientation', (e) => {
        if (state.isHovering) return; // Mouse/touch takes priority

        let rotY = clamp(e.gamma ?? 0, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
        let rotX = clamp((e.beta ?? 0) - 30, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);

        state.targetRotY = rotY;
        state.targetRotX = -rotX;
        state.targetGlareX = 50 + (rotY / CONFIG.MAX_ROTATION) * 40;
        state.targetGlareY = 50 - (rotX / CONFIG.MAX_ROTATION) * 40;

        resetIdleTimer();
    });
}

// iOS 13+ requires permission for DeviceOrientationEvent
if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ – request on user gesture
        document.addEventListener('click', async () => {
            if (orientationPermissionGranted) return;
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    orientationPermissionGranted = true;
                    setupDeviceOrientation();
                }
            } catch (err) {
                console.warn('DeviceOrientation permission denied:', err);
            }
        }, { once: true });
    } else {
        // Non-iOS or older iOS
        setupDeviceOrientation();
    }
}

// ─── Start ────────────────────────────────────────────────────────────────────
tick();
resetIdleTimer();
