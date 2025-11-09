import {
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
import { auth } from './firebase-config.js';
import { showToast } from './ui/modalUI.js';
import { createUserProfileDocument } from './profile.js';
import { navigate } from './router.js';

function clearAuthErrors() {
    const regNameError = document.getElementById('registerNameError');
    const regEmailError = document.getElementById('registerEmailError');
    const regPasswordError = document.getElementById('registerPasswordError');
    const loginEmailError = document.getElementById('loginEmailError');
    const loginPasswordError = document.getElementById('loginPasswordError');

    if(regNameError) regNameError.textContent = '';
    if(regEmailError) regEmailError.textContent = '';
    if(regPasswordError) regPasswordError.textContent = '';
    if(loginEmailError) loginEmailError.textContent = '';
    if(passwordPasswordError) loginPasswordError.textContent = '';
}

function showAuthError(errorCode, formType) {
    let emailErrorElement, passwordErrorElement, nameErrorElement;

    if (formType === 'register') {
        nameErrorElement = document.getElementById('registerNameError');
        emailErrorElement = document.getElementById('registerEmailError');
        passwordErrorElement = document.getElementById('registerPasswordError');
    } else {
        emailErrorElement = document.getElementById('loginEmailError');
        passwordErrorElement = document.getElementById('loginPasswordError');
    }

    if(nameErrorElement) nameErrorElement.textContent = '';
    if(emailErrorElement) emailErrorElement.textContent = '';
    if(passwordErrorElement) passwordErrorElement.textContent = '';

    switch (errorCode) {
        case 'auth/missing-field':
             if(nameErrorElement) nameErrorElement.textContent = 'El nombre es obligatorio.';
             break;
        case 'auth/invalid-email':
            if(emailErrorElement) emailErrorElement.textContent = 'El formato del correo no es válido.';
            break;
        case 'auth/email-already-in-use':
            if(emailErrorElement) emailErrorElement.textContent = 'Este correo ya está registrado.';
            break;
        case 'auth/weak-password':
            if(passwordErrorElement) passwordErrorElement.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            break;
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
             if(emailErrorElement) emailErrorElement.textContent = 'Credenciales incorrectas (correo o contraseña).';
             if(passwordErrorElement) passwordErrorElement.textContent = ' ';
             break;
        case 'auth/wrong-password':
             if(passwordErrorElement) passwordErrorElement.textContent = 'Credenciales incorrectas (correo o contraseña).';
             if(emailErrorElement) emailErrorElement.textContent = ' ';
             break;
        default:
             const generalErrorElement = formType === 'register' ? emailErrorElement : loginEmailError;
             if(generalErrorElement) generalErrorElement.textContent = 'Ocurrió un error. Inténtalo de nuevo.';
             console.error("Error de autenticación no manejado:", errorCode);
    }
}

export async function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        await createUserProfileDocument(user, user.displayName);

        showToast(`¡Bienvenido, ${user.displayName}!`, 'success');
        document.getElementById('loginModal')?.classList.remove('active');
        navigate('/');

    } catch (error) {
        console.error("Error en Google signInWithPopup:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            showToast('Error al iniciar sesión con Google.', 'error');
        }
    }
}

export function handleRegister(event) {
    event.preventDefault();
    clearAuthErrors();
    const nameInput = document.getElementById('registerNameSimulated');
    const emailInput = document.getElementById('registerEmailSimulated');
    const passwordInput = document.getElementById('registerPasswordSimulated');

    if (!nameInput?.value) { showAuthError('auth/missing-field', 'register'); return; }
    if (!emailInput?.value) { showAuthError('auth/invalid-email', 'register'); return; }
    if (!passwordInput?.value) { showAuthError('auth/weak-password', 'register'); return; }

    const name = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            await updateProfile(user, { displayName: name });
            await createUserProfileDocument(user, name);
            showToast(`¡Cuenta creada para ${name}!`, 'success');
            document.getElementById('registerModal')?.classList.remove('active');
            nameInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';
            navigate('/');
        })
        .catch((error) => {
            showAuthError(error.code, 'register');
        });
}

