// js/ui/identifierUI.js

let cameraStream = null;

/**
 * Muestra una vista previa de la imagen seleccionada por el usuario.
 * @param {File} file - El archivo de imagen.
 */
export function renderImagePreview(file) {
    const preview = document.getElementById('imagePreview');
    const clearBtn = document.getElementById('clearPreviewBtn');
    const reader = new FileReader();
    reader.onload = e => {
        preview.src = e.target.result;
        preview.classList.add('has-image');
        clearBtn.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

/**
 * Limpia la vista previa de la imagen y los resultados.
 */
export function clearImagePreview() {
    document.getElementById('imagePreview').src = '';
    document.getElementById('imagePreview').classList.remove('has-image');
    document.getElementById('clearPreviewBtn').style.display = 'none';
    document.getElementById('resultsContainer').innerHTML = '';
    document.getElementById('uploadInput').value = '';
}

/**
 * Muestra un indicador de carga en el contenedor de resultados.
 */
export function showIdentifierLoading() {
    document.getElementById('resultsContainer').innerHTML = `<div class="result-card" style="text-align:center;"><div class="spinner"></div><p>Identificando...</p></div>`;
}

/**
 * Renderiza los resultados de la identificación de la planta.
 * @param {object[]} results - Los resultados de la API.
 * @param {string} source - La fuente de los resultados ('inaturalist' o 'error').
 */
export function renderIdentificationResults(results, source) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';
    if (source === 'error' || results.length === 0) {
        container.innerHTML = `<div class="result-card"><p>No se encontraron coincidencias. Intenta con otra foto.</p></div>`;
        return;
    }
    results.slice(0, 3).forEach(result => {
        const card = document.createElement('div');
        card.className = 'result-card';
        const taxon = result.taxon;
        const commonName = taxon.preferred_common_name ? taxon.preferred_common_name.charAt(0).toUpperCase() + taxon.preferred_common_name.slice(1) : taxon.name;
        const confidence = Math.round(result.vision_score * 100);
        card.innerHTML = `<h3>${commonName}</h3><p><i>${taxon.name}</i></p><p>Confianza: <strong>${confidence}%</strong></p>`;
        container.appendChild(card);
    });
}

/**
 * Abre la cámara del dispositivo para tomar una foto.
 */
export async function openCamera() {
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraFeed');
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = cameraStream;
        modal.classList.add('active');
    } catch (err) {
        // --- MODIFICACIÓN AQUÍ ---
        // Importamos dinámicamente desde modalUI.js en lugar de app.js
        import('./modalUI.js').then(modal => modal.showToast('No se pudo acceder a la cámara.', 'error'));
        // --- FIN DE MODIFICACIÓN ---
    }
}

/**
 * Cierra la cámara y libera el stream de video.
 */
export function closeCamera() {
    const modal = document.getElementById('cameraModal');
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    modal.classList.remove('active');
}