/**
 * Scene - Creación y configuración de la escena Babylon.js
 */

import { AssetManager } from './assetManager.js';

export function createScene(engine, canvas) {
    const scene = new BABYLON.Scene(engine);

    // Crear el gestor de assets
    const assetManager = new AssetManager(scene);

    // Configurar cámara
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -15), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);

    // Configurar luz
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.9;

    // Función para crear la escena después de cargar los assets
    const buildScene = () => {
        // ============================================
        // ESCENA DE EJEMPLO CON TUS TEXTURAS
        // ============================================
        
        // Caja con textura de madera
        const maderaMat = new BABYLON.StandardMaterial("maderaMat", scene);
        maderaMat.diffuseTexture = assetManager.getTexture('madera');

        const box = BABYLON.MeshBuilder.CreateBox("box", {size: 2}, scene);
        box.position = new BABYLON.Vector3(-4, 1, 0);
        box.material = maderaMat;

        // Esfera con textura de mármol
        const marmolMat = new BABYLON.StandardMaterial("marmolMat", scene);
        marmolMat.diffuseTexture = assetManager.getTexture('marmol');

        const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 2}, scene);
        sphere.position = new BABYLON.Vector3(-1.5, 1, 0);
        sphere.material = marmolMat;

        // Cilindro con textura de metal
        const metalMat = new BABYLON.StandardMaterial("metalMat", scene);
        metalMat.diffuseTexture = assetManager.getTexture('metal');

        const cylinder = BABYLON.MeshBuilder.CreateCylinder("cylinder", {height: 2, diameter: 1.5}, scene);
        cylinder.position = new BABYLON.Vector3(1.5, 1, 0);
        cylinder.material = metalMat;

        // Torus con textura de ladrillo
        const ladrilloMat = new BABYLON.StandardMaterial("ladrilloMat", scene);
        ladrilloMat.diffuseTexture = assetManager.getTexture('ladrillo');

        const torus = BABYLON.MeshBuilder.CreateTorus("torus", {diameter: 2, thickness: 0.5}, scene);
        torus.position = new BABYLON.Vector3(4, 1, 0);
        torus.material = ladrilloMat;

        // Suelo con textura de césped
        const cespedMat = new BABYLON.StandardMaterial("cespedMat", scene);
        cespedMat.diffuseTexture = assetManager.getTexture('cesped');
        cespedMat.diffuseTexture.uScale = 4;
        cespedMat.diffuseTexture.vScale = 4;

        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 12, height: 12}, scene);
        ground.material = cespedMat;

        // ============================================
        // MODELO YETI
        // ============================================
        // Cargar el modelo del Yeti
        const yetiMeshes = assetManager.getModel('yeti');
        if (yetiMeshes && yetiMeshes.length > 0) {
            const yeti = yetiMeshes[0];
            yeti.position = new BABYLON.Vector3(0, 0, 3);
            yeti.scaling = new BABYLON.Vector3(0.2, 0.2, 0.02); // Escalado para igualar tamaño de objetos
            yeti.rotation.y = Math.PI; // Girar 180 grados para que mire hacia la cámara
            
            console.log('✅ Modelo Yeti cargado');
        }

        // Animaciones
        scene.registerBeforeRender(() => {
            box.rotation.y += 0.005;
            sphere.rotation.y += 0.008;
            cylinder.rotation.y += 0.006;
            torus.rotation.x += 0.004;
            torus.rotation.y += 0.007;
        });

        console.log('✅ Escena construida correctamente');
    };

    // Retornar la escena y las funciones necesarias
    return {
        scene,
        assetManager,
        buildScene
    };
}

/**
 * Ejemplo de cómo cargar un modelo 3D personalizado
 * Descomenta y adapta según tus necesidades
 */
export async function loadCustomModel(assetManager, modelName, position = BABYLON.Vector3.Zero()) {
    try {
        // Ejemplo: cargar un modelo GLB/GLTF
        const meshes = await assetManager.loadModel(
            modelName,
            'models/',
            `${modelName}.glb`
        );

        if (meshes && meshes.length > 0) {
            const rootMesh = meshes[0];
            rootMesh.position = position;
            rootMesh.scaling = new BABYLON.Vector3(1, 1, 1);
            return rootMesh;
        }
    } catch (error) {
        console.error(`Error cargando modelo ${modelName}:`, error);
        return null;
    }
}

/**
 * Ejemplo de cómo reproducir un sonido
 */
export function playSound(assetManager, soundName) {
    const sound = assetManager.getSound(soundName);
    if (sound) {
        sound.play();
    } else {
        console.warn(`Sonido ${soundName} no encontrado`);
    }
}
