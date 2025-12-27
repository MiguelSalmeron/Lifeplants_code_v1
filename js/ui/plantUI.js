function generateSrcset(url) {
    if (!url) return '';
    const base = url.split('?')[0];
    return `${base}?w=160 160w, ${base}?w=240 240w, ${base}?w=320 320w`;
}

export function renderPlantGrid(plantKeys, allPlants, favorites, containerId = 'plantGridContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const urlParams = new URLSearchParams(window.location.search);
    const searchTermFromUrl = urlParams.get('q');
    if (searchTermFromUrl) {
        const exploreSearchInput = document.getElementById('exploreSearchInput');
        if (exploreSearchInput && exploreSearchInput.value === '') {
             exploreSearchInput.value = decodeURIComponent(searchTermFromUrl);
        }
        if(window.history.replaceState) {
             const cleanUrl = window.location.origin + window.location.pathname;
             window.history.replaceState(null, null, cleanUrl);
        }
    }

    if (!plantKeys || plantKeys.length === 0) {
        container.innerHTML = `<p style="text-align: center; width: 100%;">No se encontraron plantas que coincidan con tu búsqueda.</p>`;
        return;
    }
    plantKeys.forEach(key => {
        const plant = allPlants[key];
        if (!plant) return;
        const isFavorited = favorites.includes(key);
        // PROTECCIÓN: Si no hay imagen, usar placeholder
        const safeImage = plant.imageCard || 'images/logo2.png';
        const safeName = plant.name || "Sin Nombre";
        const srcset = generateSrcset(safeImage);

        const card = document.createElement('div');
        card.className = 'plant-card';
        card.dataset.plantKey = key;
        card.innerHTML = `
            <button class="plant-card-fav-btn ${isFavorited ? 'favorited' : ''}" aria-label="Añadir a favoritos"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>
            <img src="${safeImage}" 
                 srcset="${srcset}" 
                 sizes="(max-width: 768px) 50vw, 250px" 
                 alt="${safeName}" 
                 loading="lazy">
            <h4>${safeName}</h4>`;
        container.appendChild(card);
    });
}

export function renderPlantDetail(plant) {
    const section = document.getElementById('plantDetailSection');
    if (!section || !plant) return;

    const safeImage = plant.imageCard || 'images/logo2.png';
    const srcset = generateSrcset(safeImage);

    section.innerHTML = `
        <div class="plant-detail-header">
             <button class="button-secondary js-back-btn">&larr; Volver</button>
             <button id="favoriteBtn" class="header-icon-button" aria-label="Añadir a favoritos"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>
        </div>
        <h1>${plant.name || "Sin Nombre"}</h1>
        <p class="plant-scientific-name"><i>${plant.scientificName || ""}</i></p>
        <div class="plant-detail-container">
            <div class="plant-image-gallery">
                 <img src="${safeImage}" 
                      srcset="${srcset}" 
                      sizes="(max-width: 768px) 100vw, 350px" 
                      alt="${plant.name}">
            </div>
            <div class="plant-detail-content">
                <div class="section collapsible open"><h2 class="section-title">¿Para qué sirve?</h2><div class="section-content"><p>${plant.whatIsItFor || "Información no disponible"}</p></div></div>
                <div class="section collapsible"><h2 class="section-title">Beneficios</h2><div class="section-content"><p>${plant.benefits || 'No disponible.'}</p></div></div>
                <div class="section collapsible"><h2 class="section-title">Efectos Secundarios</h2><div class="section-content"><p>${plant.sideEffects || 'No disponible.'}</p></div></div>
            </div>
        </div>
        <div class="long-description-section">
            <h3>Conoce más</h3>
            <p>${plant.longDescription || 'Información detallada no disponible.'}</p>
        </div>`;
    section.querySelectorAll('.collapsible .section-title').forEach(title => {
        title.addEventListener('click', () => title.parentElement.classList.toggle('open'));
    });
}

export function updateFavoriteButtonVisual(isFavorited) {
    const btn = document.getElementById('favoriteBtn');
    if (btn) btn.classList.toggle('favorited', isFavorited);
}

