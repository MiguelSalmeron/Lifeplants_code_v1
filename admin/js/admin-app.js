import { auth, db } from '../../js/firebase-config.js';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initPlantsModule } from './plants.js';

// Referencias del DOM
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('admin-dashboard');

const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const cancelAuthBtn = document.getElementById('cancelAuthBtn');

const loginError = document.getElementById('loginError');

const contentArea = document.getElementById('content-area');
const pageTitle = document.getElementById('pageTitle');
const navItems = document.querySelectorAll('.nav-item');
const adminAvatar = document.getElementById('adminAvatar');
const adminName = document.getElementById('adminName');
const adminEmail = document.getElementById('adminEmail');

let currentUser = null;

// --- INICIO ---
function init() {
    setupAuthListener();
    setupEventListeners();
    
    // Ocultar contenedor de PIN si existe en el HTML para evitar confusión
    const pinContainer = document.getElementById('pin-container');
    if(pinContainer) pinContainer.style.display = 'none';
}

function setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            // Ya no pedimos PIN, pasamos directo al Dashboard.
            // Si el usuario NO es admin, las reglas de Firestore darán error al cargar datos.
            showDashboard(user);
        } else {
            currentUser = null;
            showLogin();
        }
    });
}

function setupEventListeners() {
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    if(cancelAuthBtn) cancelAuthBtn.addEventListener('click', handleLogout);

    // Navegación del menú
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            handleNavigation(view, e.currentTarget);
        });
    });
}

async function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' }); 
    loginError.textContent = '';
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error login:", error);
        loginError.textContent = "Error de conexión con Google.";
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        loginError.textContent = '';
    } catch (error) {
        console.error("Error logout:", error);
    }
}

// --- PANTALLAS ---
function showLogin() {
    authContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
}

function showDashboard(user) {
    authContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';
    
    adminName.textContent = user.displayName;
    adminEmail.textContent = user.email;
    adminAvatar.src = user.photoURL || 'https://via.placeholder.com/150';
    
    // Cargar vista inicial
    loadView('dashboard');
}

function handleNavigation(viewName, activeElement) {
    navItems.forEach(nav => nav.classList.remove('active'));
    if (activeElement) activeElement.classList.add('active');
    loadView(viewName);
}

async function loadView(viewName) {
    contentArea.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
    
    switch(viewName) {
        case 'dashboard':
            pageTitle.textContent = 'Resumen';
            await renderDashboardOverview();
            break;
        case 'plants':
            pageTitle.textContent = 'Gestión de Plantas';
            initPlantsModule(contentArea); 
            break;
        case 'campaigns':
        case 'users':
            pageTitle.textContent = 'Próximamente';
            contentArea.innerHTML = '<div class="card"><h3>En construcción</h3></div>';
            break;
        default:
            contentArea.innerHTML = '<p>Vista no encontrada</p>';
    }
}

async function renderDashboardOverview() {
    try {
        // Intentamos leer una colección. Si falla, es que no somos admins.
        const plantsSnap = await getDocs(query(collection(db, 'plants')));
        contentArea.innerHTML = `
            <div class="card">
                <h3>Plantas en sistema</h3>
                <p style="font-size: 2rem; color: green;">${plantsSnap.size}</p>
            </div>
        `;
    } catch (error) {
        console.error("Acceso denegado:", error);
        contentArea.innerHTML = `
            <div class="card" style="border-left: 5px solid red;">
                <h3 style="color: red;">Acceso Denegado</h3>
                <p>Tu cuenta (${currentUser.email}) no tiene permisos de administrador.</p>
                <p>Si crees que es un error, contacta al dueño del sistema.</p>
            </div>
        `;
    }
}

init();