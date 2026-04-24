// ===============================
// 📅 UTILIDAD: Formatear fecha LOCAL (evita bugs de UTC)
// ===============================
function formatDateLocal(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

// Utilidad para parsear strings YYYY-MM-DD forzando zona local a las 00:00 hrs
function parseDateLocal(dateStr) {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-');
    return new Date(y, m - 1, d);
}

// ===============================
// 📅 OBJETO PRINCIPAL CALENDARIO
// ===============================
window.calendarObj = {

    currentDate: new Date(),

    cycleData: {
        my_predictions: [],
        partner_predictions: [],
        my_history: [],
        partner_history: []
    },

    eventsData: [],
    eventsMap: {}, // lookup rápido optimization

    async init() {
        this.setupEvents();
        await this.loadData();
    },

    async loadData() {
        if (!currentUser) return;
        try {
            // Ciclos
            const res = await fetch(`${API_URL}/get-calendar?user_id=${currentUser.id}`);
            const body = await res.json();
            if (body.success) this.cycleData = body.data;

            // Eventos
            const evRes = await fetch(`${API_URL}/get-events?user_id=${currentUser.id}`);
            const evBody = await evRes.json();

            if (evBody.success) {
                this.eventsData = evBody.data;
                this.buildEventsMap();
            }

            this.renderCalendar();
        } catch (e) {
            console.error("Error calendario:", e);
        }
    },

    buildEventsMap() {
        this.eventsMap = {};
        this.eventsData.forEach(e => {
            if (!this.eventsMap[e.date]) this.eventsMap[e.date] = [];
            this.eventsMap[e.date].push(e);
        });
    },

    setupEvents() {
        document.getElementById('btn-prev-month').onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.loadData();
        };

        document.getElementById('btn-next-month').onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.loadData();
        };

        document.getElementById('btn-save-cycle').onclick = async () => {
            const date = document.getElementById('cycle-date').value;
            const length = document.getElementById('cycle-length').value;

            if (!date || !length) {
                return showNotification('Completa los datos', 'error');
            }

            await fetch(`${API_URL}/save-cycle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    last_period_date: date,
                    cycle_length: parseInt(length)
                })
            });

            showNotification('Ciclo actualizado');
            this.loadData();
        };

        // Modal Elements
        const modal = document.getElementById('event-modal');
        const extraInputs = document.getElementById('event-extra-inputs');
        const btnSaveEvent = document.getElementById('btn-confirm-event');
        let selectedDate = null;
        let selectedType = null;

        document.getElementById('btn-close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
            extraInputs.style.display = 'none';
        });

        document.querySelectorAll('.event-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                selectedType = btn.dataset.type;

                if(['period', 'intimacy'].includes(selectedType)) {
                    modal.classList.remove('active');
                    extraInputs.style.display = 'none';
                    if (selectedType === 'period') {
                        if (currentUser.gender === 'H') {
                            return showNotification('Solo la mujer puede registrar la menstruación.', 'error');
                        }
                        await this.togglePeriod(selectedDate);
                    } else {
                        await this.saveEvent(selectedDate, selectedType, '');
                    }
                    return;
                }

                document.querySelectorAll('.event-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                extraInputs.style.display = 'block';

                let p = document.getElementById('event-value');
                if(selectedType === 'note') p.placeholder = "Mi diario amoroso...";
                if(selectedType === 'symptom') p.placeholder = "Me duele la cabeza, estoy feliz...";
                p.focus();
            });
        });

        btnSaveEvent.addEventListener('click', async () => {
             if(!selectedType) return showNotification('Selecciona un tipo', 'error');
             
             btnSaveEvent.disabled = true;
             const val = document.getElementById('event-value').value;
             modal.classList.remove('active');
             extraInputs.style.display = 'none';
             
             await this.saveEvent(selectedDate, selectedType, val);
             btnSaveEvent.disabled = false;
        });

        // 🔥 Lógica de Doble Interacción: Short Tap (Toggle Periodo) y Long Press (Modal otros eventos)
        const grid = document.getElementById('calendar-grid');
        let pressTimer = null;
        let isLongPress = false;
        let startX = 0, startY = 0;

        grid.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            const cell = e.target.closest('.cal-day:not(.empty)');
            if(!cell) return;
            
            isLongPress = false;
            startX = e.clientX;
            startY = e.clientY;

            pressTimer = setTimeout(() => {
                isLongPress = true;
                if(navigator.vibrate) navigator.vibrate(50);
                
                selectedDate = cell.dataset.date;
                const dt = parseDateLocal(selectedDate);
                const options = { day: 'numeric', month: 'long' };
                document.getElementById('modal-date-title').innerText = dt.toLocaleDateString('es-ES', options);
                
                document.querySelectorAll('.event-btn').forEach(b => b.classList.remove('active'));
                document.getElementById('event-value').value = '';
                modal.classList.add('active');
            }, 400); // 400ms mantenido = Modal de Intimidad/Sintomas/Note
        });

        grid.addEventListener('pointerup', async (e) => {
            clearTimeout(pressTimer);
            const cell = e.target.closest('.cal-day:not(.empty)');
            if(!cell) return;
            
            if(!isLongPress) {
                e.preventDefault();
                // Simple Tap now opens the modal for better UX
                selectedDate = cell.dataset.date;
                const dt = parseDateLocal(selectedDate);
                const options = { day: 'numeric', month: 'long' };
                document.getElementById('modal-date-title').innerText = dt.toLocaleDateString('es-ES', options);
                
                document.querySelectorAll('.event-btn').forEach(b => b.classList.remove('active'));
                document.getElementById('event-value').value = '';
                extraInputs.style.display = 'none';
                modal.classList.add('active');
            }
        });

        grid.addEventListener('pointermove', (e) => {
            if(Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) {
                clearTimeout(pressTimer);
            }
        });
        
        grid.addEventListener('contextmenu', (e) => {
            if(e.target.closest('.cal-day:not(.empty)')) e.preventDefault();
        });
    },

    async togglePeriod(date) {
        try {
            const res = await fetch(`${API_URL}/toggle-period`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, date })
            });

            const body = await res.json();

            if (body.success) {
                showNotification(body.data.newState ? '🩸 Menstruación iniciada' : '➖ Registro limpiado');
                this.loadData();
                if(window.timelineObj) window.timelineObj.loadData();
            }
        } catch (e) {
            showNotification('Error de red', 'error');
        }
    },

    async saveEvent(date, type, value) {
        try {
            const res = await fetch(`${API_URL}/save-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, date, type, value })
            });
            const body = await res.json();
            if(body.success) {
                showNotification('¡Guardado!');
                this.loadData();
                if(window.timelineObj) window.timelineObj.loadData();
            } else {
                showNotification(body.error, 'error');
            }
        } catch(e) { showNotification('Fallo de Red', 'error'); }
    },

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        document.getElementById('calendar-month-year').innerText = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            grid.appendChild(Object.assign(document.createElement('div'), { className: 'cal-day empty' }));
        }

        const todayStr = formatDateLocal(new Date());

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const cell = document.createElement('div');
            cell.className = 'cal-day fade-in';
            cell.dataset.date = dateStr;

            if (dateStr === todayStr) cell.classList.add('today');

            const num = document.createElement('span');
            num.innerText = day;
            num.className = 'day-number';
            cell.appendChild(num);

            const status = this.getDayStatus(dateStr);

            if (status.myCycle && !status.predicted) cell.classList.add('mine-cycle-real');
            else if (status.myCycle && status.predicted) cell.classList.add('mine-cycle-pred');
            else if (status.myFertile && !status.myCycle) cell.classList.add('mine-fertile');

            if (status.myOvulation && !status.myCycle) cell.classList.add('mine-ovulation');
            if (status.partnerCycle && !status.myCycle) cell.classList.add('partner-cycle');

            let icons = '';
            // El ciclo real reportado en eventos manuales siempre muestra gota solida.
            if (status.myCycle && !status.predicted) icons += '🩸';
            if (status.myCycle && status.predicted) icons += '<span style="opacity:0.6">🕖🩸</span>';
            if (status.myFertile && !status.myCycle) icons += '🌸';
            if (status.myOvulation && !status.myCycle) icons += '🌟';

            const events = this.eventsMap[dateStr] || [];

            if (events.some(e => e.type === 'intimacy')) icons += '❤️';
            if (events.some(e => e.type === 'symptom')) icons += '🤧';
            if (events.some(e => e.type === 'note')) icons += '📝';

            if (icons) {
                const div = document.createElement('div');
                div.className = 'day-indicators';
                div.innerHTML = icons;
                cell.appendChild(div);
            }

            grid.appendChild(cell);
        }
    },

    getDayStatus(dateStr) {
        let status = {
            myCycle: false,
            myFertile: false,
            myOvulation: false,
            partnerCycle: false,
            predicted: false
        };

        // 🔵 MIS PREDICCIONES
        this.cycleData.my_predictions.forEach(p => {
            if (p.date === dateStr) {
                if (p.type === 'period') {
                    status.myCycle = true;
                    status.predicted = true;
                }
                if (p.type === 'fertile') status.myFertile = true;
                if (p.type === 'ovulation') status.myOvulation = true;
            }
        });

        // 🔴 HISTORIAL REAL (Días específicos tocados por la usuaria)
        // Ya no se dibujan 5 días fijos. Solo se mostrarán los marcados por EVENTOS MANUALES (Abajo)
        const lastReal = this.cycleData.my_history[0]; 
        if (lastReal) {
            // El día de inicio de ciclo sí lo marcamos como ciclo base (por si no tiene evento)
            if (dateStr === lastReal.last_period_date) {
                status.myCycle = true;
                status.predicted = false;
            }
        }

        // ❤️ PAREJA
        this.cycleData.partner_predictions.forEach(p => {
            if (p.date === dateStr && p.type === 'period' && !status.myCycle) {
                status.partnerCycle = true;
            }
        });

        // 🔥 OVERRIDE EVENTOS MANUALES ABSOLUTOS
        // REGLA: manual "period" marca el día e ignora predicción.
        if (this.eventsMap[dateStr]?.some(e => e.type === 'period')) {
            status.myCycle = true;
            status.predicted = false;
        }

        return status;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.calendarObj.init();
});