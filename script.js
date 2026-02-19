// ─── Element References ───────────────────────────────────────────────────────
const card            = document.getElementById('card');
const cardRotator     = document.getElementById('cardRotator');
const cardImage       = document.getElementById('cardImage');
const cardPattern     = document.getElementById('cardPattern');
const cardBackPattern = document.getElementById('cardBackPattern');
const maskOverlay     = document.getElementById('cardMaskOverlay');
const backMask        = document.getElementById('cardBackMask');
const tiltToggle      = document.getElementById('tiltToggle');

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
    MAX_ROTATION: 6,
    GYRO_SCALE: 0.25,
    IDLE_TIMEOUT: 3000,
};

// ─── State ────────────────────────────────────────────────────────────────────
let state = {
    tiltEnabled:   true,
    isHovering:    false,
    idleTimer:     null,
    gyroIdleTimer: null,
    _patternUrl:   null,
    rafId:         null,
    // pending values written once per RAF frame
    pending: null,
    // cached card rect — refreshed on resize/scroll
    rect: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function round(v, p = 3)  { return parseFloat(v.toFixed(p)); }

// ─── CSS var setter ───────────────────────────────────────────────────────────
const style = card.style;
function set(prop, val) { style.setProperty(prop, val); }

// ─── Cache card rect (avoid getBoundingClientRect on every event) ─────────────
function refreshRect() { state.rect = card.getBoundingClientRect(); }
refreshRect();
window.addEventListener('resize', refreshRect, { passive: true });
window.addEventListener('scroll', refreshRect, { passive: true });

// ─── img → data URL (works for both file:// and http://) ──────────────────────
function imgToDataUrl(imgEl, callback) {
    const apply = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = imgEl.naturalWidth  || imgEl.width  || 256;
        canvas.height = imgEl.naturalHeight || imgEl.height || 256;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgEl, 0, 0);
        callback(canvas.toDataURL());
    };
    if (imgEl.complete && imgEl.naturalWidth) {
        apply();
    } else {
        imgEl.addEventListener('load', apply, { once: true });
    }
}

// ─── Apply front mask ─────────────────────────────────────────────────────────
function applyMask(url) {
    if (url) {
        maskOverlay.src = url;
        set('--mask', `url("${url}")`);
        card.classList.add('masked');
        return;
    }
    imgToDataUrl(maskOverlay, (dataUrl) => {
        set('--mask', `url("${dataUrl}")`);
        card.classList.add('masked');
    });
}

// ─── Apply back mask ──────────────────────────────────────────────────────────
function applyBackMask(url) {
    if (url) {
        backMask.src = url;
        set('--back-mask', `url("${url}")`);
        return;
    }
    imgToDataUrl(backMask, (dataUrl) => {
        set('--back-mask', `url("${dataUrl}")`);
    });
}

// ─── Core frame update — called once per RAF ──────────────────────────────────
function applyCardState(rotX, rotY, glareX, glareY) {
    const cssRotX = state.tiltEnabled ? rotX : 0;
    const cssRotY = state.tiltEnabled ? rotY : 0;
    set('--rotate-x', `${round(cssRotX)}deg`);
    set('--rotate-y', `${round(cssRotY)}deg`);

    set('--pointer-x', `${round(glareX)}%`);
    set('--pointer-y', `${round(glareY)}%`);

    const fromLeft   = round(glareX / 100, 4);
    const fromTop    = round(glareY / 100, 4);
    const fromCenter = clamp(
        round(Math.sqrt((fromLeft - 0.5) ** 2 + (fromTop - 0.5) ** 2) * Math.SQRT2, 4),
        0, 1
    );
    set('--pointer-from-left',   fromLeft);
    set('--pointer-from-top',    fromTop);
    set('--pointer-from-center', fromCenter);

    const bgX = round(50 + (rotY / CONFIG.MAX_ROTATION) * 30);
    const bgY = round(50 - (rotX / CONFIG.MAX_ROTATION) * 30);
    set('--background-x', `${bgX}%`);
    set('--background-y', `${bgY}%`);

    const dist     = Math.sqrt(rotX * rotX + rotY * rotY);
    const intensity = clamp(dist / CONFIG.MAX_ROTATION, 0, 1);
    set('--card-opacity', round(intensity, 3));

    const rAngle = 135 + (rotY / CONFIG.MAX_ROTATION) * 30;
    const rPos   = 50  + (rotY / CONFIG.MAX_ROTATION) * 30;
    set('--rainbow-angle', `${round(rAngle)}deg`);
    set('--rainbow-pos',   `${round(rPos)}%`);
    const patBgPos = `calc(${round(rPos)}% + 10%) calc(${round(rPos)}% + 10%), center`;
    cardPattern.style.backgroundPosition = patBgPos;
    if (cardBackPattern) cardBackPattern.style.backgroundPosition = patBgPos;
}

