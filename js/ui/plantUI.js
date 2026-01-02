import { handleLoadMore } from '../app.js'; // Importamos la acción para el botón

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper para inyectar el botón de carga si no existe
function ensureLoadMoreButton(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Buscamos si ya existe el botón justo después del container
    let btn = document.getElementById('loadMorePlantsBtn');
    
    // Si no existe, lo creamos
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'loadMorePlantsBtn';
        btn.className = 'button-primary';
        btn.style.display = 'none'; // Se oculta por defecto, app.js lo muestra si hay más
        btn.style.margin = '2rem auto';
        btn.style.maxWidth = '200px';
        btn.textContent = 'Cargar más plantas';
        
        // Lo insertamos después del grid
        container.parentNode.insertBefore(btn, container.nextSibling);
        
        // Evento
        btn.addEventListener('click', () => {
            handleLoadMore();
        });
    }
}

export function renderPlantGrid(plantKeys, allPlants, favorites, containerId = 'plantGridContainer', reset = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Si es reset, limpiamos todo y aseguramos que el botón exista
    if (reset) {
        container.innerHTML = '';
        ensureLoadMoreButton(containerId);
        window.scrollTo(0, 0); // Volver arriba en nueva búsqueda
    }

    const urlParams = new URLSearchParams(window.location.search);
    const searchTermFromUrl = urlParams.get('q');
    
    // Restaurar valor del input si viene de URL (solo visual)
    if (searchTermFromUrl && reset) {
        const exploreSearchInput = document.getElementById('exploreSearchInput');
        if (exploreSearchInput && exploreSearchInput.value === '') {
            exploreSearchInput.value = decodeURIComponent(searchTermFromUrl);
        }
    }

    // 2. Manejo de "Sin resultados" (Solo si es reset y no hay claves)
    if (reset && (!plantKeys || plantKeys.length === 0)) {
        container.innerHTML = `<p style="text-align: center; width: 100%; grid-column: 1 / -1; padding: 2rem;">No se encontraron plantas que coincidan con tu búsqueda.</p>`;
        return;
    }

    // 3. Renderizado de las plantas (Nuevas o Totales según el contexto)
    plantKeys.forEach(key => {
        const plant = allPlants?.[key];
        if (!plant) return;

        const isFavorited = Array.isArray(favorites) ? favorites.includes(key) : false;
        const safeImage = plant.imageCard || 'images/logo2.png';
        const safeName = plant.name || "Sin Nombre";

        const card = document.createElement('div');
        card.className = 'plant-card';
        card.dataset.plantKey = key;
        
        // Animación de entrada suave
        card.style.animation = 'fadeIn 0.5s ease-out';

        card.innerHTML = `
            <button class="plant-card-fav-btn ${isFavorited ? 'favorited' : ''}" aria-label="Añadir a favoritos">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
            <img src="${safeImage}" alt="${escapeHtml(safeName)}" loading="lazy">
            <h4>${escapeHtml(safeName)}</h4>
        `;
        container.appendChild(card);
    });
}

export function renderPlantDetail(plant) {
    const section = document.getElementById('plantDetailSection');
    if (!section || !plant) return;

    const safeImage = plant.imageCard || 'images/logo2.png';
    const safeName = plant.name || "Sin Nombre";
    const safeScientific = plant.scientificName || "";
    const safeWhatIsItFor = plant.whatIsItFor || "Información no disponible";
    const safeBenefits = plant.benefits || 'No disponible.';
    const safeSideEffects = plant.sideEffects || 'No disponible.';
    const safeLongDescription = plant.longDescription || 'Información detallada no disponible.';

    section.innerHTML = `
        <div class="plant-detail-header">
            <button class="button-secondary js-back-btn">&larr; Volver</button>
            <button id="favoriteBtn" class="header-icon-button" aria-label="Añadir a favoritos">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
        </div>
        <h1>${escapeHtml(safeName)}</h1>
        <p class="plant-scientific-name"><i>${escapeHtml(safeScientific)}</i></p>
        <div class="plant-detail-container">
            <div class="plant-image-gallery">
                <img src="${safeImage}" alt="${escapeHtml(safeName)}">
            </div>
            <div class="plant-detail-content">
                <div class="section collapsible open">
                    <h2 class="section-title">¿Para qué sirve?</h2>
                    <div class="section-content"><p>${escapeHtml(safeWhatIsItFor)}</p></div>
                </div>
                <div class="section collapsible">
                    <h2 class="section-title">Beneficios</h2>
                    <div class="section-content"><p>${escapeHtml(safeBenefits)}</p></div>
                </div>
                <div class="section collapsible">
                    <h2 class="section-title">Efectos Secundarios</h2>
                    <div class="section-content"><p>${escapeHtml(safeSideEffects)}</p></div>
                </div>
            </div>
        </div>
        <div class="long-description-section">
            <h3>Conoce más</h3>
            <p>${escapeHtml(safeLongDescription)}</p>
        </div>
    `;

    // Re-bind eventos de colapsables
    section.querySelectorAll('.collapsible .section-title').forEach(title => {
        title.addEventListener('click', () => title.parentElement.classList.toggle('open'));
    });
}

