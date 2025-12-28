import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { COLLECTIONS, DOCUMENT_IDS } from './constants.js';

function normalizeFirebaseStorageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (!url.includes('firebasestorage.googleapis.com')) return url;
    if (url.includes('alt=media')) return url;
    if (url.includes('?')) return url + '&alt=media';
    return url + '?alt=media';
}

async function fetchObjectCollection(collectionName) {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const data = {};
        querySnapshot.forEach((docSnap) => {
            const docData = docSnap.data() || {};
            const rawImage = docData.image || docData.imageCard || "";
            const normalizedImage = normalizeFirebaseStorageUrl(rawImage);

            data[docSnap.id] = {
                id: docSnap.id,
                ...docData,
                name: docData.common_name || docData.name || "Sin nombre",
                imageCard: normalizedImage || "images/logo2.png",
                scientificName: docData.scientific_name || docData.scientificName || "",
                whatIsItFor: docData.description || docData.whatIsItFor || "Información pendiente."
            };
        });
        return data;
    } catch (error) {
        console.error(`Error fetching object collection ${collectionName}:`, error);
        return {};
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
            console.warn(`Document not found: ${collectionName}/${docId}`);
            return {};
        }
    } catch (error) {
        console.error(`Error fetching document ${collectionName}/${docId}:`, error);
        return {};
    }
}

export async function fetchAllData() {
    try {
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
        console.error("Critical error loading initial data from Firestore:", error);
        return {
            allPlants: {},
            forums: [],
            communities: [],
            campaigns: [],
            campaigns: [],
            chatData: {}
        };
    }
}