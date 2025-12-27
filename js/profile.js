import {
    doc, setDoc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { db, storage, auth } from './firebase-config.js';
import { showToast } from './ui/modalUI.js';
import { COLLECTIONS } from './constants.js';
import { navigate } from './router.js';

let fileToUpload = null;
let onboardingDebounceTimer;

export async function createUserProfileDocument(user, displayName) {
    if (!user) return;
    const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        return;
    }

    const defaultPhotoURL = 'https://placehold.co/150x150/4CAF50/FFFFFF?text=LP';

    const emailUsername = user.email.split('@')[0];
    const randomSuffix = Math.floor(Math.random() * 999);
    const newUsername = `${emailUsername.replace(/[^a-zA-Z0-9]/g, '')}${randomSuffix}`;

    const newUserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName || user.email.split('@')[0],
        username: newUsername,
        bio: '¡Hola! Soy nuevo en LifePlants.',
        photoURL: user.photoURL || defaultPhotoURL,
        createdAt: new Date(),
        badges: [],
        hasCompletedOnboarding: false,
        favorites: [],
        userCampaigns: []
    };
    await setDoc(userDocRef, newUserProfile);
}

async function checkUsernameUniqueness(username, currentUserId = null) {
    const normalizedUsername = username.toLowerCase();
    if (normalizedUsername.length < 3) return { unique: false, message: 'Muy corto (mín. 3)' };

    const q = query(collection(db, COLLECTIONS.USER_PROFILES), where("username", "==", normalizedUsername));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { unique: true, message: '¡Disponible!' };
    }

    let isUnique = true;
    querySnapshot.forEach((doc) => {
        if (doc.id !== currentUserId) {
            isUnique = false;
        }
    });

    if (isUnique) {
         return { unique: true, message: '¡Disponible!' };
    } else {
         return { unique: false, message: 'Ya está en uso.' };
    }
}

async function uploadProfilePicture(file) {
    const user = auth.currentUser;
    if (!user || !file) return null;

    showToast('Subiendo imagen...', 'info');
    const storageRef = ref(storage, `profilePictures/${user.uid}/${file.name}`);

    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        showToast('Foto de perfil procesada.', 'success');
        return downloadURL;
    } catch (error) {
        console.error("Error al subir la imagen:", error);
        showToast('Error al subir la imagen.', 'error');
        return null;
    }
}

export async function completeOnboardingProfile(formData, newFile) {
    const user = auth.currentUser;
    if (!user) return false;

    const { displayName, username, bio } = formData;
    const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);
    const normalizedUsername = username.toLowerCase();

    const usernameCheck = await checkUsernameUniqueness(normalizedUsername, user.uid);
    if (!usernameCheck.unique) {
        showToast('Ese nombre de usuario ya está en uso.', 'error');
        return false;
    }

    try {
        let newPhotoURL = null;
        if (newFile) {
            newPhotoURL = await uploadProfilePicture(newFile);
        }

        const dataToUpdate = {
            displayName: displayName,
            username: normalizedUsername,
            bio: bio,
            hasCompletedOnboarding: true,
            favorites: [],
            userCampaigns: []
        };

        if (newPhotoURL) {
            dataToUpdate.photoURL = newPhotoURL;
        }

        await updateDoc(userDocRef, dataToUpdate);
        showToast('¡Bienvenido a LifePlants!', 'success');
        localStorage.removeItem('onboardingDraft');
        return true;

    } catch (error) {
        console.error("Error al completar el perfil:", error);
        showToast('No se pudo guardar tu perfil.', 'error');
        return false;
    }
}

