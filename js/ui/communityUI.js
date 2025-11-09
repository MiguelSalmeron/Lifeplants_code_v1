// js/ui/communityUI.js

/**
 * Renderiza la lista de foros disponibles.
 * @param {object[]} forumsData - Los datos de los foros.
 */
export function renderForums(forumsData) {
    const container = document.getElementById('forumList');
    if (!container) return;
    container.innerHTML = '';
    forumsData.forEach(topic => {
        const card = document.createElement('div');
        card.className = 'forum-card';
        card.dataset.topicId = topic.id;
        card.innerHTML = `
            <div class="forum-card-header">
                <div class="forum-card-icon">${topic.icon}</div>
                <h3 class="forum-card-title">${topic.title}</h3>
            </div>
            <p class="forum-card-description">${topic.description}</p>`;
        container.appendChild(card);
    });
}

/**
 * Renderiza la cuadrícula de comunidades.
 * @param {object[]} communitiesData - Los datos de las comunidades.
 */
export function renderCommunities(communitiesData) {
    const container = document.getElementById('communityGrid');
    if (!container) return;
    container.innerHTML = '';
    communitiesData.forEach(community => {
        const card = document.createElement('div');
        card.className = 'community-card';
        card.dataset.communityId = community.id;
        card.innerHTML = `
            <img src="${community.banner}" alt="${community.name}" class="community-card-banner">
            <div class="community-card-content">
                <h4>${community.name}</h4>
                <p>${community.description}</p>
            </div>`;
        container.appendChild(card);
    });
}

/**
 * Renderiza las tarjetas de las campañas.
 * @param {object[]} campaignsData - Los datos de las campañas.
 * @param {string[]} userCampaigns - Un array con los IDs de las campañas a las que el usuario se ha unido.
 */
export function renderCampaignCards(campaignsData, userCampaigns = []) {
    const grid = document.getElementById('campaignGrid');
    if (!grid) return;
    grid.innerHTML = '';
    campaignsData.forEach(campaign => {
        const isJoined = userCampaigns.includes(campaign.id);
        const card = document.createElement('div');
        card.className = 'campaign-card';
        card.dataset.campaignId = campaign.id;
        card.innerHTML = `
            <span class="material-symbols-outlined campaign-icon">${campaign.icon}</span>
            <h4>${campaign.title}</h4>
            <p>${campaign.long_desc.substring(0, 100)}...</p>
            <button class="button-primary ${isJoined ? 'joined' : ''}" ${isJoined ? 'disabled' : ''}>
                ${isJoined ? 'Participando' : 'Saber Más'}
            </button>`;
        grid.appendChild(card);
    });
}

/**
 * Renderiza la vista de un tema específico del foro (la vista de chat).
 * @param {object} topic - El objeto del tema del foro.
 * @param {object[]} messages - Un array de mensajes para mostrar.
 * @param {string} targetElementId - El ID del elemento donde se renderizará el chat.
 */
