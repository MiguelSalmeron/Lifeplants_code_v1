// js/data.js

// Importamos la base de datos (db) y las funciones de Firestore
import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";
import { COLLECTIONS, DOCUMENT_IDS } from './constants.js'; // <-- NUEVA IMPORTACIÓN

/**
 * Función Auxiliar 1: Obtiene una colección y la convierte en un OBJETO.
 * (Ej: 'plants', donde el ID del documento es la clave: "ajo": { ... }).
 * @param {string} collectionName - El nombre de la colección en Firestore.
 * @returns {Promise<object>} Un objeto con los datos.
 */
async function fetchObjectCollection(collectionName) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data = {};
    querySnapshot.forEach((doc) => {
        // Usa el ID del documento ("ajo", "arnica", etc.) como la clave
        data[doc.id] = doc.data();
    });
    return data;
}

/**
 * Función Auxiliar 2: Obtiene una colección y la convierte en un ARRAY.
 * (Ej: 'forums', 'communities', 'campaigns').
 * @param {string} collectionName - El nombre de la colección en Firestore.
 * @returns {Promise<Array>} Un array con los datos.
 */
async function fetchArrayCollection(collectionName) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data = [];
    querySnapshot.forEach((doc) => {
        data.push(doc.data());
    });
    return data;
}

/**
 * Función Auxiliar 3: Obtiene un ÚNICO documento.
 * (Ej: el documento "chat" de la colección "appData").
 * @param {string} collectionName - El nombre de la colección.
 * @param {string} docId - El ID del documento.
 * @returns {Promise<object>} El objeto de datos de ese documento.
 */
async function fetchSingleDoc(collectionName, docId) {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        console.warn(`Advertencia: No se encontró el documento en ${collectionName}/${docId}`);
        return {}; // Devuelve un objeto vacío si no se encuentra
    }
}


/**
 * Carga todos los datos iniciales de la aplicación en paralelo desde FIRESTORE.
 * @returns {Promise<object>} Un objeto que contiene todos los datos cargados.
 */
export async function fetchAllData() {
    try {
        // Ejecutamos todas las nuevas funciones de Firebase en paralelo usando las CONSTANTES
        const [plants, forums, communities, campaigns, chatData] = await Promise.all([
            fetchObjectCollection(COLLECTIONS.PLANTS),
            fetchArrayCollection(COLLECTIONS.FORUMS),
            fetchArrayCollection(COLLECTIONS.COMMUNITIES),
            fetchArrayCollection(COLLECTIONS.CAMPAIGNS),
            fetchSingleDoc(COLLECTIONS.APP_DATA, DOCUMENT_IDS.CHAT_DATA)
        ]);

        return {
            allPlants: plants,
            forums: forums,
            communities: communities,
            campaigns: campaigns,
            chatData: chatData
        };
    } catch (error) {
        console.error("Error crítico al cargar los datos desde Firestore:", error);
        throw error;
    }
}