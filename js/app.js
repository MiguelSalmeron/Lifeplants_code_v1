import { setupEventListeners } from './events.js';
import { handleRouting, navigate } from './router.js';
import { updateAuthUI, requireAuth } from './auth.js';
import { fetchInitialData, fetchPlants } from './data.js'; // IMPORTAMOS LAS NUEVAS FUNCIONES
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
    // Datos cargados
    displayedPlants: {}, // Plantas visibles actualmente
    favorites: [],
    forums: [],
    communities: [],
    campaigns: [],
    userCampaigns: [],
    chatData: {},
    
    // Estado de UI y Navegación
    currentPlantKey: null,
    plantOfTheWeekKey: null,
    currentImageFile: null,
    isInitialRouteDone: false,

    // Estado de Paginación y Filtros
    lastVisible: null,   // Cursor para saber dónde nos quedamos
    hasMore: true,       // ¿Hay más plantas para cargar?
    isLoading: false,    // Evitar doble carga
    currentFilters: {    // Filtros activos para enviarlos al servidor
        search: '',
        uso: 'todos',
        region: 'todos',
        tipo: 'todos'
    }
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

// --- LOGICA DE CARGA DE PLANTAS (PAGINACIÓN) ---

export async function loadPlants(reset = false) {
    if (state.isLoading) return;
    if (!reset && !state.hasMore) return; // Si no es reset y no hay más, no hacemos nada

    state.isLoading = true;
    
    // Mostrar spinner si existe en la UI (opcional)
    const loader = document.getElementById('plantsLoader');
    if (loader) loader.style.display = 'block';

    if (reset) {
        state.lastVisible = null;
        state.displayedPlants = {};
        // La limpieza visual del grid la manejará renderPlantGrid con el flag 'reset'
    }

    try {
        const result = await fetchPlants({
            lastVisible: state.lastVisible,
            pageSize: 10, // Cargar de 10 en 10
            filters: state.currentFilters
        });

        // Actualizar estado
        state.lastVisible = result.lastVisible;
        state.hasMore = result.hasMore;
        
        // Acumular plantas nuevas
        state.displayedPlants = { ...state.displayedPlants, ...result.plants };

        // Renderizar (Pasamos las nuevas plantas y flags importantes)
        // NOTA: renderPlantGrid se actualizará en el siguiente paso para manejar 'reset' y 'append'
        renderPlantGrid(
            Object.keys(result.plants), // Solo pasamos las claves de las NUEVAS plantas para append
            state.displayedPlants,      // Pasamos el mapa completo para referencias
            state.favorites, 
            'plantGridContainer',
            reset // Nuevo parámetro para saber si limpiar el contenedor
        );

    } catch (error) {
        console.error("Error loading plants:", error);
    } finally {
        state.isLoading = false;
        if (loader) loader.style.display = 'none';
        
        // Gestionar botón "Cargar más"
        const loadMoreBtn = document.getElementById('loadMorePlantsBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = state.hasMore ? 'block' : 'none';
        }
    }
}

export function handleLoadMore() {
    loadPlants(false); // Cargar siguiente página
}

// --- FIN LOGICA PAGINACIÓN ---

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

// Plant of the Week ahora requiere cargar una planta específica si no está en la lista parcial
export async function handlePlantOfTheWeek() {
    // Simplificación: Por ahora mostramos una aleatoria de las que tengamos o estática.
    // Para hacerlo robusto con paginación, idealmente se pediría al servidor "dame la planta destacada".
    // Aquí usamos una lógica simple con lo que hay disponible.
    const keys = Object.keys(state.displayedPlants);
    if (keys.length > 0) {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        state.plantOfTheWeekKey = randomKey;
        renderPlantOfTheWeek(state.displayedPlants[randomKey], randomKey);
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

    // Actualizar visualmente sin recargar todo
    // Nota: handleFilterChange ya no es necesario aquí para refrescar grid completo
    updateFavoriteButtonVisual(state.favorites.includes(plantKey));
    // Re-renderizar favoritos si estamos en esa vista
    if(window.location.pathname.includes('/favoritos')) {
        // Lógica específica de favoritos (pendiente de refactorizar si es necesario)
    }
}

export function toggleFavoriteFromDetail() {
    if (state.currentPlantKey) {
        toggleFavorite(state.currentPlantKey);
        updateFavoriteButtonVisual(state.favorites.includes(state.currentPlantKey));
    }
}

// Búsqueda Rápida (Modal) - Ahora busca en servidor
export async function handleQuickSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (term.length < 2) {
        document.getElementById('quickSearchResults').innerHTML = '<p class="search-tip">Escribe al menos 2 letras.</p>';
        return;
    }

    // Usamos fetchPlants con un límite pequeño para búsqueda rápida
    const results = [];
    
    // 1. Buscar Plantas (Servidor)
    const plantData = await fetchPlants({ 
        filters: { search: term }, 
        pageSize: 5 
    });
    
    Object.values(plantData.plants).forEach(plant => {
        results.push({
            type: 'Planta',
            name: plant.name,
            path: `/planta/${plant.id}`
        });
    });

    // 2. Buscar en Foros/Comunidades (Local, ya que son pocos)
    const allTopics = [
        ...(state.forums || []).map(f => ({ ...f, type: 'Foro', path: `/foro/${f.id}` })),
        ...(state.communities || []).map(c => ({ ...c, type: 'Comunidad', name: c.name, path: `/comunidad/${c.id}` }))
    ];

    for (const item of allTopics) {
         const safeName = (item.name || "").toLowerCase();
         const safeTitle = (item.title || "").toLowerCase();
         if (safeName.includes(term) || safeTitle.includes(term)) {
             results.push(item);
             if (results.length >= 5) break; 
         }
    }

    renderQuickSearchResults(results);
}

// Filtros Principales (Grid)
export function handleFilterChange() {
    const searchInput = document.getElementById('exploreSearchInput');
    
    // Actualizar estado de filtros
    if (searchInput) state.currentFilters.search = searchInput.value.toLowerCase().trim();
    
    const fUso = document.getElementById('filterUso');
    if (fUso) state.currentFilters.uso = fUso.value;

    const fRegion = document.getElementById('filterRegion');
    if (fRegion) state.currentFilters.region = fRegion.value;

    const fTipo = document.getElementById('filterTipo');
    if (fTipo) state.currentFilters.tipo = fTipo.value;

    // Recargar desde cero con los nuevos filtros
    loadPlants(true);
}

export function resetFilters() {
    const searchInput = document.getElementById('exploreSearchInput');
    if(searchInput) searchInput.value = '';
    
    const elements = ['filterUso', 'filterRegion', 'filterTipo'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = 'todos';
    });

    // Resetear estado
    state.currentFilters = {
        search: '',
        uso: 'todos',
        region: 'todos',
        tipo: 'todos'
    };
    
    loadPlants(true);
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
    // 1. Cargar datos base (Ligeros)
    const data = await fetchInitialData();
    state.forums = data.forums || [];
    state.communities = data.communities || [];
    state.campaigns = data.campaigns || [];
    state.chatData = data.chatData || {};

    // 2. Configuración UI
    // Nota: populateFilterOptions antes usaba allPlants. Ahora debería ser estático o basado en stats, 
    // pero por simplicidad lo dejaremos pendiente o manual.
    // populateFilterOptions(state.allPlants); 

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

    // 3. Autenticación
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

    // 4. Carga Inicial de Plantas (Primera página)
    await loadPlants(true);

    handleRouting(state);
    state.isInitialRouteDone = true; 

    // Ocultar Loader Global
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