// js/ui/modalUI.js

// Importación para lógica de unirse a campaña (necesaria para el botón)
// Nota: Se hace importación dinámica abajo para evitar dependencia circular
// import { joinCampaign } from '../app.js'; 

/**
 * Muestra el modal con la información detallada de una campaña.
 * @param {object} campaign - El objeto de la campaña a mostrar.
 * @param {boolean} isJoined - Si el usuario ya se ha unido a la campaña.
 */
export function showCampaignModal(campaign, isJoined) {
    const modal = document.getElementById('campaignModal');
    const content = document.getElementById('campaignModalContent');

    if (!content || !campaign) return; 

    // Cálculo de progreso y obtención de nuevos campos (con valor por defecto 0)
    const progress = campaign.goal > 0 ? (campaign.current / campaign.goal) * 100 : 0;
    const paises = campaign.paises_llegados || 0;
    const instituciones = campaign.instituciones_llegadas || 0;

    content.innerHTML = `
        <span class="material-symbols-outlined campaign-modal-icon">${campaign.icon || 'emoji_nature'}</span>
        <h2 class="campaign-modal-title">${campaign.title || 'Campaña Desconocida'}</h2>
        <p>${campaign.long_desc || 'Descripción no disponible.'}</p>

        <div class="campaign-stats">
            <div class="stat-item">
                <span class="material-symbols-outlined">public</span>
                <span>${paises.toLocaleString()} ${paises === 1 ? 'País Alcanzado' : 'Países Alcanzados'}</span>
            </div>
            <div class="stat-item">
                <span class="material-symbols-outlined">school</span>
                <span>${instituciones.toLocaleString()} ${instituciones === 1 ? 'Institución Involucrada' : 'Instituciones Involucradas'}</span>
            </div>
        </div>
        <div class="campaign-progress">
            <div class="progress-bar"><div class="progress-bar-fill" style="width: ${progress}%;"></div></div>
            <p><strong>${campaign.current?.toLocaleString() || 0} / ${campaign.goal?.toLocaleString() || 0}</strong> ${campaign.unit || ''}</p>
        </div>
        <button id="joinCampaignBtn" class="button-primary large ${isJoined ? 'joined' : ''}" ${isJoined ? 'disabled' : ''}>
            ${isJoined ? '¡Gracias por participar!' : 'Unirme a la Campaña'}
        </button>`;

    modal.classList.add('active');

    // Configuración del botón "Unirme a la Campaña"
    const joinBtn = document.getElementById('joinCampaignBtn');
    if (joinBtn && !isJoined) {
        // Clonamos el nodo para limpiar cualquier listener previo
        const newJoinBtn = joinBtn.cloneNode(true);
        joinBtn.replaceWith(newJoinBtn);

        // Añadimos el nuevo listener
        newJoinBtn.addEventListener('click', () => {
            // Importación dinámica para evitar dependencias circulares y llamar a la lógica de app.js
            import('../app.js').then(app => app.joinCampaign(campaign.id));
        }, { once: true }); 
    }
}

/**
 * Función para cerrar todos los modales.
 */
export function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.classList.remove('modal-open'); 
}


// --- MODIFICACIÓN AQUÍ ---
// Esta es la versión robusta de showToast() que estaba en app.js
/**
 * Función para mostrar un mensaje tipo toast.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - El tipo de mensaje ('success', 'error', 'info').
 */
export function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Pequeña corrección para asegurar que la animación de entrada funcione
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hiding'); // Usamos una clase intermedia
        // Esperamos a que la animación de salida termine para remover el elemento
        toast.addEventListener('animationend', () => toast.remove());
    }, 5000);
}
// --- FIN DE MODIFICACIÓN ---