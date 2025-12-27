import { db, storage } from '../../js/firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

export function initPlantsModule(container) {
    renderPlantForm(container);
    setupListeners();
}

function renderPlantForm(container) {
    container.innerHTML = `
        <div class="card">
            <h3>Nueva Planta</h3>
            <form id="plantForm" class="admin-form">
                <div class="form-group">
                    <label>Nombre Común</label>
                    <input type="text" id="commonName" required placeholder="Ej: Montera Deliciosa">
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
                        <select id="careLevel">
                            <option value="Baja">Baja</option>
                            <option value="Media">Media</option>
                            <option value="Alta">Alta</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="description" rows="4" required placeholder="Descripción detallada de la planta..."></textarea>
                </div>

                <div class="form-group">
                    <label>Imagen Principal</label>
                    <div class="file-upload-wrapper">
                        <input type="file" id="plantImage" accept="image/*" required>
                        <div id="imagePreview" class="image-preview"></div>
                    </div>
                </div>

                <button type="submit" id="submitBtn" class="btn-primary">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    Publicar Planta
                </button>
            </form>
            <p id="uploadStatus" class="status-msg"></p>
        </div>
    `;

    // Añadir estilos locales rápidos para este formulario
    const style = document.createElement('style');
    style.textContent = `
        .admin-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-row { display: flex; gap: 1rem; }
        .form-row .form-group { flex: 1; }
        input, select, textarea { 
            padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit;
        }
        .image-preview { 
            margin-top: 10px; max-width: 200px; max-height: 200px; 
            border-radius: 6px; overflow: hidden; display: none; border: 2px dashed #ccc;
        }
        .image-preview img { width: 100%; height: auto; display: block; }
        .status-msg { margin-top: 1rem; font-weight: bold; text-align: center; }
    `;
    container.appendChild(style);
}

function setupListeners() {
    const form = document.getElementById('plantForm');
    const imageInput = document.getElementById('plantImage');
    const preview = document.getElementById('imagePreview');
    const statusMsg = document.getElementById('uploadStatus');
    const submitBtn = document.getElementById('submitBtn');

    // Previsualizar imagen
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.style.display = 'block';
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Enviar formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Bloquear botón
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Subiendo...';
        statusMsg.textContent = "Subiendo imagen a Storage...";
        statusMsg.style.color = "blue";

        try {
            // 1. Obtener datos
            const file = imageInput.files[0];
            const commonName = document.getElementById('commonName').value;
            const scientificName = document.getElementById('scientificName').value;
            const family = document.getElementById('family').value;
            const careLevel = document.getElementById('careLevel').value;
            const description = document.getElementById('description').value;

            // 2. Subir imagen
            // Usamos Date.now() para evitar nombres duplicados
            const storageRef = ref(storage, `plants/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            statusMsg.textContent = "Imagen lista. Guardando en Firestore...";

            // 3. Guardar en Firestore
            await addDoc(collection(db, "plants"), {
                common_name: commonName,
                scientific_name: scientificName,
                family: family,
                difficulty: careLevel,
                description: description,
                image: downloadURL, // La URL de Firebase Storage
                created_at: serverTimestamp()
            });

            // 4. Éxito
            statusMsg.textContent = "✅ ¡Planta publicada correctamente!";
            statusMsg.style.color = "green";
            form.reset();
            preview.style.display = 'none';

            // Restaurar botón en 3 segundos
            setTimeout(() => {
                statusMsg.textContent = "";
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span class="material-symbols-outlined">cloud_upload</span> Publicar Planta';
            }, 3000);

        } catch (error) {
            console.error("Error al subir planta:", error);
            statusMsg.textContent = "❌ Error: " + error.message;
            statusMsg.style.color = "red";
            submitBtn.disabled = false;
            submitBtn.textContent = "Reintentar";
        }
    });
}