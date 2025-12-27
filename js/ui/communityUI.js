// js/ui/communityUI.js

/**
 * Utilidad básica para evitar ataques XSS al renderizar texto de usuarios
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Renderiza la lista de foros disponibles.
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
                <div class="forum-card-icon">${topic.icon || 'forum'}</div>
                <h3 class="forum-card-title">${escapeHtml(topic.title)}</h3>
            </div>
            <p class="forum-card-description">${escapeHtml(topic.description)}</p>`;
        container.appendChild(card);
    });
}

/**
 * Renderiza la cuadrícula de comunidades.
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
            <img src="${community.banner || '/images/default-banner.jpg'}" alt="${escapeHtml(community.name)}" class="community-card-banner" loading="lazy">
            <div class="community-card-content">
                <h4>${escapeHtml(community.name)}</h4>
                <p>${escapeHtml(community.description)}</p>
            </div>`;
        container.appendChild(card);
    });
}

/**
 * Renderiza las tarjetas de las campañas de forma dinámica.
 */
export function renderCampaignCards(campaignsData, userCampaigns = []) {
    const grid = document.getElementById('campaignGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (campaignsData.length === 0) {
        grid.innerHTML = '<p class="empty-state">No hay campañas activas en este momento.</p>';
        return;
    }

    campaignsData.forEach(campaign => {
        const isJoined = userCampaigns.includes(campaign.id);
        const card = document.createElement('div');
        card.className = 'campaign-card';
        card.dataset.campaignId = campaign.id;
        
        // Cortar descripción larga
        const shortDesc = campaign.long_desc ? campaign.long_desc.substring(0, 100) + '...' : 'Sin descripción';

        card.innerHTML = `
            <span class="material-symbols-outlined campaign-icon">${campaign.icon || 'volunteer_activism'}</span>
            <h4>${escapeHtml(campaign.title)}</h4>
            <p>${escapeHtml(shortDesc)}</p>
            <button class="button-primary ${isJoined ? 'joined' : ''}" ${isJoined ? 'disabled' : ''}>
                ${isJoined ? 'Participando' : 'Saber Más'}
            </button>`;
        grid.appendChild(card);
    });
}

/**
 * Renderiza la vista de chat (Foros).
 */
export function renderForumTopicView(topic, messages = [], targetElementId = 'chatViewContainer') {
    const section = document.getElementById(targetElementId);
    if (!section) return;

    const messagesHTML = messages.map(msg => {
        const safeUser = escapeHtml(msg.user);
        const safeText = escapeHtml(msg.text);
        
        const userMetaHTML = msg.userId
            ? `<a href="/usuario/${msg.userId}" class="message-meta" data-navigate="/usuario/${msg.userId}">${safeUser}</a>`
            : `<div class="message-meta">${safeUser}</div>`;

        return `
        <div class="chat-message ${msg.type || 'user'}">
            <div class="avatar">${safeUser.charAt(0)}</div>
            <div class="message-content">
                ${userMetaHTML}
                <p>${safeText}</p>
            </div>
        </div>`;
    }).join('');

    section.innerHTML = `
        <div class="chat-header">
            <button class="button-secondary js-back-btn">&larr; Volver</button>
            <div class="chat-header-info">
                <h2>${escapeHtml(topic.title)}</h2>
                <span>${escapeHtml(topic.description)}</span>
            </div>
        </div>
        <div class="chat-messages" id="chatMessagesContainer">
            ${messagesHTML}
        </div>
        <div class="chat-input-container">
            <form class="chat-input-form" id="chatInputForm">
                <input type="text" placeholder="Escribe tu mensaje..." id="chatMessageInput" autocomplete="off" required>
                <button type="submit" class="chat-send-btn" aria-label="Enviar">
                    <span class="material-symbols-outlined">send</span>
                </button>
            </form>
        </div>`;

    scrollToBottom('chatMessagesContainer');
}

