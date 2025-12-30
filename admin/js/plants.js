import { db, storage } from '../../js/firebase-config.js';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

let unsubscribe = null; // Para detener la escucha de datos si cambiamos de vista

export function initPlantsModule(container) {
    container.innerHTML = ''; // Limpiar contenedor
    renderLayout(container);
    setupFormListeners();
    listenToPlants(document.getElementById('plantsListBody'));
}

// 1. Estructura General (Formulario + Tabla)
function renderLayout(container) {
    container.innerHTML = `
        <div class="admin-grid">
            <div class="card">
                <h3>🌿 Publicar Nueva Planta</h3>
                <form id="plantForm" class="admin-form">
                    
                    <div class="form-group">
                        <label>Nombre Común</label>
                        <input type="text" id="commonName" required placeholder="Ej: Monstera Deliciosa">
                    </div>
                    
                    <div class="form-group">
                        <label>Nombre Científico</label>
                        <input type="text" id="scientificName" required placeholder="Ej: Monstera deliciosa">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Familia</label>
                            <input type="text" id="family" placeholder="Ej: Araceae">
                        </div>
                        <div class="form-group">
                            <label>Dificultad</label>
                            <select id="difficulty">
                                <option value="Baja">🟢 Baja</option>
                                <option value="Media">🟡 Media</option>
                                <option value="Alta">🔴 Alta</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Luz</label>
                            <select id="lightReq">
                                <option value="Sombra">🌑 Sombra</option>
                                <option value="Semisombra">⛅ Semisombra</option>
                                <option value="Luz Directa">☀️ Luz Directa</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Riego</label>
                            <select id="waterReq">
                                <option value="Bajo">💧 Bajo (Cada 15 días)</option>
                                <option value="Medio">💧💧 Medio (Semanal)</option>
                                <option value="Alto">💧💧💧 Alto (Diario/Interdiario)</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Toxicidad (Mascotas)</label>
                            <select id="toxicity">
                                <option value="false">✅ Pet Friendly</option>
                                <option value="true">⚠️ Tóxica</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Clima Ideal</label>
                            <input type="text" id="climate" placeholder="Ej: Tropical húmedo">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Descripción / Usos</label>
                        <textarea id="description" rows="3" required placeholder="Describe la planta y sus usos..."></textarea>
                    </div>

                    <div class="form-group image-section">
                        <label>Imagen de la Planta</label>
                        <div class="image-tabs">
                            <button type="button" class="tab-btn active" onclick="window.switchImageInput('file')">Subir Archivo</button>
                            <button type="button" class="tab-btn" onclick="window.switchImageInput('url')">Usar URL</button>
                        </div>
                        
                        <div id="fileInputContainer" class="input-wrapper">
                            <input type="file" id="plantImageFile" accept="image/*">
                        </div>
                        
                        <div id="urlInputContainer" class="input-wrapper" style="display:none;">
                            <input type="url" id="plantImageUrl" placeholder="https://ejemplo.com/foto.jpg">
                        </div>

                        <div id="imagePreview" class="image-preview"></div>
                    </div>

                    <button type="submit" id="submitBtn" class="btn-primary">
                        <span class="material-symbols-outlined">add_circle</span>
                        Publicar Planta
                    </button>
                    <p id="uploadStatus" class="status-msg"></p>
                </form>
            </div>

            <div class="card">
                <h3>📋 Inventario de Plantas</h3>
                <div class="table-responsive">
                    <table class="plants-table">
                        <thead>
                            <tr>
                                <th>Foto</th>
                                <th>Nombre</th>
                                <th>Científico</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="plantsListBody">
                            <tr><td colspan="4" style="text-align:center;">Cargando plantas...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    injectStyles();
}

// 2. Lógica del Formulario y Subida
function setupFormListeners() {
    const form = document.getElementById('plantForm');
    const fileInput = document.getElementById('plantImageFile');
    const urlInput = document.getElementById('plantImageUrl');
    const preview = document.getElementById('imagePreview');
    const statusMsg = document.getElementById('uploadStatus');
    const submitBtn = document.getElementById('submitBtn');

    // Previsualización de Archivo
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => showPreview(evt.target.result);
            reader.readAsDataURL(file);
        }
    });

    // Previsualización de URL
    urlInput.addEventListener('input', (e) => {
        if (e.target.value.length > 10) showPreview(e.target.value);
    });

    function showPreview(src) {
        preview.style.display = 'block';
        preview.innerHTML = `<img src="${src}" alt="Preview">`;
    }

    // Envío del Formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        statusMsg.textContent = "Procesando...";

        try {
            let finalImageUrl = '';

            // 1. Determinar fuente de imagen
            const isFileMode = document.getElementById('fileInputContainer').style.display !== 'none';
            
            if (isFileMode && fileInput.files.length > 0) {
                // Subir archivo
                statusMsg.textContent = "Subiendo imagen a Storage...";
                const file = fileInput.files[0];
                const fileSafeName = file.name.replace(/[^\w.\-() ]+/g, '_');
                const storageRef = ref(storage, `plants/${Date.now()}_${fileSafeName}`);
                const snapshot = await uploadBytes(storageRef, file);
                finalImageUrl = await getDownloadURL(snapshot.ref);
            } else if (!isFileMode && urlInput.value.trim() !== '') {
                // Usar URL
                finalImageUrl = urlInput.value.trim();
            } else {
                throw new Error("Debes subir una imagen o poner una URL.");
            }

            // 2. Guardar en Firestore
            statusMsg.textContent = "Guardando datos...";
            
            await addDoc(collection(db, "plants"), {
                common_name: document.getElementById('commonName').value.trim(),
                scientific_name: document.getElementById('scientificName').value.trim(),
                family: document.getElementById('family').value.trim(),
                difficulty: document.getElementById('difficulty').value,
                
                // Nuevos campos
                light_requirements: document.getElementById('lightReq').value,
                water_frequency: document.getElementById('waterReq').value,
                is_toxic: document.getElementById('toxicity').value === 'true',
                climate: document.getElementById('climate').value.trim(),
                
                description: document.getElementById('description').value.trim(),
                image: finalImageUrl,
                created_at: serverTimestamp()
            });

            // 3. Reset
            statusMsg.textContent = "✅ ¡Guardado con éxito!";
            statusMsg.style.color = "green";
            form.reset();
            preview.style.display = 'none';
            setTimeout(() => {
                statusMsg.textContent = "";
                statusMsg.style.color = "inherit";
                submitBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error(error);
            statusMsg.textContent = "❌ Error: " + error.message;
            statusMsg.style.color = "red";
            submitBtn.disabled = false;
        }
    });

    // Función global para tabs de imagen
    window.switchImageInput = (type) => {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(t => t.classList.remove('active'));
        
        if (type === 'file') {
            tabs[0].classList.add('active'); // Primer botón es file
            document.getElementById('fileInputContainer').style.display = 'block';
            document.getElementById('urlInputContainer').style.display = 'none';
            document.getElementById('plantImageUrl').value = ''; 
        } else {
            tabs[1].classList.add('active'); // Segundo botón es url
            document.getElementById('fileInputContainer').style.display = 'none';
            document.getElementById('urlInputContainer').style.display = 'block';
            document.getElementById('plantImageFile').value = ''; 
        }
        document.getElementById('imagePreview').style.display = 'none';
    };
}

// 3. Sistema de Lista y Borrado (Tiempo Real)
function listenToPlants(tbody) {
    if (unsubscribe) unsubscribe();

    const q = query(collection(db, "plants"), orderBy("created_at", "desc"));

    unsubscribe = onSnapshot(q, (snapshot) => {
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay plantas registradas.</td></tr>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const plant = docSnap.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td><img src="${plant.image || 'https://via.placeholder.com/50'}" class="thumb-img"></td>
                <td><strong>${plant.common_name}</strong></td>
                <td><i>${plant.scientific_name}</i></td>
                <td>
                    <button class="btn-icon delete-btn" data-id="${docSnap.id}" title="Eliminar">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Agregar eventos de borrado
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
    });
}

async function handleDelete(e) {
    // Usamos currentTarget para asegurar que tomamos el botón y no el icono
    const id = e.currentTarget.dataset.id; 
    const confirmDelete = confirm("¿Seguro que quieres eliminar esta planta? Esta acción no se puede deshacer.");
    
    if (confirmDelete) {
        try {
            await deleteDoc(doc(db, "plants", id));
            // La tabla se actualiza sola gracias a onSnapshot
        } catch (error) {
            console.error("Error al borrar:", error);
            alert("Error al borrar: " + error.message);
        }
    }
}

// 4. Estilos inyectados
function injectStyles() {
    const styleId = 'admin-plants-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start; }
        @media(max-width: 900px) { .admin-grid { grid-template-columns: 1fr; } }
        
        .admin-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        
        input, select, textarea { 
            padding: 10px; border: 1px solid #ccc; border-radius: 6px; width: 100%; box-sizing: border-box;
        }
        
        .image-tabs { display: flex; gap: 10px; margin-bottom: 10px; }
        .tab-btn { 
            padding: 5px 15px; border: none; background: #eee; cursor: pointer; border-radius: 4px; font-size: 0.9rem;
        }
        .tab-btn.active { background: var(--primary-color, #4CAF50); color: white; font-weight: bold; }
        
        .image-preview { 
            margin-top: 10px; width: 100%; height: 200px; 
            border-radius: 8px; overflow: hidden; display: none; border: 2px dashed #ccc; background: #f9f9f9;
        }
        .image-preview img { width: 100%; height: 100%; object-fit: cover; }
        
        /* Tabla */
        .plants-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .plants-table th { text-align: left; padding: 10px; background: #f4f4f4; color: #333; font-size: 0.9rem; }
        .plants-table td { padding: 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
        .thumb-img { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        
        .btn-icon { background: none; border: none; cursor: pointer; padding: 5px; border-radius: 50%; transition: 0.2s; }
        .delete-btn { color: #dc3545; }
        .delete-btn:hover { background: #fee2e2; }
    `;
    document.head.appendChild(style);
}