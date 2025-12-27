import { setupEventListeners } from './events.js';
import { handleRouting, navigate } from './router.js';
import { updateAuthUI, requireAuth } from './auth.js';
import { fetchAllData } from './data.js';
import { renderPlantGrid, updateFavoriteButtonVisual, renderPlantOfTheWeek, renderQuickSearchResults, populateFilterOptions } from './ui/plantUI.js';
import { renderCampaignCards } from './ui/communityUI.js';
import { showIdentifierLoading, renderIdentificationResults } from './ui/identifierUI.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { COLLECTIONS } from './constants.js';
import { awardBadge, createUserProfileDocument, updateUserFavorites, updateUserCampaigns } from './profile.js';
import { identifyWithInaturalist } from './plant-identifier.js';

export let state = {
    allPlants: {},
    favorites: [],
    currentPlantKey: null,
    forums: [],
    communities: [],
    campaigns: [],
    userCampaigns: [],
    chatData: {},
    plantOfTheWeekKey: null,
    currentImageFile: null,
    isInitialRouteDone: false,
};

export async function handleUserCreation(user) {
    await createUserProfileDocument(user, user.displayName);
}

export function setTheme(themeName) {
    document.body.classList.remove('theme-light-gray', 'theme-dark', 'theme-colorful');
    if (themeName !== 'light') {
        document.body.classList.add(`theme-${themeName}`);
    }
    localStorage.setItem('theme', themeName);
}

export function toggleAnimations() {
    const isDisabled = document.getElementById('animationsToggle').checked;
    document.body.classList.toggle('no-transitions', isDisabled);
    localStorage.setItem('animationsDisabled', isDisabled ? 'true' : 'false');
}

export function joinCampaign(campaignId) {
    if (!requireAuth("Debes iniciar sesión para unirte a una campaña.")) {
        return;
    }

    import('./ui/modalUI.js').then(modal => {
        if (state.userCampaigns.includes(campaignId)) {
            modal.showToast("¡Ya estás participando en esta campaña!", 'success');
            return;
        }

        const isFirstCampaign = state.userCampaigns.length === 0;

        state.userCampaigns.push(campaignId);
        updateUserCampaigns(campaignId);

        const campaign = state.campaigns.find(c => c.id === campaignId);
        modal.showToast(`¡Te has unido a la campaña "${campaign.title}"!`, 'success');

        document.getElementById('campaignModal').classList.remove('active');
        renderCampaignCards(state.campaigns, state.userCampaigns);

        if (isFirstCampaign) {
            awardBadge('pionero_campana');
        }
    });
}

export function handlePlantOfTheWeek() {
    if (!state.allPlants || Object.keys(state.allPlants).length === 0) return;
    const lastCheck = localStorage.getItem('potw_date');
    const savedPlantKey = localStorage.getItem('potw_key');
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (!lastCheck || !savedPlantKey || (new Date() - new Date(lastCheck)) > oneWeek) {
        const plantKeys = Object.keys(state.allPlants);
        const randomKey = plantKeys[Math.floor(Math.random() * plantKeys.length)];
        state.plantOfTheWeekKey = randomKey;
        localStorage.setItem('potw_key', randomKey);
        localStorage.setItem('potw_date', new Date().toISOString());
    } else {
        state.plantOfTheWeekKey = savedPlantKey;
    }

    const plant = state.allPlants[state.plantOfTheWeekKey];
    if (plant) {
        renderPlantOfTheWeek(plant, state.plantOfTheWeekKey);
    }
}

export function toggleFavorite(plantKey) {
    if (!requireAuth("Debes iniciar sesión para guardar favoritos.")) {
        return;
    }

    if (!plantKey) return;
    const index = state.favorites.indexOf(plantKey);
    let isAdding = false;

    import('./ui/modalUI.js').then(modal => {
        if (index > -1) {
            state.favorites.splice(index, 1);
            modal.showToast('Eliminado de favoritos');
            isAdding = false;
        } else {
            state.favorites.push(plantKey);
            modal.showToast('Añadido a favoritos');
            isAdding = true;
        }

        updateUserFavorites(plantKey, isAdding);
    });

    handleFilterChange();
}

export function toggleFavoriteFromDetail() {
    if (state.currentPlantKey) {
        toggleFavorite(state.currentPlantKey);
        updateFavoriteButtonVisual(state.favorites.includes(state.currentPlantKey));
    }
}

export function handleQuickSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (term.length < 2) {
        document.getElementById('quickSearchResults').innerHTML = '<p class="search-tip">Busca por nombre común o científico. Presiona Enter para ir a la vista Explorar.</p>';
        return;
    }

    const maxResults = 5;
    const results = [];
    const allPlants = state.allPlants || {};

    for (const key in allPlants) {
        const plant = allPlants[key];
        const safeName = (plant.name || "").toLowerCase();
        const safeScientific = (plant.scientificName || "").toLowerCase();

        if (safeName.includes(term) || safeScientific.includes(term)) {
            results.push({
                type: 'Planta',
                name: plant.name || "Sin Nombre",
                key: key,
                path: `/planta/${key}`
            });
            if (results.length >= maxResults) break;
        }
    }

    const allTopics = [
        ...(state.forums || []).map(f => ({ ...f, type: 'Foro', path: `/foro/${f.id}` })),
        ...(state.communities || []).map(c => ({ ...c, type: 'Comunidad', name: c.name, path: `/comunidad/${c.id}` }))
    ];

    if (results.length < maxResults) {
        for (const item of allTopics) {
             const safeName = (item.name || "").toLowerCase();
             const safeTitle = (item.title || "").toLowerCase();
             const safeDesc = (item.description || "").toLowerCase();
             
             if (safeName.includes(term) || safeTitle.includes(term) || safeDesc.includes(term)) {
                 results.push(item);
                 if (results.length >= maxResults) break;
             }
        }
    }

    renderQuickSearchResults(results);
}

