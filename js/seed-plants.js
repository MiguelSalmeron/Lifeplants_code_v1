// js/seed-plants.js
// ¡NUESTRO SCRIPT ROBOT DE MIGRACIÓN v3.0! 🦾✨
// Misión: Subir y SOBRESCRIBIR TODOS los archivos JSON a Firebase.

import { db } from './firebase-config.js';
import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

/**
 * Función Auxiliar 1: Migra colecciones desde un JSON que es un OBJETO.
 * (Ej: "plants.json", donde la clave "ajo" es el ID).
 */
async function migrateObjectCollection(collectionName, jsonPath) {
    console.log(`Iniciando migración para [${collectionName}] desde ${jsonPath}...`);

    // 1. OBTENER los datos
    const response = await fetch(jsonPath);
    const data = await response.json();

    // 2. MIGRAR (iterando sobre el OBJETO)
    let count = 0;
    for (const [key, item] of Object.entries(data)) {
        const docRef = doc(db, collectionName, key); // El 'key' es el ID
        // setDoc SIEMPRE sobrescribirá los datos existentes.
        await setDoc(docRef, item);
        count++;
    }
    console.log(`✅ ¡Éxito! Se migraron/sobrescribieron ${count} documentos a [${collectionName}].`);
}

/**
 * Función Auxiliar 2: Migra colecciones desde un JSON que es un ARRAY.
 * (Ej: "forums.json", donde buscamos el "id" DENTRO de cada objeto).
 */
async function migrateArrayCollection(collectionName, jsonPath) {
    console.log(`Iniciando migración para [${collectionName}] desde ${jsonPath}...`);

    // 1. OBTENER los datos
    const response = await fetch(jsonPath);
    const data = await response.json();

    // 2. MIGRAR (iterando sobre el ARRAY)
    let count = 0;
    for (const item of data) {
        if (!item.id) {
             console.error(`Error en ${jsonPath}: El objeto no tiene 'id'`, item);
             continue; // Salta este item si no tiene ID
        }
        const docRef = doc(db, collectionName, item.id); // El 'item.id' es el ID
        // setDoc SIEMPRE sobrescribirá los datos existentes.
        await setDoc(docRef, item);
        count++;
    }
    console.log(`✅ ¡Éxito! Se migraron/sobrescribieron ${count} documentos a [${collectionName}].`);
}

/**
 * Función Auxiliar 3: Migra un único archivo JSON a un único documento.
 * (Ej: "chatdata.json" se guardará como 1 documento llamado "chat").
 */
async function migrateSingleDoc(collectionName, docId, jsonPath) {
    console.log(`Iniciando migración para documento [${docId}] en [${collectionName}]...`);

    const docRef = doc(db, collectionName, docId);
    const response = await fetch(jsonPath);
    const data = await response.json();

    await setDoc(docRef, data); // Sobrescribe el documento

    console.log(`✅ ¡Éxito! Se migró ${jsonPath} a [${collectionName}/${docId}].`);
}


/**
 * Función Principal: Ejecuta todas las migraciones en paralelo.
 */
async function seedDatabase() {
    console.log("Iniciando SÚPER-MIGRACIÓN (Modo Sobrescribir)... ⏳");
    try {
        await Promise.all([
            // (Usamos Auxiliar 1 para plants.json)
            migrateObjectCollection('plants', '/plants.json'),

            // (Usamos Auxiliar 2 para los arrays)
            migrateArrayCollection('forums', '/forums.json'),
            migrateArrayCollection('communities', '/communities.json'),
            migrateArrayCollection('campaigns', '/campaigns.json'),

            // (Usamos Auxiliar 3 para chatdata.json)
            migrateSingleDoc('appData', 'chat', '/chatdata.json')
        ]);

        console.log("¡MISIÓN CUMPLIDA! 🚀🚀🚀 Todas las colecciones fueron sobrescritas.");

    } catch (error) {
        console.error("❌ ¡Alerta! Error fatal durante la migración: ", error);
    }
}

// 4. EJECUTAR la función
seedDatabase();