export function renderFavorites(favoriteKeys, allPlants) {
    const grid = document.getElementById('favoritesGridContainer');
    const emptyMsg = document.getElementById('emptyFavoritesMessage');
    if (!grid || !emptyMsg) return;

    grid.innerHTML = '';
    if (favoriteKeys.length === 0) {
        emptyMsg.style.display = 'flex';
        grid.style.display = 'none';
    } else {
        emptyMsg.style.display = 'none';
        grid.style.display = 'grid';
        renderPlantGrid(favoriteKeys, allPlants, favoriteKeys, 'favoritesGridContainer');
    }
}

export function renderPlantOfTheWeek(plant, plantKey) {
    const section = document.getElementById('plantOfTheWeekSection');
    if (!section || !plant) return;

    const safeImage = plant.imageCard || 'images/logo2.png';
    const srcset = generateSrcset(safeImage);

    const imgEl = document.getElementById('potwImage');
    if(imgEl) {
        imgEl.src = safeImage;
        imgEl.srcset = srcset;
        imgEl.sizes = '(max-width: 768px) 100vw, 400px';
    }

    const nameEl = document.getElementById('potwName');
    if(nameEl) nameEl.textContent = plant.name || "Planta Destacada";
    
    const descEl = document.getElementById('potwDescription');
    if(descEl) descEl.textContent = plant.whatIs || "Descúbrela hoy.";
    
    const btnEl = document.getElementById('potwButton');
    if(btnEl) btnEl.dataset.plantKey = plantKey;
    
    section.style.display = 'block';
}

export function renderQuickSearchResults(results) {
    const container = document.getElementById('quickSearchResults');
    if (!container) return;
    container.innerHTML = '';

    if (results.length === 0) {
        const termInput = document.getElementById('quickSearchInput');
        const term = termInput ? termInput.value.trim() : "";
        container.innerHTML = `<p class="search-tip">No se encontraron resultados para "${term}". Presiona Enter para ir a la vista Explorar y refinar tu búsqueda.</p>`;
        return;
    }

    const resultsHTML = results.map(item => {
        const icon = item.type === 'Planta' ? 'eco' : (item.type === 'Foro' ? 'forum' : 'groups');
        const itemName = item.name || item.title || "Sin Título";
        return `
            <div class="quick-search-result-item" data-path="${item.path}">
                <span class="material-symbols-outlined">${icon}</span>
                <div class="result-info">
                    <p class="result-name">${itemName}</p>
                    <span class="result-type">${item.type}</span>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = `<div class="quick-search-results-list">${resultsHTML}</div>`;
}

export function populateFilterOptions(allPlants) {
    if (!allPlants || Object.keys(allPlants).length === 0) return;

    const filters = {
        uso: new Set(),
        region: new Set(),
        tipo: new Set()
    };

    Object.values(allPlants).forEach(plant => {
        if (plant.uso && Array.isArray(plant.uso)) {
            plant.uso.forEach(u => {
                if(u) filters.uso.add(String(u).toLowerCase());
            });
        }
        if (plant.region && Array.isArray(plant.region)) {
            plant.region.forEach(r => {
                if(r) filters.region.add(String(r).toLowerCase());
            });
        }
        if (plant.tipo) {
            filters.tipo.add(String(plant.tipo).toLowerCase());
        }
    });

    const renderSelect = (selectId, uniqueValues) => {
        const selectEl = document.getElementById(selectId);
        if (selectEl) {
            const defaultOption = selectEl.querySelector('option[value="todos"]') || selectEl.querySelector('option[value="Todas"]');
            selectEl.innerHTML = '';
            if (defaultOption) selectEl.appendChild(defaultOption);

            const sortedValues = Array.from(uniqueValues).sort();

            sortedValues.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value.charAt(0).toUpperCase() + value.slice(1);
                selectEl.appendChild(option);
            });
        }
    };

    renderSelect('filterUso', filters.uso);
    renderSelect('filterRegion', filters.region);
    renderSelect('filterTipo', filters.tipo);
}