export async function updateUserProfile(formData, newFile) {
    const user = auth.currentUser;
    if (!user) return false;

    const { displayName, username, bio } = formData;
    const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);
    const normalizedUsername = username.toLowerCase();

    const usernameCheck = await checkUsernameUniqueness(normalizedUsername, user.uid);
    if (!usernameCheck.unique) {
        showToast('Ese nombre de usuario ya está en uso.', 'error');
        return false;
    }

    try {
        let newPhotoURL = null;
        if (newFile) {
            newPhotoURL = await uploadProfilePicture(newFile);
        }

        const dataToUpdate = {
            displayName: displayName,
            username: normalizedUsername,
            bio: bio
        };

        if (newPhotoURL) {
            dataToUpdate.photoURL = newPhotoURL;
        }

        await updateDoc(userDocRef, dataToUpdate);
        showToast('Perfil actualizado con éxito.', 'success');
        return true;

    } catch (error) {
        console.error("Error al actualizar el perfil:", error);
        showToast('No se pudo actualizar el perfil.', 'error');
        return false;
    }
}

export async function updateUserFavorites(plantKey, isAdding) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);

    try {
        if (isAdding) {
            await updateDoc(userDocRef, {
                favorites: arrayUnion(plantKey)
            });
        } else {
            await updateDoc(userDocRef, {
                favorites: arrayRemove(plantKey)
            });
        }
    } catch (error) {
        console.error("Error al actualizar favoritos en Firestore:", error);
        showToast('Error al guardar favorito.', 'error');
    }
}

export async function updateUserCampaigns(campaignId) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);

    try {
        await updateDoc(userDocRef, {
            userCampaigns: arrayUnion(campaignId)
        });
    } catch (error) {
        console.error("Error al unirse a campaña en Firestore:", error);
        showToast('Error al unirse a la campaña.', 'error');
    }
}

export async function initProfilePage() {
    const user = auth.currentUser;
    if (!user) {
        navigate('/');
        return;
    }

    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            navigate('/editar-perfil');
        });
    }

    displayProfileInfo(user);
}

export async function initEditProfilePage() {
    fileToUpload = null;
    const user = auth.currentUser;
    if (!user) {
        navigate('/');
        return;
    }

    const form = document.getElementById('editProfileForm');
    const picInput = document.getElementById('profilePictureUpload');
    const picPreview = document.getElementById('profilePicturePreview');
    const changePicBtn = document.getElementById('changeProfilePicBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveProfileBtn');
    const previewName = document.getElementById('previewDisplayName');
    const previewUsername = document.getElementById('previewUsername');

    try {
        const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('displayNameInput').value = data.displayName || '';
            document.getElementById('usernameInput').value = data.username || '';
            document.getElementById('bioTextarea').value = data.bio || '';
            if (picPreview) picPreview.src = data.photoURL || 'https://placehold.co/150x150/4CAF50/FFFFFF?text=LP';
            if (previewName) previewName.textContent = data.displayName || 'Usuario';
            if (previewUsername) previewUsername.textContent = data.username ? `@${data.username}` : '@usuario';
        }
    } catch (error) {
        console.error("Error cargando datos del perfil:", error);
        showToast('No se pudieron cargar tus datos.', 'error');
    }

    if (changePicBtn) {
        changePicBtn.addEventListener('click', () => picInput.click());
    }

    if (picInput) {
        picInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileToUpload = file;
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (picPreview) picPreview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            saveBtn.classList.add('is-loading');
            saveBtn.disabled = true;

            const formData = {
                displayName: document.getElementById('displayNameInput').value,
                username: document.getElementById('usernameInput').value,
                bio: document.getElementById('bioTextarea').value
            };

            try {
                const success = await updateUserProfile(formData, fileToUpload);
                fileToUpload = null;
                if (success) {
                    navigate('/perfil');
                }
            } catch (error) {
                console.error("Error en submit de editar perfil:", error);
            } finally {
                saveBtn.classList.remove('is-loading');
                saveBtn.disabled = false;
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            fileToUpload = null;
            history.back();
        });
    }
}

