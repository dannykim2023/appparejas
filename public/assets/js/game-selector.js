/**
 * game-selector.js
 * - Selector navigation
 * - Global polling (on ANY tab) to detect partner proposals
 * - Invite overlay with "Ir a jugar" / "Cancelar"
 */
document.addEventListener('DOMContentLoaded', () => {

    // ── DOM ──────────────────────────────────────────────
    const selector = document.getElementById('game-selector');
    const panelQ   = document.getElementById('panel-questions');
    const panelD   = document.getElementById('panel-dare');
    const overlay  = document.getElementById('game-invite-overlay');
    const iTitle   = document.getElementById('game-invite-title');
    const iDesc    = document.getElementById('game-invite-desc');
    const btnJoin  = document.getElementById('btn-invite-join');
    const btnDismiss = document.getElementById('btn-invite-dismiss');

    let activePanel    = null;   // 'questions' | 'dare' | null
    let inviteShowing  = false;
    let inviteMode     = null;   // game mode of the pending invite
    let dismissedKey   = null;   // key to avoid re-showing same invite

    // ── NAVIGATION ───────────────────────────────────────
    function showSelector() {
        selector.style.display = 'block';
        if (panelQ) panelQ.style.display = 'none';
        if (panelD) panelD.style.display = 'none';
        activePanel = null;
        if (window.lucide) lucide.createIcons();
    }

    window.showGamePanel = function(mode) {
        activePanel = mode;
        selector.style.display = 'none';
        if (mode === 'questions') {
            if (panelQ) panelQ.style.display = 'block';
            if (panelD) panelD.style.display = 'none';
        } else {
            if (panelQ) panelQ.style.display = 'none';
            if (panelD) panelD.style.display = 'block';
        }
        if (window.lucide) lucide.createIcons();
    };

    async function exitCurrentGame() {
        if (!currentUser || !activePanel) return;

        const endpoint = activePanel === 'questions' ? '/game/sync' : '/dare/sync';
        try {
            await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    partner_id: currentPartner ? currentPartner.id : null,
                    action: 'restart'
                })
            });
        } catch(e) {}
    }

    document.getElementById('btn-select-questions')?.addEventListener('click', () => window.showGamePanel('questions'));
    document.getElementById('btn-select-dare')?.addEventListener('click',      () => window.showGamePanel('dare'));
    
    document.getElementById('btn-back-q')?.addEventListener('click', async () => {
        await exitCurrentGame();
        showSelector();
    });
    document.getElementById('btn-back-d')?.addEventListener('click', async () => {
        await exitCurrentGame();
        showSelector();
    });

    // ── INVITE OVERLAY ───────────────────────────────────
    function showInvite(mode, partnerName) {
        if (inviteShowing) return;
        const modeLabel  = mode === 'questions' ? 'Preguntas' : 'Reto o Verdad';
        const inviteKey  = `${mode}_${partnerName}`;
        if (inviteKey === dismissedKey) return;  // already dismissed this one

        iTitle.innerText = `${partnerName} quiere jugar`;
        iDesc.innerText  = `Te invita a ${modeLabel}. ¿Te unes?`;
        inviteMode       = mode;
        overlay.style.display = 'flex';
        inviteShowing    = true;
        if (window.lucide) lucide.createIcons();
    }

    function hideInvite() {
        overlay.style.display = 'none';
        inviteShowing         = false;
    }

    btnJoin?.addEventListener('click', () => {
        hideInvite();
        // Navigate to games tab first
        const tabBtn = document.querySelector('[data-tab="games"]') ||
                       document.querySelector('button[onclick*="games"]');
        if (tabBtn) tabBtn.click();
        // Then open the right panel and accept
        window.showGamePanel(inviteMode);
        // Accept the game (will trigger the server to set started:true)
        const acceptFn = inviteMode === 'questions' ? window.acceptGame : window.acceptDare;
        if (acceptFn) acceptFn();
    });

    btnDismiss?.addEventListener('click', () => {
        // Remember dismissed key so overlay doesn't re-appear for the same proposal
        const pName = currentPartner ? currentPartner.name.split(' ')[0] : '';
        dismissedKey = `${inviteMode}_${pName}`;
        hideInvite();
    });

    // ── GLOBAL POLLING (runs on any tab every 3s) ────────
    async function globalPoll() {
        if (!currentUser || !currentPartner) return;

        const body = JSON.stringify({
            user_id:    currentUser.id,
            partner_id: currentPartner.id
        });
        const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body };

        try {
            const [gRes, dRes] = await Promise.all([
                fetch(`${API_URL}/game/sync`, opts),
                fetch(`${API_URL}/dare/sync`, opts)
            ]);
            const [gData, dData] = await Promise.all([gRes.json(), dRes.json()]);

            checkForInvite(gData?.data, 'questions');
            checkForInvite(dData?.data, 'dare');
        } catch (e) {
            // silent
        }
    }

    function checkForInvite(state, mode) {
        if (!state || !currentPartner) return;
        const partnerName = currentPartner.name.split(' ')[0];

        // Partner proposed but game not started yet
        const partnerWaiting = state.waiting &&
            String(state.waiting_by) === String(currentPartner.id);

        if (partnerWaiting && activePanel !== mode && !inviteShowing) {
            // Reset dismissed key if waiting_by changed (new proposal after cancel)
            const inviteKey = `${mode}_${partnerName}`;
            if (inviteKey !== dismissedKey) {
                showInvite(mode, partnerName);
            }
        }

        // If game started and we were shown the overlay, hide it
        if (state.started && inviteShowing && inviteMode === mode) {
            hideInvite();
        }

        // If the proposal was cancelled (waiting reset), clear dismissed key
        if (!state.waiting && !state.started) {
            const inviteKey = `${mode}_${partnerName}`;
            if (dismissedKey === inviteKey) {
                dismissedKey = null;
            }
        }
    }

    // Start global polling
    setInterval(globalPoll, 3000);
    setTimeout(globalPoll, 1000); // first call after 1s (user might just loaded)
});