// ─── RAF-throttled flush ──────────────────────────────────────────────────────
function scheduleFrame(rotX, rotY, glareX, glareY) {
    state.pending = { rotX, rotY, glareX, glareY };
    if (!state.rafId) {
        state.rafId = requestAnimationFrame(() => {
            state.rafId = null;
            const p = state.pending;
            if (p) { state.pending = null; applyCardState(p.rotX, p.rotY, p.glareX, p.glareY); }
        });
    }
}

// ─── Reset to center ──────────────────────────────────────────────────────────
function resetToCenter() {
    scheduleFrame(0, 0, 50, 50);
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
    const rect  = state.rect;
    const normX = clamp((clientX - rect.left  - rect.width  / 2) / (rect.width  / 2), -1, 1);
    const normY = clamp((clientY - rect.top   - rect.height / 2) / (rect.height / 2), -1, 1);
    const rotX  =  normY * CONFIG.MAX_ROTATION;
    const rotY  =  normX * CONFIG.MAX_ROTATION;
    const glareX = clamp(((clientX - rect.left) / rect.width)  * 100, 0, 100);
    const glareY = clamp(((clientY - rect.top)  / rect.height) * 100, 0, 100);
    scheduleFrame(rotX, rotY, glareX, glareY);
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
    if (e.target.closest('button, select, input, label, .editor, .mobile-editor-drawer, .mobile-editor-overlay, .bottom-bar')) return;
    e.preventDefault();
    const t = e.touches[0];
    state.isHovering = true;
    handlePointerMove(t.clientX, t.clientY);
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (e.target.closest('button, select, input, label, .editor, .mobile-editor-drawer, .mobile-editor-overlay, .bottom-bar')) return;
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
    const rawGamma = (e.gamma ?? 0) * CONFIG.GYRO_SCALE;
    const rawBeta  = ((e.beta  ?? 0) - 30) * CONFIG.GYRO_SCALE;
    const rotY = clamp(rawGamma, -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
    const rotX = clamp(rawBeta,  -CONFIG.MAX_ROTATION, CONFIG.MAX_ROTATION);
    const glareX = 50 + (rotY / CONFIG.MAX_ROTATION) * 40;
    const glareY = 50 + (rotX / CONFIG.MAX_ROTATION) * 40;
    scheduleFrame(rotX, rotY, glareX, glareY);
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

// ─── Tilt Toggle (shared — bottom bar) ───────────────────────────────────────
tiltToggle.addEventListener('click', () => {
    state.tiltEnabled = !state.tiltEnabled;
    tiltToggle.classList.toggle('active', state.tiltEnabled);
    tiltToggle.querySelector('.toggle-text').textContent = state.tiltEnabled ? 'on' : 'off';
    if (!state.tiltEnabled) resetToCenter();
});

// ─── Holo Type Switcher (shared — bottom bar) ─────────────────────────────────
document.querySelectorAll('.holo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.holo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        card.dataset.rarity = btn.dataset.rarity;
    });
});

// ─── Editor: Layer Order ──────────────────────────────────────────────────────
const layerEls = {
    holo:    document.getElementById('cardShine'),
    pattern: cardPattern,
    mask:    maskOverlay,
};
const layerZEls = {
    holo:    document.getElementById('zHolo'),
    pattern: document.getElementById('zPattern'),
    mask:    document.getElementById('zMask'),
};