export function updateFavoriteButtonVisual(isFavorited) {
    const btn = document.getElementById('favoriteBtn');
    if (btn) btn.classList.toggle('favorited', !!isFavorited);
}

export function renderFavorites(favoriteKeys, allPlants) {
    const grid = document.getElementById('favoritesGridContainer');
    const emptyMsg = document.getElementById('emptyFavoritesMessage');
    if (!grid || !emptyMsg) return;

    grid.innerHTML = '';
    const favs = Array.isArray(favoriteKeys) ? favoriteKeys : [];

    if (favs.length === 0) {
        emptyMsg.style.display = 'flex';
        grid.style.display = 'none';
    } else {
        emptyMsg.style.display = 'none';
        grid.style.display = 'grid';
        // Renderizar favoritos reusando la lógica base (sin paginación compleja por ahora)
        // Pasamos 'favs' como las claves nuevas y 'allPlants' (aunque podría ser parcial)
        // Nota: Para favoritos, idealmente deberíamos cargar esas plantas específicas si no están en memoria.
        // Por ahora asumimos que el usuario ve lo que ha navegado o implementamos carga de favoritos en data.js
        renderPlantGrid(favs, allPlants, favs, 'favoritesGridContainer', true);
    }
}

export function renderPlantOfTheWeek(plant, plantKey) {
    const section = document.getElementById('plantOfTheWeekSection');
    if (!section || !plant) return;

    const safeImage = plant.imageCard || 'images/logo2.png';

    const imgEl = document.getElementById('potwImage');
    if (imgEl) {
        imgEl.src = safeImage;
        imgEl.removeAttribute('srcset');
        imgEl.removeAttribute('sizes');
    }

    const nameEl = document.getElementById('potwName');
    if (nameEl) nameEl.textContent = plant.name || "Planta Destacada";

    const descEl = document.getElementById('potwDescription');
    if (descEl) descEl.textContent = plant.whatIs || "Descúbrela hoy.";

    const btnEl = document.getElementById('potwButton');
    if (btnEl) btnEl.dataset.plantKey = plantKey;

    section.style.display = 'block';
}

export function renderQuickSearchResults(results) {
    const container = document.getElementById('quickSearchResults');
    if (!container) return;
    container.innerHTML = '';

    const list = Array.isArray(results) ? results : [];

    if (list.length === 0) {
        const termInput = document.getElementById('quickSearchInput');
        const term = termInput ? termInput.value.trim() : "";
        container.innerHTML = `<p class="search-tip">No se encontraron resultados para "${escapeHtml(term)}".</p>`;
        return;
    }

    const resultsHTML = list.map(item => {
        const type = item?.type || '';
        const icon = type === 'Planta' ? 'eco' : (type === 'Foro' ? 'forum' : 'groups');
        const itemName = item?.name || item?.title || "Sin Título";
        const path = item?.path || '/';
        return `
            <div class="quick-search-result-item" data-path="${escapeHtml(path)}">
                <span class="material-symbols-outlined">${escapeHtml(icon)}</span>
                <div class="result-info">
                    <p class="result-name">${escapeHtml(itemName)}</p>
                    <span class="result-type">${escapeHtml(type)}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="quick-search-results-list">${resultsHTML}</div>`;
}

// Opción simple para filtros: Valores estáticos comunes o manuales
// Ya que no tenemos todas las plantas para calcularlos dinámicamente
export function populateFilterOptions(allPlants) {
   // Se deja vacía o con valores fijos para no romper la UI al inicio
   // Idealmente, aquí pondrías tus categorías fijas:
   // const usos = ['Medicinal', 'Ornamental', 'Comestible'];
   // renderSelect('filterUso', usos);
}