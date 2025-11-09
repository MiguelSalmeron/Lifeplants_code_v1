import { auth, db } from './firebase-config.js';
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";
import { COLLECTIONS } from './constants.js';
import * as PlantUI from './ui/plantUI.js';
import * as CommunityUI from './ui/communityUI.js';
import { displayPublicProfileInfo, initProfilePage, initEditProfilePage, initOnboardingPage } from './profile.js';
import * as App from './app.js';

const viewCache = new Map();

async function loadView(viewName) {
    if (viewCache.has(viewName)) {
        return viewCache.get(viewName);
    }
    try {
        const response = await fetch(`/views/${viewName}.html`);
        if (!response.ok) throw new Error(`No se pudo cargar la vista: ${viewName}`);
        const html = await response.text();
        viewCache.set(viewName, html);
        return html;
    } catch (error) {
        console.error(error);
        return '<p>Error al cargar esta sección. Por favor, intenta de nuevo.</p>';
    }
}

export function navigate(path) {
    history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('routechange'));
}

function initializeSettingsControls() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector) {
        themeSelector.value = savedTheme;
    }

    const animationsDisabled = localStorage.getItem('animationsDisabled') === 'true';
    const animationsToggle = document.getElementById('animationsToggle');
    if (animationsToggle) {
        animationsToggle.checked = animationsDisabled;
    }
}

function handlePlantRoute(path, allPlants, favorites) {
    const plantKey = path.split('/planta/')[1];
    const plant = allPlants[plantKey];
    if (plant) {
        return {
            view: 'plantDetail',
            action: (state) => {
                PlantUI.renderPlantDetail(plant);
                state.currentPlantKey = plantKey;
                PlantUI.updateFavoriteButtonVisual(favorites.includes(plantKey));
            }
        };
    }
    console.warn(`Planta no encontrada: ${plantKey}`);
    navigate('/explorar');
    return null;
}

function handleCommunityChatRoute(path, collectionData, chatData, prefix) {
    const id = path.split(prefix)[1];
    const item = collectionData.find(i => i.id === id);
    const targetElementId = 'chatViewContainer';

    if (item) {
        return {
            view: 'chat',
            action: () => {
                if (prefix === '/foro/') {
                    CommunityUI.renderForumTopicView(item, chatData.forumMessages?.[id] || [], targetElementId);
                } else {
                    CommunityUI.renderCommunityView(item, chatData.communityChannels?.[id] || {}, targetElementId);
                }
            }
        };
    }
    console.warn(`${prefix === '/foro/' ? 'Foro' : 'Comunidad'} no encontrado: ${id}`);
    navigate(prefix.slice(0, -1));
    return null;
}

function handleUserRoute(path) {
    const userId = path.split('/usuario/')[1];
    if (userId) {
        return {
            view: 'publicProfile',
            action: () => displayPublicProfileInfo(userId)
        };
    }
    console.warn('ID de usuario no especificado en la URL.');
    navigate('/');
    return null;
}

function handleCampaignRoute(path, campaigns, userCampaigns) {
    const campaignId = path.split('/campana/')[1];
    const campaign = campaigns.find(c => c.id === campaignId);

    if (!campaign) {
        console.warn(`Campaña no encontrada: ${campaignId}`);
        navigate('/campana');
        return null;
    }

    const isJoined = userCampaigns.includes(campaignId);
    if (!isJoined) {
        showToast("Debes unirte a la campaña para ver su progreso.", "warning");
        navigate('/campana');
        return null;
    }

    return {
        view: 'campaignDetail',
        action: () => {
            CommunityUI.renderCampaignDetailView(campaign);
        }
    };
}