function reassignZIndices() {
    const items = document.querySelectorAll('#layerList .layer-item');
    const total = items.length;
    items.forEach((item, i) => {
        const layer = item.dataset.layer;
        const z = (total - i) * 10;
        layerEls[layer].style.zIndex = z;
        layerZEls[layer].textContent = z;
    });
}

(function setupLayerDrag() {
    const list = document.getElementById('layerList');
    let dragging = null;

    list.addEventListener('dragstart', (e) => {
        dragging = e.target.closest('.layer-item');
        dragging.classList.add('dragging');
    });
    list.addEventListener('dragend', () => {
        if (dragging) dragging.classList.remove('dragging');
        dragging = null;
        reassignZIndices();
    });
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const over = e.target.closest('.layer-item');
        if (!over || over === dragging) return;
        const rect = over.getBoundingClientRect();
        const mid  = rect.top + rect.height / 2;
        if (e.clientY < mid) {
            list.insertBefore(dragging, over);
        } else {
            list.insertBefore(dragging, over.nextSibling);
        }
    });
})();

reassignZIndices();

// ─── Editor: Blend Modes ──────────────────────────────────────────────────────
const cardShine = document.getElementById('cardShine');
const cardGlare = document.getElementById('cardGlare');

maskOverlay.style.mixBlendMode = 'overlay';
cardPattern.style.mixBlendMode = 'color-dodge';
cardShine.style.mixBlendMode   = 'color-dodge';
cardGlare.style.mixBlendMode   = 'color-dodge';

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

setupUpload('uploadMaskBack', 'nameMaskBack', (url) => {
    applyBackMask(url);
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
    document.getElementById('cardBack').src = url;
});

// ─── Mobile Editor Drawer ─────────────────────────────────────────────────────
(function setupMobileDrawer() {
    const btn     = document.getElementById('mobileEditorBtn');
    const overlay = document.getElementById('mobileEditorOverlay');
    const drawer  = document.getElementById('mobileEditorDrawer');
    const content = document.getElementById('mobileDrawerContent');

    const editorBody = document.getElementById('editorBody');
    const clone = editorBody.cloneNode(true);
    clone.querySelectorAll('[id]').forEach(el => {
        el.id = 'm-' + el.id;
    });
    content.appendChild(clone);

    function syncSelects() {
        ['blendMask', 'blendPattern', 'blendHolo'].forEach(id => {
            const orig   = document.getElementById(id);
            const cloned = document.getElementById('m-' + id);
            if (orig && cloned) cloned.value = orig.value;
        });
    }

    const mBlendMask    = document.getElementById('m-blendMask');
    const mBlendPattern = document.getElementById('m-blendPattern');
    const mBlendHolo    = document.getElementById('m-blendHolo');

    if (mBlendMask) mBlendMask.addEventListener('change', (e) => {
        maskOverlay.style.mixBlendMode = e.target.value;
        document.getElementById('blendMask').value = e.target.value;
    });
    if (mBlendPattern) mBlendPattern.addEventListener('change', (e) => {
        cardPattern.style.mixBlendMode = e.target.value;
        document.getElementById('blendPattern').value = e.target.value;
    });
    if (mBlendHolo) mBlendHolo.addEventListener('change', (e) => {
        cardShine.style.mixBlendMode = e.target.value;
        cardGlare.style.mixBlendMode = e.target.value;
        document.getElementById('blendHolo').value = e.target.value;
    });

    function openDrawer() {
        syncSelects();
        overlay.classList.add('active');
        drawer.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        overlay.classList.remove('active');
        drawer.classList.remove('active');
        document.body.style.overflow = '';
    }

    btn.addEventListener('click', openDrawer);
    overlay.addEventListener('click', closeDrawer);
})();

// ─── Init ─────────────────────────────────────────────────────────────────────
applyMask();
applyBackMask();
resetToCenter();