export async function initOnboardingPage() {
    fileToUpload = null;
    const user = auth.currentUser;
    if (!user) {
        navigate('/');
        return;
    }

    const form = document.getElementById('onboardingForm');
    const picInput = document.getElementById('profilePictureUpload');
    const picPreview = document.getElementById('profilePicturePreview');
    const changePicBtn = document.getElementById('changeProfilePicBtn');
    const usernameInput = document.getElementById('usernameInput');
    const usernameStatus = document.getElementById('usernameStatus');
    const displayNameInput = document.getElementById('displayNameInput');
    const bioTextarea = document.getElementById('bioTextarea');
    const submitBtn = form.querySelector('button[type="submit"]');

    const draft = JSON.parse(localStorage.getItem('onboardingDraft') || '{}');

    try {
        const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            displayNameInput.value = draft.displayName || data.displayName || '';
            bioTextarea.value = draft.bio || data.bio || '';
            usernameInput.value = draft.username || '';
            if (picPreview) picPreview.src = data.photoURL || 'https://placehold.co/150x150/4CAF50/FFFFFF?text=LP';
        }
    } catch (error) {
        console.error("Error cargando datos del perfil:", error);
    }

    const saveDraft = () => {
        const draftData = {
            displayName: displayNameInput.value,
            username: usernameInput.value,
            bio: bioTextarea.value
        };
        localStorage.setItem('onboardingDraft', JSON.stringify(draftData));
    };

    displayNameInput.addEventListener('input', saveDraft);
    usernameInput.addEventListener('input', saveDraft);
    bioTextarea.addEventListener('input', saveDraft);

    usernameInput.addEventListener('input', () => {
        clearTimeout(onboardingDebounceTimer);
        const username = usernameInput.value;
        if (username.length < 3) {
            usernameStatus.textContent = 'Mínimo 3 caracteres.';
            usernameStatus.className = 'status-error';
            return;
        }
        usernameStatus.textContent = 'Comprobando...';
        usernameStatus.className = 'status-checking';

        onboardingDebounceTimer = setTimeout(async () => {
            const check = await checkUsernameUniqueness(username, user.uid);
            usernameStatus.textContent = check.message;
            usernameStatus.className = check.unique ? 'status-success' : 'status-error';
        }, 500);
    });

    if (changePicBtn) {
        changePicBtn.addEventListener('click', () => picInput.click());
    }

    if (picInput) {
        picInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileToUpload = file;
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (picPreview) picPreview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            submitBtn.classList.add('is-loading');
            submitBtn.disabled = true;

            const formData = {
                displayName: displayNameInput.value,
                username: usernameInput.value,
                bio: document.getElementById('bioTextarea').value
            };

            try {
                const success = await completeOnboardingProfile(formData, fileToUpload);
                fileToUpload = null;
                if (success) {
                    navigate('/perfil');
                }
            } catch (error) {
                 console.error("Error en submit de bienvenida:", error);
            } finally {
                submitBtn.classList.remove('is-loading');
                submitBtn.disabled = false;
            }
        });
    }
}

export async function awardBadge(badgeId) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);

    try {
        await updateDoc(userDocRef, {
            badges: arrayUnion(badgeId)
        });

        const badgeNames = {
            'pionero_campana': 'Pionero de Campaña',
            'fan_favoritos': 'Fan de Favoritos'
        };

        const badgeName = badgeNames[badgeId] || 'Nueva Insignia';
        showToast(`¡Insignia obtenida: ${badgeName}!`, 'success');

        const badgesContainer = document.getElementById('badgesContainer');
        if (badgesContainer) {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                renderBadges(docSnap.data().badges || [], badgesContainer);
            }
        }
    } catch (error) {
        console.error("Error al otorgar la insignia:", error);
    }
}

