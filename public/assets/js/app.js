const API_URL = '/api';

// Utilities
function showNotification(msg, type = 'success', isHtml = false) {
    const wrapper = document.getElementById('notification-wrapper');
    if (!wrapper) return;

    const notif = document.createElement('div');
    notif.className = `notification ${type} fade-in`;
    
    const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info');
    
    const content = isHtml ? msg : `<span>${msg}</span>`;
    
    notif.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; width:100%;">
            <i data-lucide="${icon}" style="width:18px; height:18px; flex-shrink:0;"></i>
            <div style="flex:1;">${content}</div>
        </div>
    `;
    
    wrapper.appendChild(notif);
    if (window.lucide) lucide.createIcons();
    
    setTimeout(() => {
        if (!notif.parentElement) return;
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-10px)';
        setTimeout(() => notif.remove(), 400);
    }, 6000); // Increased duration for interaction
}

// Global State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentPartner = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEvents();
});

async function checkServerSession() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/me?user_id=${currentUser.id}`);
        const body = await res.json();
        if (body.success) {
            currentUser = body.data.user;
            currentPartner = body.data.partner;
            const gameStatus = body.data.game_status;
            const gameType = body.data.game_type;

            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUIProfile();

            // Check for Game Invite
            if (gameStatus && gameStatus.waiting && String(gameStatus.waiting_by) !== String(currentUser.id)) {
                handleGameInvite(gameStatus, gameType);
            }
        }
    } catch(e) { }
}

let activeGameNotification = null;
let currentInviteType = null;

function handleGameInvite(status, type) {
    if (activeGameNotification) return; 
    
    currentInviteType = type;
    const partnerName = currentPartner ? currentPartner.name : 'Tu pareja';
    const gameName = type === 'dares' ? 'Retos y Verdades' : 'Preguntas Profundas';
    
    const overlay = document.getElementById('game-invite-overlay');
    const desc = document.getElementById('game-invite-desc');
    const btnJoin = document.getElementById('btn-invite-join');
    
    if (overlay && desc && btnJoin) {
        desc.innerHTML = `<strong>${partnerName}</strong> quiere conectar contigo jugando a <strong>${gameName}</strong>. ¿Aceptas el desafío?`;
        btnJoin.onclick = () => acceptGameInvite();
        overlay.style.display = 'flex';
        activeGameNotification = true;
    }
}

window.acceptGameInvite = async () => {
    const type = currentInviteType || 'questions';
    const endpoint = type === 'dares' ? '/dare/sync' : '/game/sync';
    const tabTarget = type === 'dares' ? 'panel-dares' : 'panel-questions';
    
    // 1. Accept on server
    await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            user_id: currentUser.id, 
            partner_id: currentPartner.id,
            action: 'accept'
        })
    });
    
    // 2. Redirect to specific game tab
    const tabBtn = document.querySelector(`[data-target="${tabTarget}"]`);
    if (tabBtn) tabBtn.click();
    
    activeGameNotification = null;
    currentInviteType = null;
    
    const overlay = document.getElementById('game-invite-overlay');
    if (overlay) overlay.style.display = 'none';
};

function updateUIProfile() {
    const isDashboard = window.location.pathname.includes('index') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    if (!isDashboard) return;

    // Profile inputs load
    const pn = document.getElementById('prof-name'); if(pn) pn.value = currentUser.name;
    const pg = document.getElementById('prof-gender'); if(pg) pg.value = currentUser.gender || 'M';
    const pb = document.getElementById('prof-birth'); if(pb) pb.value = currentUser.birth_date || '';
    
    let prefsTxt = "";
    if(currentUser.preferences) {
        let pr = typeof currentUser.preferences === 'string' ? JSON.parse(currentUser.preferences) : currentUser.preferences;
        prefsTxt = pr.gustos || "";
    }
    const pfg = document.getElementById('prof-gift'); if(pfg) pfg.value = prefsTxt;

    // Header names and badge
    if (currentPartner) {
        document.getElementById('display-name').innerHTML = `${currentUser.name} <span style="font-size: 0.8em; color:var(--text-secondary);">&</span> ${currentPartner.name}`;
        
        let annivDate = currentUser.anniversary_date || currentPartner.anniversary_date;
        if(annivDate) {
            const ms = new Date() - new Date(annivDate);
            const days = Math.floor(ms / (1000 * 60 * 60 * 24));
            const dsStr = days > -1 ? days : 0;
            document.getElementById('anniversary-badge').innerText = `💕 ${dsStr} días juntos`;
            document.getElementById('anniversary-badge').style.display = 'inline-block';
        }
        
        // Form en tab-sync
        const pi = document.getElementById('partner-info');
        if(pi) pi.style.display = 'block';
        const sy = document.getElementById('sync-form');
        if(sy) sy.style.display = 'none';
        
        document.getElementById('p-name').innerText = currentPartner.name;
        document.getElementById('p-birth').innerText = currentPartner.birth_date || 'No definido';
        
        let prefs = "No ha definido regalos/gustos";
        if(currentPartner.preferences) {
            let pr = typeof currentPartner.preferences === 'string' ? JSON.parse(currentPartner.preferences) : currentPartner.preferences;
            prefs = pr.gustos || prefs;
        }
        document.getElementById('p-gifts').innerText = prefs;
        
        if(annivDate) {
            document.getElementById('anniversary-date-input').value = annivDate;
        }

    } else {
        document.getElementById('display-name').innerText = currentUser.name;
    }

    // Role-based visibility
    if (currentUser.gender === 'H') {
        const cycleSettings = document.getElementById('cycle-settings-box');
        if(cycleSettings) cycleSettings.style.display = 'none';
    }
}

