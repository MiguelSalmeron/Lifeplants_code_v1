import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc, query, where, orderBy, startAfter, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { COLLECTIONS, DOCUMENT_IDS } from './constants.js';

function normalizeFirebaseStorageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (!url.includes('firebasestorage.googleapis.com')) return url;
    if (url.includes('alt=media')) return url;
    if (url.includes('?')) return url + '&alt=media';
    return url + '?alt=media';
}

function processPlantDoc(docSnap) {
    const docData = docSnap.data() || {};
    const rawImage = docData.image || docData.imageCard || "";
    const normalizedImage = normalizeFirebaseStorageUrl(rawImage);

    return {
        id: docSnap.id,
        ...docData,
        name: docData.common_name || docData.name || "Sin nombre",
        imageCard: normalizedImage || "images/logo2.png",
        scientificName: docData.scientific_name || docData.scientificName || "",
        whatIsItFor: docData.description || docData.whatIsItFor || "Información pendiente."
    };
}

// 1. Carga Inteligente de Plantas (Paginación + Filtros)
export async function fetchPlants({ lastVisible = null, pageSize = 10, filters = {} } = {}) {
    try {
        let q = collection(db, COLLECTIONS.PLANTS);
        
        // NOTA: Para búsquedas complejas (texto + filtros), Firestore requiere índices compuestos.
        // Aquí implementamos una búsqueda básica por nombre y orden alfabético.
        
        // Si hay texto de búsqueda, intentamos filtrar por nombre (Case-sensitive básico)
        if (filters.search) {
            // "starts-with" query
            const searchEnd = filters.search + '\uf8ff';
            q = query(q, 
                where('name', '>=', filters.search),
                where('name', '<=', searchEnd),
                orderBy('name'),
                limit(pageSize)
            );
        } else {
            // Carga normal ordenada
            q = query(q, orderBy('name'));
            
            // Filtros adicionales (solo si no es búsqueda de texto libre para evitar conflictos de índices complejos por ahora)
            if (filters.tipo && filters.tipo !== 'todos') {
                q = query(q, where('tipo', '==', filters.tipo));
            }
            if (filters.region && filters.region !== 'todos') {
                q = query(q, where('region', 'array-contains', filters.region));
            }
            if (filters.uso && filters.uso !== 'todos') {
                q = query(q, where('uso', 'array-contains', filters.uso));
            }

            // Paginación
            if (lastVisible) {
                q = query(q, startAfter(lastVisible));
            }
            
            q = query(q, limit(pageSize));
        }

        const querySnapshot = await getDocs(q);
        const plants = {};
        let newLastVisible = null;

        querySnapshot.forEach((docSnap) => {
            plants[docSnap.id] = processPlantDoc(docSnap);
            newLastVisible = docSnap; // El último procesado es el nuevo cursor
        });

        return {
            plants,
            lastVisible: newLastVisible,
            hasMore: querySnapshot.docs.length === pageSize
        };

    } catch (error) {
        console.error("Error fetching plants page:", error);
        return { plants: {}, lastVisible: null, hasMore: false };
    }
}

async function fetchArrayCollection(collectionName) {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const data = [];
        querySnapshot.forEach((docSnap) => {
            data.push({ id: docSnap.id, ...docSnap.data() });
        });
        return data;
    } catch (error) {
        console.error(`Error fetching array collection ${collectionName}:`, error);
        return [];
    }
}

async function fetchSingleDoc(collectionName, docId) {
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return {};
        }
    } catch (error) {
        console.error(`Error fetching document ${collectionName}/${docId}:`, error);
        return {};
    }
}

// 2. Carga Inicial (Solo datos ligeros, SIN plantas)
export async function fetchInitialData() {
    try {
        const [forums, communities, campaigns, chatData] = await Promise.all([
            fetchArrayCollection(COLLECTIONS.FORUMS),
            fetchArrayCollection(COLLECTIONS.COMMUNITIES),
            fetchArrayCollection(COLLECTIONS.CAMPAIGNS),
            fetchSingleDoc(COLLECTIONS.APP_DATA, DOCUMENT_IDS.CHAT_DATA)
        ]);

        return {
            forums,
            communities,
            campaigns,
            chatData
        };
    } catch (error) {
        console.error("Critical error loading initial data from Firestore:", error);
        return {
            forums: [],
            communities: [],
            campaigns: [],
            chatData: {}
        };
    }
}