export async function displayProfileInfo(user) {
    if (!user) return;

    const usernameEl = document.getElementById('profileUsername');
    const displayNameEl = document.getElementById('profileDisplayName');
    const emailEl = document.getElementById('profileEmail');
    const bioEl = document.getElementById('profileBioText');
    const picEl = document.getElementById('profilePictureImg');
    const badgesContainer = document.getElementById('badgesContainer');

    try {
        const profileDocRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);
        const docSnap = await getDoc(profileDocRef);

        if (docSnap.exists()) {
            const profileData = docSnap.data();
            if(usernameEl) usernameEl.textContent = profileData.username ? `@${profileData.username}` : '@usuario';
            if(displayNameEl) displayNameEl.textContent = profileData.displayName || 'Usuario';
            if(emailEl) emailEl.textContent = profileData.email;
            if(bioEl) bioEl.textContent = profileData.bio || 'Sin biografía.';
            if(picEl) picEl.src = profileData.photoURL || 'https://placehold.co/150x150/4CAF50/FFFFFF?text=LP';
            if(badgesContainer) renderBadges(profileData.badges || [], badgesContainer);
        } else {
            await createUserProfileDocument(user);
            displayProfileInfo(user);
        }
    } catch (error) {
        console.error("Error al obtener datos del perfil de Firestore:", error);
    }
}

export async function displayPublicProfileInfo(userId) {
    const profileContainer = document.getElementById('publicProfileContainer');
    const notFoundMessage = document.getElementById('profileNotFoundMessage');

    if (!profileContainer || !notFoundMessage) {
        console.error('Elementos HTML para perfil público no encontrados.');
        return;
    }

    profileContainer.style.display = 'block';
    notFoundMessage.style.display = 'none';

    try {
        const profileDocRef = doc(db, COLLECTIONS.USER_PROFILES, userId);
        const docSnap = await getDoc(profileDocRef);

        if (docSnap.exists()) {
            const profileData = docSnap.data();

            const usernameEl = document.getElementById('publicProfileUsername');
            const displayNameEl = document.getElementById('publicProfileDisplayName');
            const bioEl = document.getElementById('publicProfileBioText');
            const picEl = document.getElementById('publicProfilePictureImg');
            const badgesContainer = document.getElementById('publicBadgesContainer');

            if (usernameEl) usernameEl.textContent = profileData.username ? `@${profileData.username}` : '@usuario';
            if (displayNameEl) displayNameEl.textContent = profileData.displayName || 'Usuario Anónimo';
            if (bioEl) bioEl.textContent = profileData.bio || 'Este usuario aún no ha añadido una biografía.';
            if (picEl) picEl.src = profileData.photoURL || 'https://placehold.co/150x150/4CAF50/FFFFFF?text=LP';
            if (badgesContainer) {
                renderBadges(profileData.badges || [], badgesContainer);
            }

        } else {
            console.warn(`No se encontró perfil para ID: ${userId}`);
            profileContainer.style.display = 'none';
            notFoundMessage.style.display = 'flex';
        }
    } catch (error) {
        console.error("Error al obtener datos del perfil público:", error);
        showToast("No se pudo cargar la información del perfil.", "error");
    }
}

function renderBadges(badges, container) {
    if(!container) return;
    container.innerHTML = '';

    if (!badges || badges.length === 0) {
        container.innerHTML = '<p class="empty-state-text" style="text-align: center; width: 100%;">Aún no has ganado ninguna insignia. ¡Sigue explorando!</p>';
        return;
    }

    const badgeInfo = {
        fan_favoritos: { icon: '⭐', name: 'Fan de Favoritos' },
        pionero_campana: { icon: '🌳', name: 'Pionero de Campaña' }
    };

    badges.forEach(badgeId => {
        const badgeData = badgeInfo[badgeId];
        if (badgeData) {
            const badgeEl = document.createElement('div');
            badgeEl.className = 'badge';
            badgeEl.innerHTML = `<div class="badge-icon" title="${badgeData.name}">${badgeData.icon}</div><p>${badgeData.name}</p>`;
            container.appendChild(badgeEl);
        } else {
             console.warn(`Insignia desconocida encontrada: ${badgeId}`);
        }
    });
}