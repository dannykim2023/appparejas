window.timelineObj = {
    async loadData() {
        if(!currentUser) return;
        const container = document.getElementById('timeline-container');
        container.innerHTML = '<p class="text-center subtitle">Cargando memorias...</p>';
        
        try {
            const res = await fetch(`${API_URL}/get-timeline?user_id=${currentUser.id}`);
            const body = await res.json();
            
            if(body.success) {
                this.render(body.data);
            }
        } catch(e) {
            console.error(e);
        }
    },

    render(events) {
        const container = document.getElementById('timeline-container');
        container.innerHTML = '';
        
        if(!events || events.length === 0) {
            container.innerHTML = '<p class="text-center subtitle mt-3">Aún no hay momentos registrados. Toca un día en el calendario.</p>';
            return;
        }

        // Agrupar por Mes
        let currentMonth = '';
        
        events.forEach(ev => {
            const dateObj = new Date(ev.date);
            const monthStr = dateObj.toLocaleString('es', { month: 'long', year: 'numeric' });
            
            if (monthStr !== currentMonth) {
                const mHeader = document.createElement('div');
                mHeader.className = 'timeline-month';
                mHeader.innerText = monthStr;
                container.appendChild(mHeader);
                currentMonth = monthStr;
            }

            const item = document.createElement('div');
            item.className = `timeline-item t-${ev.type} fade-in`;
            
            const content = document.createElement('div');
            content.className = 'timeline-content';
            
            // Labels
            const labels = {
                'period': '🩸 Menstruación',
                'intimacy': '❤️ Intimidad',
                'symptom': '🤧 Síntoma',
                'note': '📝 Nota'
            };
            
            content.innerHTML = `
                <h4>${labels[ev.type] || 'Evento'}</h4>
                <p><strong>${ev.date}</strong> - Registrado por ${ev.user_name || ''}</p>
                ${ev.value ? `<p style="margin-top:5px; font-style:italic;">"${ev.value}"</p>` : ''}
            `;
            
            item.appendChild(content);
            container.appendChild(item);
        });
    }
};
