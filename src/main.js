/**
 * Main - Punto de entrada de la aplicación
 */

import { createScene } from './scene.js';

// Obtener el canvas
const canvas = document.getElementById("renderCanvas");
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const progressFill = document.getElementById("progressFill");

// Crear el motor de Babylon.js
const engine = new BABYLON.Engine(canvas, true, { 
    preserveDrawingBuffer: true, 
    stencil: true 
});

// Callback de progreso de carga
function updateLoadingProgress(progress, loaded, total) {
    progressFill.style.width = `${progress}%`;
    loadingText.textContent = `Cargando assets... ${loaded}/${total} (${Math.round(progress)}%)`;
}

// Función de inicialización
async function init() {
    try {
        // Crear la escena
        const { scene, assetManager, buildScene } = createScene(engine, canvas);

        // Cargar todos los assets
        loadingText.textContent = 'Cargando assets...';
        await assetManager.loadAll(updateLoadingProgress);

        // Construir la escena con los assets cargados
        buildScene();

        // Ocultar pantalla de carga
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 500);

        // Iniciar el loop de renderizado
        engine.runRenderLoop(() => {
            scene.render();
        });

        // Manejar redimensionamiento de ventana
        window.addEventListener("resize", () => {
            engine.resize();
        });

        console.log('✅ Aplicación iniciada correctamente');
        console.log('📊 Estadísticas de la escena:');
        console.log(`   - Meshes: ${scene.meshes.length}`);
        console.log(`   - Materiales: ${scene.materials.length}`);
        console.log(`   - Texturas: ${scene.textures.length}`);

    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
        loadingText.textContent = 'Error al cargar la aplicación';
        loadingText.style.color = '#ff4444';
    }
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Manejar cierre de página
window.addEventListener('beforeunload', () => {
    if (engine) {
        engine.dispose();
    }
});
