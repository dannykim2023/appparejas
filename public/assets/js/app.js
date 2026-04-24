const API_URL = '/api';

// Global error handler
window.onerror = function(msg, url, line, col, error) {
    console.error('Global Error:', msg, 'line:', line);
    return false;
};

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
});

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
let currentUser = null;
try {
    currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
} catch (e) {
    localStorage.removeItem('currentUser');
}
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
        } else {
            try { await fetch(`${API_URL}/logout`, { method: 'POST' }); } catch(err){}
            document.cookie = 'user_id=; Max-Age=-99999999; path=/';
            document.cookie = 'user_name=; Max-Age=-99999999; path=/';
            localStorage.removeItem('currentUser');
            window.location.href = '/login';
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
    const cycleSettings = document.getElementById('cycle-settings-box');
    if (cycleSettings) {
        cycleSettings.style.display = currentUser.gender === 'H' ? 'none' : 'block';
    }
}

async function initApp() {
    console.log('initApp called, path:', window.location.pathname);
    const isLoginScreen = window.location.pathname.includes('login');
    
    // Recuperación de sesión si el localStorage se perdió pero la cookie existe
    if (!currentUser) {
        const cookies = document.cookie.split('; ');
        const userIdCookie = cookies.find(row => row.startsWith('user_id='));
        if (userIdCookie) {
            const userId = userIdCookie.split('=')[1];
            try {
                const res = await fetch(`${API_URL}/me?user_id=${userId}`);
                const body = await res.json();
                if (body.success) {
                    currentUser = body.data.user;
                    currentPartner = body.data.partner;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                } else {
                    try { await fetch(`${API_URL}/logout`, { method: 'POST' }); } catch(err){}
                    document.cookie = 'user_id=; Max-Age=-99999999; path=/';
                    document.cookie = 'user_name=; Max-Age=-99999999; path=/';
                    localStorage.removeItem('currentUser');
                }
            } catch (e) {
                console.error("Error recuperando sesión:", e);
                try { await fetch(`${API_URL}/logout`, { method: 'POST' }); } catch(err){}
                document.cookie = 'user_id=; Max-Age=-99999999; path=/';
                document.cookie = 'user_name=; Max-Age=-99999999; path=/';
                localStorage.removeItem('currentUser');
            }
        }
    }

    if (currentUser) {
        if (isLoginScreen) {
            window.location.href = '/';
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
            window.location.href = '/login';
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

window.validateEmailAndNext = async function(btn, targetStep) {
    const emailInput = document.getElementById('user-email');
    if (!emailInput) return nextStep(btn, targetStep); // Fallback por si no es el paso 2

    const email = emailInput.value.trim();
    if (!email) {
        showNotification('Por favor, ingresa tu correo.', 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('El formato del correo es inválido.', 'error');
        return;
    }

    // Disable button to prevent spam
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader" class="inline w-4 h-4 mr-1 align-middle animate-spin"></i> Validando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/check-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const body = await res.json();
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        if (body.success) {
            // El correo está libre, podemos avanzar
            if(window.lucide) window.lucide.createIcons();
            nextStep(btn, targetStep);
        } else {
            // El correo ya existe
            showNotification(body.error || 'Este correo ya está registrado.', 'error');
        }
    } catch(e) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showNotification('Error de conexión al verificar el correo.', 'error');
    }
};

window.performRegistration = async () => {
    const name = document.getElementById('user-name').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const password = document.getElementById('user-password').value;
    const gender = document.getElementById('user-gender').value;
    const birth = document.getElementById('user-birth').value;
    const gift = document.getElementById('user-gift').value.trim();
    const partnerCode = document.getElementById('partner-code-onboarding')?.value.trim();
    
    // Validaciones finales
    if (!name || !email || !password) return showNotification('Faltan datos básicos', 'error');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return showNotification('El formato del correo es inválido', 'error');
    
    if (!gender || !birth) return showNotification('Por favor completa tu rol y fecha de nacimiento', 'error');
    if (!gift) return showNotification('Dinos qué te gusta para continuar ✨', 'error');
    
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
            
            // Also set cookie for PHP session
            document.cookie = `user_id=${currentUser.id}; path=/; max-age=${86400*30}; path=/`;
            document.cookie = `user_name=${encodeURIComponent(currentUser.name)}; path=/; max-age=${86400*30}; path=/`;
            
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
            
            window.location.href = '/';
        } else {
            showNotification(body.error || 'Error', 'error');
        }
    } catch (e) {
        showNotification('Error de conexión', 'error');
    }
};

function setupEvents() {
    console.log('Setting up events...');
    
    // Debug: Verify wizard elements exist
    console.log('Wizard buttons found:', document.querySelectorAll('.btn-next-step').length);
    console.log('Wizard steps found:', document.querySelectorAll('.wizard-step').length);
    
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

    // El registro y la navegación ahora se manejan globalmente o por HTML onclick
    const btnRegister = document.getElementById('btn-register');
    if(btnRegister) {
        btnRegister.addEventListener('click', window.performRegistration);
    }

    // Login Action
    const btnDoLogin = document.getElementById('btn-do-login');
    if(btnDoLogin) {
        btnDoLogin.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            if(!email || !password) return showNotification('Ingresa email y contraseña', 'error');
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return showNotification('El formato del correo es inválido', 'error');
            
            try {
                const res = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const body = await res.json();
                if (body.success) {
                    showNotification('¡Bienvenido de nuevo!');
                    localStorage.setItem('currentUser', JSON.stringify(body.data.user));
                    
                    // Backup cookie explícita
                    document.cookie = `user_id=${body.data.user.id}; max-age=2592000; path=/`;
                    document.cookie = `user_name=${body.data.user.name}; max-age=2592000; path=/`;
                    
                    setTimeout(() => window.location.href = '/', 600);
                } else {
                    showNotification(body.error || 'Credenciales incorrectas', 'error');
                }
            } catch(e) {
                showNotification('Error al conectar con el servidor', 'error');
            }
        });
    }

    // Sync - Connect Partner
    const btnConnect = document.getElementById('btn-connect');
    if(btnConnect) {
        btnConnect.addEventListener('click', async () => {
            const code = document.getElementById('partner-code-input').value.trim().toUpperCase();
            if (!code || code.length !== 6) return showNotification('Código inválido', 'error');
            
            btnConnect.disabled = true;
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
            } finally {
                btnConnect.disabled = false;
            }
        });
    }
    
    // Anniversary
    const btnAnniv = document.getElementById('btn-save-anniversary');
    if(btnAnniv) {
        btnAnniv.addEventListener('click', async () => {
            const dt = document.getElementById('anniversary-date-input').value;
            if(!dt) return showNotification('Elige la fecha');
            btnAnniv.disabled = true;
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
            } finally {
                btnAnniv.disabled = false;
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

            btnUpdate.disabled = true;
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
            } finally {
                btnUpdate.disabled = false;
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
        btnLogout.addEventListener('click', async () => {
            try {
                await fetch(`${API_URL}/logout`, { method: 'POST' });
            } catch(e) {}
            localStorage.removeItem('currentUser');
            window.location.href = '/login';
        });
    }
}
