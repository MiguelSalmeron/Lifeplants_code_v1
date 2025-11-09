/**
 * PVZ-web/js/plant-identifier.js
 * Módulo simplificado y robusto para usar iNaturalist como API principal.
 */

// URL para la API de iNaturalist (nuestra única API por ahora)
const INATURALIST_API_URL = 'https://api.inaturalist.org/v1/computervision/score_image';

/**
 * --- FUNCIÓN PRINCIPAL DE IDENTIFICACIÓN ---
 * Se comunica con la API de iNaturalist para identificar una planta.
 * @param {File} file El archivo de imagen que sube el usuario.
 * @returns {Promise<Array>} Una promesa que se resuelve con los resultados de la identificación.
 */
export async function identifyWithInaturalist(file) {
    // FormData es la forma estándar de enviar archivos a una API
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(INATURALIST_API_URL, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    // Si la respuesta de la API no es exitosa, lanzamos un error
    if (!response.ok) {
        console.error('Respuesta de la API de iNaturalist:', data);
        throw new Error(data.error || `Error en la API: ${response.statusText}`);
    }

    // Devolvemos los 5 resultados más probables para tener opciones
    return data.results.slice(0, 5);
}