export function handleFilterChange() {
    const searchInput = document.getElementById('exploreSearchInput');
    const filterOrderInput = document.getElementById('filterOrder');
    if (!searchInput || !filterOrderInput) return;
    if (!state.allPlants) return;

    const searchTerm = searchInput.value.toLowerCase();
    const usoFilter = document.getElementById('filterUso').value;
    const regionFilter = document.getElementById('filterRegion').value;
    const tipoFilter = document.getElementById('filterTipo').value;
    const orderValue = filterOrderInput.value;

    let filteredKeys = Object.keys(state.allPlants).filter(key => {
        const plant = state.allPlants[key];
        if (!plant) return false;

        const safeName = (plant.name || "").toLowerCase();
        const nameMatch = safeName.includes(searchTerm);
        
        const usoMatch = usoFilter === 'todos' || (plant.uso && plant.uso.includes(usoFilter));
        const regionMatch = regionFilter === 'todos' || (plant.region && plant.region.includes(regionFilter));
        const tipoMatch = tipoFilter === 'todos' || plant.tipo === tipoFilter;
        
        return nameMatch && usoMatch && regionMatch && tipoMatch;
    });

    filteredKeys.sort((keyA, keyB) => {
        const plantA = state.allPlants[keyA];
        const plantB = state.allPlants[keyB];

        const nameA = (plantA.name || "").toLowerCase();
        const nameB = (plantB.name || "").toLowerCase();

        if (orderValue === 'name_asc') {
            return nameA.localeCompare(nameB);
        } else if (orderValue === 'name_desc') {
            return nameB.localeCompare(nameA);
        } else if (orderValue === 'popularidad') {
            const countA = state.favorites.filter(favKey => favKey === keyA).length;
            const countB = state.favorites.filter(favKey => favKey === keyA).length;
            if (countB !== countA) {
                return countB - countA;
            }
            return nameA.localeCompare(nameB); 
        }
        return 0;
    });

    renderPlantGrid(filteredKeys, state.allPlants, state.favorites);
}

export function resetFilters() {
    const searchInput = document.getElementById('exploreSearchInput');
    if(searchInput) searchInput.value = '';
    
    const fUso = document.getElementById('filterUso');
    if(fUso) fUso.value = 'todos';

    const fRegion = document.getElementById('filterRegion');
    if(fRegion) fRegion.value = 'todos';

    const fTipo = document.getElementById('filterTipo');
    if(fTipo) fTipo.value = 'todos';

    const fOrder = document.getElementById('filterOrder');
    if(fOrder) fOrder.value = 'name_asc';
    
    handleFilterChange();
}

export async function handleImageIdentification(file) {
    if (!file) return;
    state.currentImageFile = file;
    showIdentifierLoading();

    try {
        const results = await identifyWithInaturalist(file);
        renderIdentificationResults(results, 'inaturalist');
    } catch (error) {
        console.error(error);
        import('./ui/modalUI.js').then(modal => modal.showToast(`Error de identificación: ${error.message}`, "error"));
        renderIdentificationResults([], 'error');
    }
}

async function init() {
    const data = await fetchAllData();
    state.allPlants = data.allPlants || {}; 
    state.forums = data.forums || [];
    state.communities = data.communities || [];
    state.campaigns = data.campaigns || [];
    state.chatData = data.chatData || {};

    populateFilterOptions(state.allPlants);

    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector) themeSelector.value = savedTheme;

    const animationsDisabled = localStorage.getItem('animationsDisabled');
    if (animationsDisabled === 'true') {
        const animationsToggle = document.getElementById('animationsToggle');
        if (animationsToggle) animationsToggle.checked = true;
        document.body.classList.add('no-transitions');
    }

    setupEventListeners();

    window.addEventListener('routechange', () => handleRouting(state));
    window.addEventListener('popstate', () => handleRouting(state));

    onAuthStateChanged(auth, async (user) => {
        let profileData = null;
        if (user) {
            try {
                const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    profileData = docSnap.data();
                    state.favorites = profileData.favorites || [];
                    state.userCampaigns = profileData.userCampaigns || [];
                }
            } catch (error) {
                console.error(error);
                state.favorites = [];
                state.userCampaigns = [];
            }
        } else {
            state.favorites = [];
            state.userCampaigns = [];
        }

        updateAuthUI(user, profileData);

        if (state.isInitialRouteDone) {
            handleRouting(state);
        }
    });

    handleRouting(state);
    state.isInitialRouteDone = true; 

    const loader = document.getElementById('loader');
    const mainContainerWrapper = document.querySelector('.main-container-wrapper');
    if (loader) {
        loader.style.opacity = '0';
        loader.addEventListener('transitionend', () => {
            loader.style.display = 'none';
            if(mainContainerWrapper) mainContainerWrapper.style.visibility = 'visible';
        }, { once: true });
    } else if (mainContainerWrapper) {
        mainContainerWrapper.style.visibility = 'visible';
    }
}

document.addEventListener('DOMContentLoaded', init);