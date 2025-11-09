import { navigate } from './router.js';
import { handleGoogleLogin, handleRegister, handleLogin, handleLogout } from './auth.js';
import * as App from './app.js';
import { state } from './app.js';
import { auth } from './firebase-config.js';
import { showCampaignModal } from './ui/modalUI.js';
import { openCamera, closeCamera, clearImagePreview, renderImagePreview } from './ui/identifierUI.js';

export function setupEventListeners() {

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const link = target.closest('[data-navigate]');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        if (link) {
            e.preventDefault();
            if (target.closest('.sidebar-links')) {
                 sidebar?.classList.remove('open');
                 overlay?.classList.remove('active');
            }
            if (target.closest('.nav-dropdown-menu')) {
                 target.closest('.nav-dropdown').classList.remove('open');
            }
            const searchModal = document.getElementById('searchModal');
            if (searchModal?.classList.contains('active')) {
                searchModal.classList.remove('active');
            }
            navigate(link.dataset.navigate);
            return;
        }

        if (target.closest('#menu-toggle-button')) {
            sidebar?.classList.add('open');
            overlay?.classList.add('active');
        } else if (target.closest('#close-sidebar-button')) {
            sidebar?.classList.remove('open');
            overlay?.classList.remove('active');
        }
        else if (target.id === 'overlay') {
            sidebar?.classList.remove('open');
            overlay?.classList.remove('active');
        }

        const searchModal = document.getElementById('searchModal');
        if (target.closest('#sidebarSearchBtn')) {
            searchModal?.classList.add('active');
            sidebar?.classList.remove('open');
            overlay?.classList.remove('active');
            setTimeout(() => {
                document.getElementById('quickSearchInput')?.focus();
            }, 100);
        } else if (target.closest('#closeSearchModal')) {
            searchModal?.classList.remove('active');
            document.getElementById('quickSearchInput').value = '';
            document.getElementById('quickSearchResults').innerHTML = '<p class="search-tip">Busca por nombre común o científico. Presiona Enter para ir a la vista Explorar.</p>';
        }

        if (target.closest('#loginLink') || target.closest('#sidebarLoginBtn')) {
            document.getElementById('loginModal')?.classList.add('active');
            sidebar?.classList.remove('open');
            overlay?.classList.remove('active');
        }

        if (target.closest('#closeLoginModal')) document.getElementById('loginModal')?.classList.remove('active');
        if (target.closest('#googleLoginBtn')) handleGoogleLogin();
        if (target.closest('#switchToRegisterLinkSimulated')) {
            document.getElementById('loginModal')?.classList.remove('active');
            document.getElementById('registerModal')?.classList.add('active');
        }
        if (target.closest('#switchToLoginLinkSimulated')) {
            document.getElementById('registerModal')?.classList.remove('active');
            document.getElementById('loginModal')?.classList.add('active');
        }
        if (target.closest('#closeRegisterModal')) document.getElementById('registerModal')?.classList.remove('active');
        if (target.closest('#logoutBtn')) {
             handleLogout();
             sidebar?.classList.remove('open');
             overlay?.classList.remove('active');
        }

        const plantCard = target.closest('.plant-card');
        if (plantCard) {
            const plantKey = plantCard.dataset.plantKey;
            if (target.closest('.plant-card-fav-btn')) App.toggleFavorite(plantKey);
            else navigate(`/planta/${plantKey}`);
        }
        if (target.closest('#favoriteBtn')) App.toggleFavoriteFromDetail();

        const quickResult = target.closest('.quick-search-result-item');
        if (quickResult) {
            searchModal?.classList.remove('active');
            document.getElementById('quickSearchInput').value = '';
            document.getElementById('quickSearchResults').innerHTML = '<p class="search-tip">Busca por nombre común o científico. Presiona Enter para ir a la vista Explorar.</p>';
            navigate(quickResult.dataset.path);
        }

        if (target.closest('#resetFiltersBtn')) App.resetFilters();

        if (target.closest('.js-back-btn')) history.back();

        const campaignCard = target.closest('.campaign-card');
        if (campaignCard) {
            const campaignId = campaignCard.dataset.campaignId;
            const isJoined = state.userCampaigns.includes(campaignId);

            if (isJoined) {
                navigate(`/campana/${campaignId}`);
            } else {
                const campaign = state.campaigns.find(c => c.id === campaignId);
                if (campaign) {
                    showCampaignModal(campaign, false);
                }
            }
        }

        if(target.closest('#closeCampaignModal')) document.getElementById('campaignModal')?.classList.remove('active');

        const forumCard = target.closest('.forum-card');
        if (forumCard) navigate(`/foro/${forumCard.dataset.topicId}`);

        const communityCard = target.closest('.community-card');
        if (communityCard) navigate(`/comunidad/${communityCard.dataset.communityId}`);

        if (target.closest('#uploadBtn')) document.getElementById('uploadInput')?.click();
        if (target.closest('#cameraBtn')) openCamera();
        if(target.closest('#closeCameraModal')) closeCamera();
        if(target.closest('#captureBtn')) {
            const video = document.getElementById('cameraFeed');
            if(video){
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                canvas.toBlob(blob => {
                    if(blob){
                        const file = new File([blob], "camera-shot.jpg", { type: "image/jpeg" });
                        closeCamera(); clearImagePreview(); renderImagePreview(file); App.handleImageIdentification(file);
                    }
                }, 'image/jpeg');
            }
        }
        if (target.closest('#clearPreviewBtn')) clearImagePreview();

        const potwButton = target.closest('#potwButton');
        if (potwButton) {
            const plantKey = potwButton.dataset.plantKey;
            if (plantKey) {
                navigate(`/planta/${plantKey}`);
            }
        }

        const dropdownToggle = target.closest('.nav-dropdown-toggle');
        const openDropdown = document.querySelector('.nav-dropdown.open');
        if (dropdownToggle) {
            const dropdown = dropdownToggle.closest('.nav-dropdown');
            if (openDropdown && openDropdown !== dropdown) {
                openDropdown.classList.remove('open');
            }
            dropdown.classList.toggle('open');
        }
        else if (openDropdown && !target.closest('.nav-dropdown')) {
            openDropdown.classList.remove('open');
        }

    });

    document.body.addEventListener('change', (e) => {
        const target = e.target;
        if (target.matches('#filterUso, #filterRegion, #filterTipo, #filterOrder')) App.handleFilterChange();
        if (target.id === 'uploadInput' && target.files?.length > 0) {
            renderImagePreview(target.files[0]); App.handleImageIdentification(target.files[0]);
        }
        if (target.id === 'themeSelector') App.setTheme(target.value);
        if (target.id === 'animationsToggle') App.toggleAnimations();
    });

    document.body.addEventListener('submit', (e) => {
        e.preventDefault();
        const target = e.target;

        if (target.id === 'loginForm') handleLogin(e);
        if (target.id === 'registerForm') handleRegister(e);

        if (target.id === 'chatInputForm') {
            const input = document.getElementById('chatMessageInput');
            if (!input) return;

            const messageText = input.value.trim();
            if (messageText) {
                const user = auth.currentUser;

                const userName = user ? user.displayName : 'Tú';
                const userId = user ? user.uid : null;

                console.log("Enviando mensaje:", { text: messageText, user: userName, userId: userId });

                const chatContainer = document.getElementById('chatMessagesContainer');
                if (chatContainer) {
                    const newMessage = document.createElement('div');
                    newMessage.className = 'chat-message sent';

                    const userMetaHTML = userId
                        ? `<a href="/usuario/${userId}" class="message-meta" data-navigate="/usuario/${userId}">${userName}</a>`
                        : `<div class="message-meta">${userName}</div>`;

                    newMessage.innerHTML = `
                        <div class="message-content">
                            ${userMetaHTML}
                            <p>${messageText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                        </div>
                        <div class="avatar">${userName.charAt(0)}</div>`;

                    chatContainer.appendChild(newMessage);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
                input.value = '';
            }
        }
    });

    const quickSearchInput = document.getElementById('quickSearchInput');
    if (quickSearchInput) {
        quickSearchInput.addEventListener('input', () => { App.handleQuickSearch(quickSearchInput.value); });
        quickSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && quickSearchInput.value.trim().length > 0) {
                 e.preventDefault();
                 document.getElementById('searchModal').classList.remove('active');
                 navigate(`/explorar?q=${encodeURIComponent(quickSearchInput.value.trim())}`);
            }
        });
    }

    document.body.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const searchModal = document.getElementById('searchModal');
            if (searchModal?.classList.contains('active')) {
                searchModal.classList.remove('active');
                document.getElementById('quickSearchInput').value = '';
                document.getElementById('quickSearchResults').innerHTML = '<p class="search-tip">Busca por nombre común o científico. Presiona Enter para ir a la vista Explorar.</p>';
            }
        }
    });

     const exploreSearchInput = document.getElementById('exploreSearchInput');
     if(exploreSearchInput){
        exploreSearchInput.addEventListener('input', () => { App.handleFilterChange(); });
     }
}