async function initApp() {
    const isLoginScreen = window.location.pathname.includes('login');
    
    if (currentUser) {
        if (isLoginScreen) {
            window.location.href = 'index.html';
            return;
        }

        const screen = document.getElementById('dashboard-section');
        if(screen) screen.classList.add('active');
        
        if (sessionStorage.getItem('welcome_msg')) {
            setTimeout(() => {
                if(window.confetti) window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                showNotification(sessionStorage.getItem('welcome_msg'));
                sessionStorage.removeItem('welcome_msg');
            }, 800);
        }
        
        const elName = document.getElementById('display-name');
        if(elName) elName.innerText = currentUser.name;
        
        const elCode = document.getElementById('display-code');
        if(elCode) elCode.innerText = currentUser.unique_code;
        
        updateUIProfile();
        await checkServerSession();
        
        if (window.calendarObj) window.calendarObj.loadData();
        if (window.timelineObj) window.timelineObj.loadData();

        // Start background polling
        setInterval(checkServerSession, 5000);
    } else {
        if (!isLoginScreen) {
            window.location.href = 'login.html';
            return;
        }
        
        const screen = document.getElementById('auth-section');
        if(screen) screen.classList.add('active');
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Global Functions for Inline HTML onclick
window.selectRole = function(role, element) {
    document.querySelectorAll('.role-card').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('user-gender').value = role;
};

window.toggleTag = function(element) {
    element.classList.toggle('selected');
    const txtBox = document.getElementById('user-gift');
    const str = element.innerText.trim();
    
    if (element.classList.contains('selected')) {
        if(!txtBox.value.includes(str)) {
            txtBox.value = txtBox.value ? txtBox.value + ', ' + str : str;
        }
    } else {
        txtBox.value = txtBox.value.replace(new RegExp(str + ',?\\s?', 'g'), '').trim();
        if(txtBox.value.endsWith(',')) txtBox.value = txtBox.value.slice(0,-1);
    }
};

function setupEvents() {
    // Tabs Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            const targetId = targetBtn.dataset.target;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            targetBtn.classList.add('active');
            const pane = document.getElementById(targetId);
            if(pane) pane.classList.add('active');
        });
    });

    // Auth - UI Wizard Step Navigation
    document.querySelectorAll('.btn-next-step').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentStep = e.target.closest('.wizard-step').id;
            
            // Validations
            if(currentStep === 'step-1') {
                const name = document.getElementById('user-name').value.trim();
                if (!name) {
                    showNotification('Por favor dinos tu nombre', 'error');
                    return;
                }
            } else if (currentStep === 'step-2') {
                const email = document.getElementById('user-email').value.trim();
                const pass = document.getElementById('user-password').value;
                if (!email || !pass) {
                    showNotification('Por favor completa email y contraseña', 'error');
                    return;
                }
                if (pass.length < 6) {
                    showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
                    return;
                }
            } else if (currentStep === 'step-3') {
                const gender = document.getElementById('user-gender').value;
                if (!gender) {
                    showNotification('Selecciona si eres Mujer u Hombre para continuar', 'error');
                    return;
                }
            }

            const target = btn.dataset.target;
            document.querySelectorAll('.wizard-step').forEach(s => s.style.display = 'none');
            document.getElementById(target).style.display = 'block';
        });
    });
    
    document.querySelectorAll('.btn-prev-step').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            document.querySelectorAll('.wizard-step').forEach(s => s.style.display = 'none');
            document.getElementById(target).style.display = 'block';
        });
    });

    // Auth - Register Action
    const performRegistration = async () => {
        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const password = document.getElementById('user-password').value;
        const gender = document.getElementById('user-gender').value;
        const birth = document.getElementById('user-birth').value;
        const gift = document.getElementById('user-gift').value.trim();
        const partnerCode = document.getElementById('partner-code-onboarding')?.value.trim();
        
        if (!name || !email || !password) return showNotification('Faltan datos requeridos', 'error');
        
        try {
            // 1. Register User
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name, 
                    email,
                    password,
                    gender, 
                    birth, 
                    preferences: { gustos: gift } 
                })
            });
            const body = await res.json();
            
            if (body.success) {
                currentUser = body.data;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // 2. Connect if code provided
                let linkedStr = "";
                if (partnerCode && partnerCode.length === 6) {
                    try {
                        const resSync = await fetch(`${API_URL}/connect-partner`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: currentUser.id, partner_code: partnerCode })
                        });
                        const syncBody = await resSync.json();
                        if(!syncBody.success) {
                            alert("Cuenta creada, pero el código de pareja era inválido. Podrás vincularlo luego dentro de la App.");
                        } else {
                            linkedStr = syncBody.data ? syncBody.data.name : "tu pareja";
                        }
                    } catch(e) {}
                }
                
                // Redirigir al inicio pasando variables con sessionStorage
                if (linkedStr) {
                    sessionStorage.setItem('welcome_msg', `¡Felicidades! Te vinculaste a ${linkedStr} 🎉`);
                } else {
                    sessionStorage.setItem('welcome_msg', `¡Bienvenido/a ${currentUser.name}! 🎉`);
                }
                
                window.location.href = 'index.html';
            } else {
                showNotification(body.error || 'Error', 'error');
            }
        } catch (e) {
            showNotification('Error de conexión', 'error');
        }
    };

    const btnRegister = document.getElementById('btn-register');
    if(btnRegister) {
        btnRegister.addEventListener('click', performRegistration);
    }

    // Login Action
    const btnDoLogin = document.getElementById('btn-do-login');
    if(btnDoLogin) {
        btnDoLogin.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            if(!email || !password) return showNotification('Ingresa email y contraseña', 'error');
            
            try {
                const res = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const body = await res.json();
                if(body.success) {
                    currentUser = body.data;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    sessionStorage.setItem('welcome_msg', `¡Hola de nuevo, ${currentUser.name}! ✨`);
                    window.location.href = 'index.html';
                } else {
                    showNotification(body.error || 'Credenciales incorrectas', 'error');
                }
            } catch(e) {
                showNotification('Error al conectar con el servidor', 'error');
            }
        });
    }
    
    const btnSkip = document.getElementById('btn-skip-code');
    if(btnSkip) {
        btnSkip.addEventListener('click', () => {
            document.getElementById('partner-code-onboarding').value = '';
            performRegistration();
        });
    }

    // Sync - Connect Partner
    const btnConnect = document.getElementById('btn-connect');
    if(btnConnect) {
        btnConnect.addEventListener('click', async () => {
            const code = document.getElementById('partner-code-input').value.trim().toUpperCase();
            if (!code || code.length !== 6) return showNotification('Código inválido', 'error');
            
            try {
                const res = await fetch(`${API_URL}/connect-partner`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: currentUser.id, partner_code: code })
                });
                const body = await res.json();
                
                if (body.success) {
                    if(window.confetti) window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                    const pName = body.data.partner ? body.data.partner.name : 'tu pareja';
                    showNotification(`¡Felicidades! Te vinculaste a ${pName} 🎉`);
                    await checkServerSession();
                    if (window.calendarObj) window.calendarObj.loadData();
                } else {
                    showNotification(body.error || 'Error al vincular', 'error');
                }
            } catch (e) {
                showNotification('Error de conexión', 'error');
            }
        });
    }
    
    // Anniversary
    const btnAnniv = document.getElementById('btn-save-anniversary');
    if(btnAnniv) {
        btnAnniv.addEventListener('click', async () => {
            const dt = document.getElementById('anniversary-date-input').value;
            if(!dt) return showNotification('Elige la fecha');
            try {
                const res = await fetch(`${API_URL}/set-anniversary`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: currentUser.id, date: dt })
                });
                const body = await res.json();
                if(body.success) {
                    showNotification('Fiesta agendada 🎉');
                    await checkServerSession(); 
                }
            } catch (e) {
                showNotification('Error guardando fecha', 'error');
            }
        });
    }

    // Update Profile
    const btnUpdate = document.getElementById('btn-update-profile');
    if(btnUpdate) {
        btnUpdate.addEventListener('click', async () => {
            const name = document.getElementById('prof-name').value;
            const gender = document.getElementById('prof-gender').value;
            const birth = document.getElementById('prof-birth').value;
            const gift = document.getElementById('prof-gift').value;

            try {
                const res = await fetch(`${API_URL}/update-profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: currentUser.id, name, gender, birth, preferences: { gustos: gift } })
                });
                const body = await res.json();
                if(body.success) {
                    showNotification('Perfil actualizado 🌟');
                    await checkServerSession();
                    if(window.calendarObj) window.calendarObj.loadData();
                }
            } catch (e) {
                showNotification('Fallo de red', 'error');
            }
        });
    }

    // Delete Account
    const btnDel = document.getElementById('btn-delete-account');
    if(btnDel) {
        btnDel.addEventListener('click', async () => {
            const conf = confirm('⚠️ ¿ESTÁS 100% SEGURO(A)?\nSe borrará todo tu historial del ciclo, se romperá la conexión con tu pareja y tu cuenta desaparecerá para siempre. Esto no se puede deshacer.');
            if(!conf) return;

            try {
                const res = await fetch(`${API_URL}/delete-account`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: currentUser.id })
                });
                const body = await res.json();
                if(body.success) {
                    localStorage.removeItem('currentUser');
                    location.reload();
                }
            } catch (e) {
                showNotification('Error al intentar borrar', 'error');
            }
        });
    }

    // Logout
    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }
}
