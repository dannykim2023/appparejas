document.addEventListener('DOMContentLoaded', () => {
    const dareCard      = document.getElementById('dare-flip-card');
    const challengeText = document.getElementById('dare-challenge-text');
    const btnStart      = document.getElementById('btn-start-dare');
    const btnDone       = document.getElementById('btn-dare-done');
    const btnRestart    = document.getElementById('btn-restart-dare');

    const idleState   = document.getElementById('dare-idle-state');
    const activeState = document.getElementById('dare-active-state');
    const finishState = document.getElementById('dare-finished-state');
    const turnMsg     = document.getElementById('dare-turn-msg');
    const waitPartner = document.getElementById('dare-waiting-partner');
    const levelBadge  = document.getElementById('dare-level-badge');
    const progText    = document.getElementById('dare-progress-text');
    const progBar     = document.getElementById('dare-progress-bar');
    const typeBadge   = document.getElementById('dare-type-badge');
    const typeLabel   = document.getElementById('dare-type-label');

    let lastChallengeText = null;
    let lastLevel         = 0;
    let isSyncing         = false;

    // ── API ─────────────────────────────────────────────
    async function syncDare(action = null) {
        if (!currentUser) return;
        if (isSyncing && !action) return;
        isSyncing = true;
        try {
            const payload = {
                user_id:    currentUser.id,
                partner_id: currentPartner ? currentPartner.id : null
            };
            if (action) payload.action = action;

            const res  = await fetch(`${API_URL}/dare/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                renderDare(json.data);
                if (window.onGameStateUpdate) window.onGameStateUpdate(json.data, 'dare');
            }
        } catch (e) {
            console.error('syncDare:', e);
        } finally {
            isSyncing = false;
        }
    }

    // Exposed for game-selector on accept
    window.acceptDare = () => syncDare('accept');

    // ── RENDER ──────────────────────────────────────────
    function renderDare(state) {
        // ─ IDLE / WAITING ─
        if (!state.started) {
            finishState.classList.add('hidden');
            idleState.style.display   = 'block';
            activeState.style.display = 'none';

            const IProposed = state.waiting && String(state.waiting_by) === String(currentUser.id);
            if (IProposed) {
                btnStart.innerText = 'Esperando que tu pareja acepte…';
                btnStart.disabled  = true;
                btnStart.style.opacity = '0.5';
            } else {
                btnStart.innerHTML = 'Comenzar Reto o Verdad';
                btnStart.disabled  = false;
                btnStart.style.opacity = '';
            }

            if (dareCard) dareCard.classList.remove('flipped');
            lastChallengeText = null;
            lastLevel         = 0;
            return;
        }

        // ─ TERMINADO ─
        if (state.current_index >= 20) {
            idleState.style.display   = 'none';
            activeState.style.display = 'none';
            finishState.classList.remove('hidden');
            return;
        }

        // ─ ACTIVO ─
        idleState.style.display   = 'none';
        activeState.style.display = 'block';
        finishState.classList.add('hidden');

        // Progress
        const qNum = state.current_index + 1;
        if (progText) progText.innerText  = `${qNum}/20`;
        if (progBar)  progBar.style.width = `${(qNum / 20) * 100}%`;

        // Level
        const lvlNames = { 1: '🔥 Suave', 2: '🌶️ Medio', 3: '🧨 Picante' };
        const newLevel  = state.challenge_level || 1;
        if (newLevel !== lastLevel) {
            lastLevel = newLevel;
            if (levelBadge) {
                levelBadge.innerText = lvlNames[newLevel] || 'Nivel ' + newLevel;
                levelBadge.animate([
                    { transform: 'scale(1)',   opacity: 1 },
                    { transform: 'scale(1.4)', opacity: 0.8 },
                    { transform: 'scale(1)',   opacity: 1 }
                ], { duration: 600, easing: 'ease-out' });
                if (newLevel > 1) showNotification(`Subiendo a ${lvlNames[newLevel]} 🎲`);
            }
        } else if (levelBadge) {
            levelBadge.innerText = lvlNames[newLevel] || 'Nivel ' + newLevel;
        }

        // Type badge
        const isTruth = state.challenge_type === 'truth';
        if (typeLabel) typeLabel.innerText = isTruth ? 'VERDAD' : 'RETO';
        if (typeBadge) {
            typeBadge.style.background  = isTruth ? 'rgba(147,197,253,.12)' : 'rgba(255,143,171,.12)';
            typeBadge.style.borderColor = isTruth ? 'rgba(147,197,253,.35)' : 'rgba(255,143,171,.35)';
            typeBadge.style.color       = isTruth ? '#93c5fd' : '#ff8fab';
        }

        // Turn
        const myName = currentUser.name.split(' ')[0];
        const pName  = currentPartner ? currentPartner.name.split(' ')[0] : 'Pareja';
        const myTurn = String(state.turn) === String(currentUser.id);
        if (turnMsg) {
            turnMsg.innerHTML = myTurn
                ? `<strong style="color:#ff8fab">${myName} le toca</strong> <span style="opacity:.25;margin:0 8px">|</span> <span style="opacity:.4;font-size:.8rem">${pName} espera…</span>`
                : `<span style="opacity:.4;font-size:.8rem">${myName} espera…</span> <span style="opacity:.25;margin:0 8px">|</span> <strong style="color:#ff8fab">${pName} le toca</strong>`;
        }

        // Done state
        const iAmP1  = currentPartner ? (Number(currentUser.id) < Number(currentPartner.id)) : true;
        const amDone = iAmP1 ? state.p1_done : state.p2_done;
        if (btnDone)     btnDone.style.display  = amDone ? 'none' : 'block';
        if (waitPartner) waitPartner.style.display = amDone ? 'block' : 'none';

        // Challenge text
        const newText = state.challenge_text;
        if (!newText) { if (challengeText) challengeText.innerText = 'Preparando reto…'; return; }
        if (newText !== lastChallengeText) {
            lastChallengeText = newText;
            if (dareCard) dareCard.classList.remove('flipped');
            setTimeout(() => {
                if (challengeText) challengeText.innerText = newText;
                if (dareCard) dareCard.classList.add('flipped');
                burstSparks();
            }, 350);
        }
    }

    function burstSparks() {
        const card = document.querySelector('.dare-card');
        if (!card) return;
        const icons = ['⚡', '🎲', '🔥', '💫', '💥'];
        for (let i = 0; i < 6; i++) {
            const el = document.createElement('div');
            el.className = 'floating-heart';
            el.innerText = icons[Math.floor(Math.random() * icons.length)];
            el.style.left  = Math.random() * 80 + 10 + '%';
            el.style.bottom = '0';
            el.style.animationDelay = Math.random() * 0.4 + 's';
            card.appendChild(el);
            setTimeout(() => el.remove(), 3200);
        }
    }

    // ── BOTONES ─────────────────────────────────────────
    btnStart?.addEventListener('click', () => {
        if (currentPartner) {
            syncDare('propose');
        } else {
            syncDare('accept'); // solo mode
        }
    });

    btnDone?.addEventListener('click',    () => syncDare('done'));
    btnRestart?.addEventListener('click', () => {
        if (dareCard) dareCard.classList.remove('flipped');
        lastChallengeText = null;
        lastLevel         = 0;
        syncDare('restart');
    });

    // ── LOCAL POLLING ────────────────────────────────────
    setInterval(() => {
        const panel = document.getElementById('panel-dare');
        if (panel && panel.style.display !== 'none') syncDare();
    }, 2500);
});
