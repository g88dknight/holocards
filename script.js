// ─── Element References ───────────────────────────────────────────────────────
const card = document.getElementById('card');
const cardContainer = document.getElementById('cardContainer');

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
    MAX_ROTATION: 18,       // Max tilt in degrees
    IDLE_TIMEOUT: 3000,     // ms before returning to center when no input
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
    idleTimer: null,
    rafId: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// ─── Core Update ──────────────────────────────────────────────────────────────
function applyCardState(rotX, rotY, glareX, glareY, intensity) {
    card.style.setProperty('--rotate-x', `${rotX}deg`);
    card.style.setProperty('--rotate-y', `${rotY}deg`);

    const shinePosX = 50 + (rotY / CONFIG.MAX_ROTATION) * 40;
    const shinePosY = 50 - (rotX / CONFIG.MAX_ROTATION) * 40;
    card.style.setProperty('--shine-pos-x', `${shinePosX}%`);
    card.style.setProperty('--shine-pos-y', `${shinePosY}%`);

    card.style.setProperty('--glare-pos-x', `${glareX}%`);
    card.style.setProperty('--glare-pos-y', `${glareY}%`);

    const distance = Math.sqrt(rotX * rotX + rotY * rotY);
    const glareOpacity = clamp(distance / CONFIG.MAX_ROTATION, 0, 1) * 0.85;
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

// ─── Return to center after inactivity ────────────────────────────────────────
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

// ─── Input Handling ───────────────────────────────────────────────────────────
function handlePointerMove(clientX, clientY) {
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;

    const normX = clamp((clientX - cardCenterX) / (rect.width / 2), -1, 1);
    const normY = clamp((clientY - cardCenterY) / (rect.height / 2), -1, 1);

    state.targetRotY = normX * CONFIG.MAX_ROTATION;
    state.targetRotX = -normY * CONFIG.MAX_ROTATION;

    state.targetGlareX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    state.targetGlareY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);

    resetIdleTimer();
}

// ─── Mouse Events ─────────────────────────────────────────────────────────────
document.addEventListener('mousemove', (e) => {
    state.isHovering = true;
    handlePointerMove(e.clientX, e.clientY);
});

document.addEventListener('mouseleave', () => {
    state.isHovering = false;
    returnToCenter();
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
    returnToCenter();
});

// ─── Device Orientation (Mobile Gyroscope) ────────────────────────────────────
// Tracks last gyro event time to detect when device stops moving
let lastGyroTime = 0;
let gyroIdleTimer = null;

function handleOrientation(e) {
    if (state.isHovering) return; // Mouse/touch takes priority

    const rotY = clamp(e.gamma ?? 0, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
    const rotX = clamp((e.beta ?? 0) - 30, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);

    state.targetRotY = rotY;
    state.targetRotX = -rotX;
    state.targetGlareX = 50 + (rotY / CONFIG.MAX_ROTATION) * 40;
    state.targetGlareY = 50 - (rotX / CONFIG.MAX_ROTATION) * 40;

    // Reset return-to-center timer on every gyro event
    lastGyroTime = Date.now();
    if (gyroIdleTimer) clearTimeout(gyroIdleTimer);
    gyroIdleTimer = setTimeout(() => {
        // No gyro movement for 3s → spring back to center
        returnToCenter();
    }, CONFIG.IDLE_TIMEOUT);
}

function setupDeviceOrientation() {
    window.addEventListener('deviceorientation', handleOrientation);
}

// iOS 13+ requires a user gesture to grant DeviceOrientationEvent permission.
// We try to set up immediately (works on Android + older iOS).
// On iOS 13+, we also attach a one-time click handler as fallback.
if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ — try immediately first (will silently fail without gesture),
        // then also try on first user interaction as fallback
        DeviceOrientationEvent.requestPermission()
            .then(permission => {
                if (permission === 'granted') setupDeviceOrientation();
            })
            .catch(() => {
                // Permission requires gesture — attach to first touch/click
                const requestOnGesture = async () => {
                    try {
                        const permission = await DeviceOrientationEvent.requestPermission();
                        if (permission === 'granted') setupDeviceOrientation();
                    } catch (err) {
                        console.warn('DeviceOrientation permission denied:', err);
                    }
                };
                document.addEventListener('touchstart', requestOnGesture, { once: true });
                document.addEventListener('click', requestOnGesture, { once: true });
            });
    } else {
        // Android / non-iOS — works without permission
        setupDeviceOrientation();
    }
}

// ─── Start ────────────────────────────────────────────────────────────────────
tick();