export function handleLogin(event) {
    event.preventDefault();
    clearAuthErrors();
    const emailInput = document.getElementById('loginEmailSimulated');
    const passwordInput = document.getElementById('loginPasswordSimulated');

     if (!emailInput?.value || !passwordInput?.value) {
        showAuthError('auth/invalid-credential', 'login');
        return;
    }

    const email = emailInput.value;
    const password = passwordInput.value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            showToast(`¡Bienvenido de nuevo!`, 'success');
            document.getElementById('loginModal')?.classList.remove('active');
            emailInput.value = '';
            passwordInput.value = '';
            navigate('/');
        })
        .catch((error) => {
             if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                 showAuthError('auth/invalid-credential', 'login');
             } else {
                 showAuthError(error.code, 'login');
             }
        });
}

export function handleLogout() {
    signOut(auth).then(() => {
        showToast('Has cerrado sesión.', 'success');
        navigate('/');
    }).catch((error) => {
        showToast("Error al cerrar sesión: " + error.message, 'error');
    });
}

export function requireAuth(message) {
    if (!auth.currentUser) {
        showToast(message, 'warning');
        document.getElementById('loginModal')?.classList.add('active');
        return false;
    }
    return true;
}

export function updateAuthUI(user, profileData = null) {
    const userInfoContainer = document.getElementById('user-info-container');
    const sidebarProfileContainer = document.getElementById('sidebarProfileContainer');
    const mainSidebarContent = document.getElementById('sidebar')?.querySelector('.sidebar-content');

    if (!userInfoContainer || !sidebarProfileContainer || !mainSidebarContent) {
        console.error("Error CRÍTICO: No se encontraron todos los contenedores UI para autenticación.");
        return;
    }

    const mainMenuHTML = `
        <h4>Menú Principal</h4>
        <ul class="sidebar-links">
            <li id="sidebarSearchBtn"><span class="material-symbols-outlined">search</span> Buscar</li>
            <li data-navigate="/explorar"><span class="material-symbols-outlined">eco</span> Explorar Plantas</li>
            <li data-navigate="/identificar"><span class="material-symbols-outlined">search</span> Identificar Planta</li>
            <li data-navigate="/comunidades"><span class="material-symbols-outlined">groups</span> Comunidades</li>
            <li data-navigate="/campana"><span class="material-symbols-outlined">campaign</span> Campañas</li>
            <hr>
            <li data-navigate="/donaciones"><span class="material-symbols-outlined">volunteer_activism</span> Donaciones</li>
            <li data-navigate="/configuracion"><span class="material-symbols-outlined">tune</span> Configuración</li>
        </ul>
    `;

    const accountMenuHTML = `
        <h4>Mi Cuenta</h4>
        <ul class="sidebar-links">
            <li data-navigate="/perfil">
                <span class="material-symbols-outlined">person</span> Ver Perfil
            </li>
            <li data-navigate="/favoritos">
                <span class="material-symbols-outlined">favorite</span> Mis Favoritos
            </li>
            <hr>
            <li id="logoutBtn">
                 <span class="material-symbols-outlined">logout</span> Cerrar Sesión
            </li>
        </ul>
    `;

    const loginPromptHTML = `
        <div style="padding: 0 10px; margin-top: 10px;">
            <p style="font-size: 0.9em; color: var(--secondary-text-color); margin-bottom: 15px;">Inicia sesión para ver tu perfil y guardar favoritos.</p>
            <button class="button-primary" id="sidebarLoginBtn" style="width: 100%;">Iniciar Sesión</button>
        </div>
        <hr>
    `;

    if (user) {
        const photoURL = profileData?.photoURL || user.photoURL || 'https://via.placeholder.com/48/82CD47/FFFFFF?text=U';
        const displayName = profileData?.displayName || user.displayName || user.email.split('@')[0];

        userInfoContainer.innerHTML = `
            <a href="/perfil" data-navigate="/perfil" class="nav-profile-link" title="${displayName}">
                <img src="${photoURL}" alt="${displayName}" class="nav-profile-pic" onerror="this.onerror=null; this.src='https://via.placeholder.com/48/82CD47/FFFFFF?text=U'">
            </a>
        `;

        sidebarProfileContainer.innerHTML = '';
        sidebarProfileContainer.style.display = 'none';

        mainSidebarContent.innerHTML = accountMenuHTML + mainMenuHTML;

    } else {
        userInfoContainer.innerHTML = `<a href="#" id="loginLink" class="header-button-link">Iniciar Sesión</a>`;

        sidebarProfileContainer.innerHTML = '';
        sidebarProfileContainer.style.display = 'none';

        mainSidebarContent.innerHTML = loginPromptHTML + mainMenuHTML;
    }
}