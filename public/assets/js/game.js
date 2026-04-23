document.addEventListener('DOMContentLoaded', () => {
    const cardContainer = document.getElementById('flip-card-container');
    const questionText  = document.getElementById('question-text');
    const btnStart      = document.getElementById('btn-start-game');
    const btnReady      = document.getElementById('btn-ready-game');
    const btnRestart    = document.getElementById('btn-restart-game');

    const idleState   = document.getElementById('game-idle-state');
    const activeState = document.getElementById('game-active-state');
    const finishState = document.getElementById('game-finished-state');
    const turnMsg     = document.getElementById('game-turn-msg');
    const waitPartner = document.getElementById('game-waiting-partner');
    const levelBadge  = document.getElementById('game-level-badge');
    const progText    = document.getElementById('game-progress-text');
    const progBar     = document.getElementById('game-progress-bar');

    let lastQuestionText = null;
    let lastLevel        = 0;
    let isSyncing        = false;

    // ── API ────────────────────────────────────────────
    async function syncGame(action = null) {
        if (!currentUser) return;
        if (isSyncing && !action) return;
        isSyncing = true;
        try {
            const payload = {
                user_id:    currentUser.id,
                partner_id: currentPartner ? currentPartner.id : null
            };
            if (action) payload.action = action;

            const res  = await fetch(`${API_URL}/game/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();

            if (json.success) {
                renderGame(json.data);
                if (window.onGameStateUpdate) window.onGameStateUpdate(json.data, 'questions');
            }
        } catch (e) {
            console.error('syncGame:', e);
        } finally {
            isSyncing = false;
        }
    }

    // Exposed so game-selector can trigger accept
    window.acceptGame = () => syncGame('accept');

    // ── RENDER ─────────────────────────────────────────
    function renderGame(state) {
        const hasPartner = !!currentPartner;

        // ─ IDLE / WAITING ─
        if (!state.started) {
            finishState.classList.add('hidden');
            idleState.style.display   = 'block';
            activeState.style.display = 'none';

            // If I proposed → change button text
            const IProposed = state.waiting && String(state.waiting_by) === String(currentUser.id);
            if (IProposed) {
                btnStart.innerText = 'Esperando que tu pareja acepte…';
                btnStart.disabled  = true;
                btnStart.style.opacity = '0.5';
            } else {
                btnStart.innerHTML = 'Comenzar Juego';
                btnStart.disabled  = false;
                btnStart.style.opacity = '';
            }

            // Reset card
            if (cardContainer) cardContainer.classList.remove('flipped');
            lastQuestionText = null;
            lastLevel        = 0;
            return;
        }

        // ─ TERMINADO ─
        if (state.current_question_index >= 20) {
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
        const qNum = state.current_question_index + 1;
        if (progText) progText.innerText  = `${qNum}/20`;
        if (progBar)  progBar.style.width = `${(qNum / 20) * 100}%`;

        // Level badge with animation on change
        const lvlNames = { 1: '🔥 Suave', 2: '🌶️ Medio', 3: '🧨 Picante' };
        const newLevel  = state.level || 1;
        if (newLevel !== lastLevel) {
            lastLevel = newLevel;
            if (levelBadge) {
                levelBadge.innerText = lvlNames[newLevel] || 'Nivel ' + newLevel;
                levelBadge.animate([
                    { transform: 'scale(1)',   opacity: 1 },
                    { transform: 'scale(1.4)', opacity: 0.8 },
                    { transform: 'scale(1)',   opacity: 1 }
                ], { duration: 600, easing: 'ease-out' });
                if (newLevel > 1) showNotification(`Subiendo a ${lvlNames[newLevel]}`);
            }
        } else if (levelBadge) {
            levelBadge.innerText = lvlNames[newLevel] || 'Nivel ' + newLevel;
        }

        // Turn message
        const myName = currentUser.name.split(' ')[0];
        const pName  = currentPartner ? currentPartner.name.split(' ')[0] : 'Pareja';
        const myTurn = String(state.turn) === String(currentUser.id);
        if (turnMsg) {
            turnMsg.innerHTML = myTurn
                ? `<strong style="color:#c9a9ff">${myName} responde</strong> <span style="opacity:.25;margin:0 8px">|</span> <span style="opacity:.4;font-size:.8rem">${pName} espera…</span>`
                : `<span style="opacity:.4;font-size:.8rem">${myName} espera…</span> <span style="opacity:.25;margin:0 8px">|</span> <strong style="color:#ff8fab">${pName} responde</strong>`;
        }

        // Ready state
        const iAmP1  = currentPartner ? (Number(currentUser.id) < Number(currentPartner.id)) : true;
        const amReady = iAmP1 ? state.p1_ready : state.p2_ready;
        if (btnReady)  btnReady.style.display  = amReady ? 'none' : 'block';
        if (waitPartner) waitPartner.style.display = amReady ? 'block' : 'none';

        // Question
        const newText = state.question_text;
        if (!newText) { if (questionText) questionText.innerText = 'Preparando…'; return; }
        if (newText !== lastQuestionText) {
            lastQuestionText = newText;
            if (cardContainer) cardContainer.classList.remove('flipped');
            setTimeout(() => {
                if (questionText) questionText.innerText = newText;
                if (cardContainer) cardContainer.classList.add('flipped');
                burstHearts();
            }, 350);
        }
    }

    function burstHearts() {
        const gameCard = document.querySelector('.game-card');
        if (!gameCard) return;
        ['❤️', '✨', '💖', '💕', '🌹'].forEach((icon, i) => {
            if (i >= 6) return;
            const h = document.createElement('div');
            h.className = 'floating-heart';
            h.innerText = icon;
            h.style.left   = Math.random() * 80 + 10 + '%';
            h.style.bottom = '0';
            h.style.animationDelay = Math.random() * 0.4 + 's';
            gameCard.appendChild(h);
            setTimeout(() => h.remove(), 3200);
        });
    }

    // ── BUTTONS ────────────────────────────────────────
    // "Comenzar" now PROPOSES (wait for partner if paired, or start solo)
    btnStart?.addEventListener('click', () => {
        if (currentPartner) {
            syncGame('propose');
        } else {
            // Solo mode: accept immediately
            syncGame('accept');
        }
    });

    btnReady?.addEventListener('click',   () => syncGame('ready'));
    btnRestart?.addEventListener('click', () => {
        if (cardContainer) cardContainer.classList.remove('flipped');
        lastQuestionText = null;
        lastLevel        = 0;
        syncGame('restart');
    });

    // ── LOCAL POLLING (only when panel is visible) ─────
    setInterval(() => {
        const panel = document.getElementById('panel-questions');
        if (panel && panel.style.display !== 'none') syncGame();
    }, 2000);
});