export function renderForumTopicView(topic, messages = [], targetElementId = 'chatViewContainer') {
    const section = document.getElementById(targetElementId);
    if (!section) {
        console.error(`Error: No se encontró el elemento con ID '${targetElementId}' para renderizar el chat del foro.`);
        return;
    }

    const messagesHTML = messages.map(msg => {
        // CORREGIDO: Comprueba si el mensaje tiene un userId para crear un enlace.
        const userMetaHTML = msg.userId
            ? `<a href="/usuario/${msg.userId}" class="message-meta" data-navigate="/usuario/${msg.userId}">${msg.user}</a>`
            : `<div class="message-meta">${msg.user}</div>`;

        return `
        <div class="chat-message ${msg.type}">
            <div class="avatar">${msg.user.charAt(0)}</div>
            <div class="message-content">
                ${userMetaHTML}
                <p>${msg.text}</p>
            </div>
        </div>`;
    }).join('');

    section.innerHTML = `
        <div class="chat-header">
            <button class="button-secondary js-back-btn">&larr; Volver a Foros</button>
            <div class="chat-header-info">
                <h2>${topic.title}</h2>
                <span>${topic.description}</span>
            </div>
        </div>
        <div class="chat-messages" id="chatMessagesContainer">
            ${messagesHTML}
        </div>
        <div class="chat-input-container">
            <form class="chat-input-form" id="chatInputForm">
                <input type="text" placeholder="Escribe tu mensaje..." id="chatMessageInput" autocomplete="off" required>
                <button type="submit" class="chat-send-btn" aria-label="Enviar mensaje">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </form>
        </div>`;

    const chatContainer = document.getElementById('chatMessagesContainer');
    if(chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

/**
 * Renderiza la vista de una comunidad específica (la vista de canales y chat).
 * @param {object} community - El objeto de la comunidad.
 * @param {object} channelsData - Los datos de los canales y sus mensajes.
 * @param {string} targetElementId - El ID del elemento donde se renderizará la vista.
 */
export function renderCommunityView(community, channelsData = {}, targetElementId = 'chatViewContainer') {
    const section = document.getElementById(targetElementId);
     if (!section) {
        console.error(`Error: No se encontró el elemento con ID '${targetElementId}' para renderizar el chat de la comunidad.`);
        return;
    }

    const generalMessages = channelsData.general || [];
    const messagesHTML = generalMessages.map(msg => {
        // CORREGIDO: Comprueba si el mensaje tiene un userId para crear un enlace.
        const userMetaHTML = msg.userId
            ? `<a href="/usuario/${msg.userId}" class="message-meta" data-navigate="/usuario/${msg.userId}">${msg.user}</a>`
            : `<div class="message-meta">${msg.user}</div>`;

        return `
        <div class="chat-message ${msg.type}">
            <div class="avatar">${msg.user.charAt(0)}</div>
            <div class="message-content">
                ${userMetaHTML}
                <p>${msg.text}</p>
            </div>
        </div>`;
    }).join('');

    section.innerHTML = `
        <div class="community-layout">
            <div class="community-sidebar">
                <h3>${community.name}</h3>
                <h4>Canales</h4>
                <ul class="channel-list">
                    <li class="active"># general</li>
                    <li># fotos (próximamente)</li>
                </ul>
            </div>
            <div class="community-main-content">
                 <div class="chat-view-container">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <h2># general</h2>
                            <span>Canal principal de la comunidad</span>
                        </div>
                    </div>
                    <div class="chat-messages" id="chatMessagesContainer">
                        ${messagesHTML}
                    </div>
                     <div class="chat-input-container">
                        <form class="chat-input-form" id="chatInputForm">
                            <input type="text" placeholder="Escribe tu mensaje..." id="chatMessageInput" autocomplete="off" required>
                            <button type="submit" class="chat-send-btn" aria-label="Enviar mensaje">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;

    const chatContainer = document.getElementById('chatMessagesContainer');
    if(chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

/**
 * Renderiza la vista de detalle para una campaña específica.
 * @param {object} campaign - El objeto de la campaña a mostrar.
 */
export function renderCampaignDetailView(campaign) {
    const iconEl = document.getElementById('campaignDetailIcon');
    const titleEl = document.getElementById('campaignDetailTitle');
    const descEl = document.getElementById('campaignDetailDescription');

    if(iconEl) iconEl.textContent = campaign.icon || 'emoji_nature';
    if(titleEl) titleEl.textContent = campaign.title;
    if(descEl) descEl.textContent = campaign.long_desc;

    const statsEl = document.getElementById('campaignDetailStats');
    const progressEl = document.getElementById('campaignDetailProgress');

    const progress = campaign.goal > 0 ? (campaign.current / campaign.goal) * 100 : 0;
    const paises = campaign.paises_llegados || 0;
    const instituciones = campaign.instituciones_llegadas || 0;

    if (statsEl) {
        statsEl.innerHTML = `
            <div class="stat-item">
                <span class="material-symbols-outlined">public</span>
                <span>${paises.toLocaleString()} ${paises === 1 ? 'País Alcanzado' : 'Países Alcanzados'}</span>
            </div>
            <div class="stat-item">
                <span class="material-symbols-outlined">school</span>
                <span>${instituciones.toLocaleString()} ${instituciones === 1 ? 'Institución Involucrada' : 'Instituciones Involucradas'}</span>
            </div>
        `;
    }

    if (progressEl) {
        progressEl.innerHTML = `
            <div class="progress-bar"><div class="progress-bar-fill" style="width: ${progress}%;"></div></div>
            <p><strong>${campaign.current?.toLocaleString() || 0} / ${campaign.goal?.toLocaleString() || 0}</strong> ${campaign.unit || ''}</p>
        `;
    }
}