/**
 * Renderiza la vista de comunidad (Canales).
 */
export function renderCommunityView(community, channelsData = {}, targetElementId = 'chatViewContainer') {
    const section = document.getElementById(targetElementId);
    if (!section) return;

    const generalMessages = channelsData.general || [];
    
    // Reutilizamos lógica de mapeo de mensajes
    const messagesHTML = generalMessages.map(msg => {
        const safeUser = escapeHtml(msg.user);
        const safeText = escapeHtml(msg.text);
        const userMetaHTML = msg.userId
            ? `<a href="/usuario/${msg.userId}" class="message-meta" data-navigate="/usuario/${msg.userId}">${safeUser}</a>`
            : `<div class="message-meta">${safeUser}</div>`;

        return `
        <div class="chat-message ${msg.type || 'user'}">
            <div class="avatar">${safeUser.charAt(0)}</div>
            <div class="message-content">
                ${userMetaHTML}
                <p>${safeText}</p>
            </div>
        </div>`;
    }).join('');

    section.innerHTML = `
        <div class="community-layout">
            <div class="community-sidebar">
                <h3>${escapeHtml(community.name)}</h3>
                <h4>Canales</h4>
                <ul class="channel-list">
                    <li class="active"># general</li>
                    <li class="disabled"># fotos (pronto)</li>
                </ul>
            </div>
            <div class="community-main-content">
                 <div class="chat-view-container">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <h2># general</h2>
                            <span>Canal principal</span>
                        </div>
                    </div>
                    <div class="chat-messages" id="chatMessagesContainer">
                        ${messagesHTML}
                    </div>
                     <div class="chat-input-container">
                        <form class="chat-input-form" id="chatInputForm">
                            <input type="text" placeholder="Conversa con la comunidad..." id="chatMessageInput" autocomplete="off" required>
                            <button type="submit" class="chat-send-btn" aria-label="Enviar">
                                <span class="material-symbols-outlined">send</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;

    scrollToBottom('chatMessagesContainer');
}

/**
 * Renderiza el detalle de una campaña (Progreso, stats).
 */
export function renderCampaignDetailView(campaign) {
    // Referencias seguras
    const elements = {
        icon: document.getElementById('campaignDetailIcon'),
        title: document.getElementById('campaignDetailTitle'),
        desc: document.getElementById('campaignDetailDescription'),
        stats: document.getElementById('campaignDetailStats'),
        progress: document.getElementById('campaignDetailProgress')
    };

    if(elements.icon) elements.icon.textContent = campaign.icon || 'emoji_nature';
    if(elements.title) elements.title.textContent = campaign.title || 'Campaña';
    if(elements.desc) elements.desc.textContent = campaign.long_desc || '';

    const current = campaign.current || 0;
    const goal = campaign.goal || 1; // Evitar división por cero
    const percent = Math.min(100, Math.round((current / goal) * 100));
    
    const paises = campaign.paises_llegados || 0;
    const instituciones = campaign.instituciones_llegadas || 0;

    if (elements.stats) {
        elements.stats.innerHTML = `
            <div class="stat-item">
                <span class="material-symbols-outlined">public</span>
                <span>${paises} ${paises === 1 ? 'País' : 'Países'}</span>
            </div>
            <div class="stat-item">
                <span class="material-symbols-outlined">school</span>
                <span>${instituciones} ${instituciones === 1 ? 'Institución' : 'Instituciones'}</span>
            </div>
        `;
    }

    if (elements.progress) {
        elements.progress.innerHTML = `
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${percent}%;"></div>
            </div>
            <p><strong>${current.toLocaleString()} / ${goal.toLocaleString()}</strong> ${campaign.unit || ''} (${percent}%)</p>
        `;
    }
}

// Helper para scroll
function scrollToBottom(containerId) {
    const container = document.getElementById(containerId);
    if(container) {
        container.scrollTop = container.scrollHeight;
    }
}