export async function handleRouting(state) {
    const path = window.location.pathname;
    const appRoot = document.getElementById('app-root');
    if (!appRoot) return;

    appRoot.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

    if (path === '/configurar-perfil') {
        document.body.classList.add('onboarding-flow');
    } else {
        document.body.classList.remove('onboarding-flow');
    }

    const user = auth.currentUser;

    if (user) {
        try {
            const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists() && docSnap.data().hasCompletedOnboarding !== true) {
                if (path !== '/configurar-perfil') {
                    navigate('/configurar-perfil');
                    return;
                }
            } else if (docSnap.exists() && docSnap.data().hasCompletedOnboarding === true) {
                 if (path === '/configurar-perfil') {
                    navigate('/perfil');
                    return;
                 }
            } else if (!docSnap.exists()) {
                await App.handleUserCreation(user);
                navigate('/configurar-perfil');
                return;
            }
        } catch (error) {
            console.error("Error grave en el enrutador de bienvenida:", error);
        }
    }

    const {
        allPlants = {},
        favorites = [],
        forums = [],
        communities = [],
        campaigns = [],
        userCampaigns = [],
        chatData = {}
    } = state || {};

    const staticRoutes = {
        '/': { view: 'home', action: () => App.handlePlantOfTheWeek() },
        '/home': { view: 'home', action: () => App.handlePlantOfTheWeek() },
        '/explorar': {
            view: 'explorar',
            action: () => {
                PlantUI.populateFilterOptions(allPlants);
                App.handleFilterChange();
            }
        },
        '/identificar': { view: 'identificar' },
        '/donaciones': { view: 'donaciones' },
        '/creditos': { view: 'creditos' },
        '/favoritos': { view: 'favoritos', guard: user, action: () => PlantUI.renderFavorites(favorites, allPlants) },
        '/configuracion': { view: 'configuracion' },
        '/configuracion/accesibilidad': { view: 'accesibilidad', action: initializeSettingsControls },
        '/perfil': {
            view: 'perfil',
            guard: user,
            action: () => {
                if(user) initProfilePage();
            }
        },
        '/editar-perfil': {
            view: 'editar-perfil',
            guard: user,
            action: () => {
                if(user) initEditProfilePage();
            }
        },
        '/configurar-perfil': {
            view: 'configurar-perfil',
            guard: user,
            action: () => {
                if(user) initOnboardingPage();
            }
        },
        '/foros': { view: 'foros', action: () => CommunityUI.renderForums(forums) },
        '/comunidades': { view: 'comunidades', action: () => CommunityUI.renderCommunities(communities) },
        '/campana': { view: 'campana', action: () => CommunityUI.renderCampaignCards(campaigns, userCampaigns) }
    };

    let routeConfig = staticRoutes[path];

    if (!routeConfig) {
        if (path.startsWith('/planta/')) {
            routeConfig = handlePlantRoute(path, allPlants, favorites);
        } else if (path.startsWith('/foro/')) {
            routeConfig = handleCommunityChatRoute(path, forums, chatData, '/foro/');
        } else if (path.startsWith('/comunidad/')) {
            routeConfig = handleCommunityChatRoute(path, communities, chatData, '/comunidad/');
        } else if (path.startsWith('/usuario/')) {
            routeConfig = handleUserRoute(path);
        } else if (path.startsWith('/campana/')) {
            routeConfig = handleCampaignRoute(path, campaigns, userCampaigns);
        }
    }

    routeConfig = routeConfig || staticRoutes['/'];

    if (routeConfig && routeConfig.view) {
        if (routeConfig.guard === undefined && (routeConfig.view === 'favoritos' || routeConfig.view === 'perfil') && !user) {
             const loginModal = document.getElementById('loginModal');
             if(loginModal) loginModal.classList.add('active');
             console.log('Acceso denegado, redirigiendo a Home.');
             return navigate('/');
        }

        const viewHtml = await loadView(routeConfig.view);
        appRoot.innerHTML = viewHtml;

        requestAnimationFrame(() => {
            const contentEl = appRoot.firstElementChild;
            if (contentEl) {
                contentEl.classList.add('page-content');
            }

            if (routeConfig.action) {
                try {
                    routeConfig.action(state);
                } catch (error) {
                    console.error(`Error al ejecutar la acción para la ruta ${path} (después de renderizar):`, error);
                    appRoot.innerHTML = '<p>Ocurrió un error al cargar esta sección.</p>';
                }
            }
        });
    } else {
         appRoot.innerHTML = '<p>Página no encontrada.</p>';
    }

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}