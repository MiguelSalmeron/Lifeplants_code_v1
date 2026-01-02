import { 
    handleFilterChange, 
    resetFilters, 
    handleQuickSearch, 
    handleImageIdentification,
    setTheme,
    toggleAnimations,
    state
} from './app.js';
import { identifyWithInaturalist } from './plant-identifier.js';

// --- UTILIDAD: DEBOUNCE ---
// Evita que una función se ejecute muchas veces seguidas (ej: escribir en el buscador)
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export function setupEventListeners() {
    
    // 1. BUSCADOR PRINCIPAL (Explorar)
    // Usamos debounce para esperar 500ms a que el usuario termine de escribir antes de buscar en Firebase
    const exploreInput = document.getElementById('exploreSearchInput');
    if (exploreInput) {
        exploreInput.addEventListener('input', debounce((e) => {
            handleFilterChange(); 
        }, 500));
    }

    // 2. BUSCADOR RÁPIDO (Navbar/Modal)
    const quickInput = document.getElementById('quickSearchInput');
    if (quickInput) {
        quickInput.addEventListener('input', debounce((e) => {
            handleQuickSearch(e.target.value);
        }, 300));
    }

    // 3. FILTROS (Selects)
    // Usamos 'change' para que se actualice al seleccionar una opción
    ['filterUso', 'filterRegion', 'filterTipo'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', () => {
                handleFilterChange();
            });
        }
    });

    // Botón de limpiar filtros
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }

    // 4. IDENTIFICADOR DE PLANTAS (Subida de imagen)
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');

    if (uploadArea && imageInput) {
        uploadArea.addEventListener('click', () => imageInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleImageIdentification(file);
            }
        });

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleImageIdentification(file);
            }
        });
    }

    // 5. CONFIGURACIÓN (Tema y Animaciones)
    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            setTheme(e.target.value);
        });
    }

    const animationsToggle = document.getElementById('animationsToggle');
    if (animationsToggle) {
        animationsToggle.addEventListener('change', toggleAnimations);
    }

    // 6. NAVEGACIÓN MÓVIL (Hamburguesa)
    const menuToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active'); // Para animar el icono si tienes CSS para ello
        });

        // Cerrar menú al hacer clic en un enlace
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
            });
        });
    }

    // 7. MODALES (Cierre genérico)
    // Cierra cualquier modal activo si se hace clic fuera del contenido o en la X
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    });

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) modal.classList.remove('active');
        });
    });
}