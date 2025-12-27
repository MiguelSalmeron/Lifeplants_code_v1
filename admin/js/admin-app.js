import { auth, db } from '../../js/firebase-config.js';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initPlantsModule } from './plants.js';

// --- LISTA DE ACCESO SIMPLIFICADA ---
// Solo Correo : PIN
const AUTHORIZED_PINS = {
    "miguel.salmeron.dev@gmail.com": "150709",
    "anasofiapg10@gmail.com": "160210",
    "smsg23112008@gmail.com": "231108"
};

// Referencias del DOM
const authContainer = document.getElementById('auth-container');
const pinContainer = document.getElementById('pin-container');
const dashboardContainer = document.getElementById('admin-dashboard');

const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const cancelAuthBtn = document.getElementById('cancelAuthBtn');

const pinForm = document.getElementById('pinForm');
const pinInput = document.getElementById('securityPinInput');
const pinError = document.getElementById('pinError');
const pinUserName = document.getElementById('pinUserName');
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
}

function setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // LIMPIEZA TOTAL DEL CORREO (Minúsculas y sin espacios)
            const email = user.email.toLowerCase().trim();
            console.log("Intentando entrar con:", email); // Mira la consola si falla

            // Verificamos si el correo existe en nuestra lista
            if (AUTHORIZED_PINS.hasOwnProperty(email)) {
                currentUser = user;
                // Usamos el nombre de Google directamente
                showPinScreen(user.displayName || "Admin");
            } else {
                console.warn("Bloqueado:", email);
                loginError.innerHTML = `<b>Acceso Denegado</b><br>El correo ${email} no está autorizado.`;
                signOut(auth);
            }
        } else {
            currentUser = null;
            showLogin();
        }
    });
}

function setupEventListeners() {
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    cancelAuthBtn.addEventListener('click', handleLogout);

    // Validación del PIN
    pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputPin = pinInput.value.trim();
        const email = currentUser.email.toLowerCase().trim();
        
        // Buscamos el PIN correcto para este correo
        const correctPin = AUTHORIZED_PINS[email];
        
        if (inputPin === correctPin) {
            showDashboard(currentUser);
        } else {
            pinError.textContent = "PIN Incorrecto.";
            pinInput.value = '';
            pinInput.focus();
        }
    });

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
    provider.setCustomParameters({ prompt: 'select_account' }); // Siempre preguntar cuenta
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
        pinInput.value = '';
        pinError.textContent = '';
        loginError.textContent = '';
    } catch (error) {
        console.error("Error logout:", error);
    }
}

// --- PANTALLAS ---
function showLogin() {
    authContainer.style.display = 'flex';
    pinContainer.style.display = 'none';
    dashboardContainer.style.display = 'none';
}

function showPinScreen(name) {
    authContainer.style.display = 'none';
    pinContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
    pinUserName.textContent = name;
    pinInput.focus();
}

function showDashboard(user) {
    authContainer.style.display = 'none';
    pinContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';
    
    adminName.textContent = user.displayName;
    adminEmail.textContent = user.email;
    adminAvatar.src = user.photoURL;
    
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
        const plantsSnap = await getDocs(query(collection(db, 'plants')));
        contentArea.innerHTML = `
            <div class="card">
                <h3>Plantas en sistema</h3>
                <p style="font-size: 2rem; color: green;">${plantsSnap.size}</p>
            </div>
        `;
    } catch (error) {
        contentArea.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

init();