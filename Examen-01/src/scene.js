/**
 * Scene - Creación y configuración de la escena Babylon.js
 */
import { AssetManager } from './assetManager.js';
import { PlayerController } from './PlayerController.js';

const LIGHTING_CONFIG = {
    hemispheric: { intensity: 0.2, diffuse: [0.3, 0.4, 0.6], specular: [0.1, 0.1, 0.2], ground: [0.05, 0.05, 0.1] },
    moon: { intensity: 0.8, diffuse: [0.7, 0.8, 1.0], specular: [0.8, 0.9, 1.0], direction: [-0.3, -1, -0.4], position: [20, 30, 20] },
    points: [
        { pos: [8, 3, 8], intensity: 2.0, diffuse: [1.0, 0.6, 0.2], specular: [1.0, 0.8, 0.4], range: 20 },
        { pos: [-8, 3, -8], intensity: 1.8, diffuse: [0.2, 0.6, 1.0], specular: [0.4, 0.8, 1.0], range: 20 },
        { pos: [0, 4, 12], intensity: 1.5, diffuse: [0.6, 0.3, 0.8], specular: [0.8, 0.5, 1.0], range: 15 }
    ],
    fill: { intensity: 0.15, diffuse: [0.2, 0.15, 0.3] }
};

const CHARACTERS_CONFIG = [
    { name: 'Grim Reaper', key: 'grimReaper', pos: [28.53, -0.1, -18.84], rotY: Math.PI },
    { name: 'Leather Ghost', key: 'leatherGhost', pos: [7.18, -0.10, 71.63], rotY: 0 }
];

const toColor3 = arr => new BABYLON.Color3(...arr);
const toVector3 = arr => new BABYLON.Vector3(...arr);

export function createScene(engine, canvas) {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.15);
    const assetManager = new AssetManager(scene);

    // Cámara de tercera persona
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3.5, 12, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    Object.assign(camera, { lowerRadiusLimit: 5, upperRadiusLimit: 25, lowerBetaLimit: 0.2, upperBetaLimit: Math.PI / 2.2, wheelPrecision: 10, angularSensibilityX: 2000, angularSensibilityY: 2000, panningSensibility: 0 });
    camera.inputs.attached.mousewheel.wheelPrecision = 10;

    // Iluminación
    scene.environmentIntensity = 0.4;
    const hemiLight = new BABYLON.HemisphericLight("hemisphericLight", new BABYLON.Vector3(0, 1, 0), scene);
    Object.assign(hemiLight, { intensity: LIGHTING_CONFIG.hemispheric.intensity, diffuse: toColor3(LIGHTING_CONFIG.hemispheric.diffuse), specular: toColor3(LIGHTING_CONFIG.hemispheric.specular), groundColor: toColor3(LIGHTING_CONFIG.hemispheric.ground) });

    const moonLight = new BABYLON.DirectionalLight("moonLight", toVector3(LIGHTING_CONFIG.moon.direction), scene);
    Object.assign(moonLight, { position: toVector3(LIGHTING_CONFIG.moon.position), intensity: LIGHTING_CONFIG.moon.intensity, diffuse: toColor3(LIGHTING_CONFIG.moon.diffuse), specular: toColor3(LIGHTING_CONFIG.moon.specular) });

    const shadowGenerator = new BABYLON.ShadowGenerator(2048, moonLight);
    Object.assign(shadowGenerator, { useBlurExponentialShadowMap: true, blurKernel: 32, darkness: 0.4, depthScale: 50, bias: 0.00001 });

    LIGHTING_CONFIG.points.forEach((cfg, i) => {
        const pl = new BABYLON.PointLight(`pointLight${i + 1}`, toVector3(cfg.pos), scene);
        Object.assign(pl, { intensity: cfg.intensity, diffuse: toColor3(cfg.diffuse), specular: toColor3(cfg.specular), range: cfg.range, radius: 0.1 });
    });

    const fillLight = new BABYLON.HemisphericLight("fillLight", new BABYLON.Vector3(0, -1, 0), scene);
    Object.assign(fillLight, { intensity: LIGHTING_CONFIG.fill.intensity, diffuse: toColor3(LIGHTING_CONFIG.fill.diffuse), specular: new BABYLON.Color3(0, 0, 0) });

    // Niebla y efectos
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.02;
    scene.fogColor = new BABYLON.Color3(0.05, 0.08, 0.12);
    const glowLayer = new BABYLON.GlowLayer("glow", scene);
    glowLayer.intensity = 0.5;

    // Audio
    let audioInitialized = false;
    const initAudio = () => {
        if (audioInitialized) return;
        audioInitialized = true;
        console.log('🎵 Inicializando audio...');
        const audio = new Audio('./assets/sounds/La Ciudad Abandonada.mp3');
        audio.loop = true;
        audio.volume = 0.5;
        audio.addEventListener('canplaythrough', () => audio.play().then(() => console.log('✅ Audio reproduciendo')).catch(e => console.error('❌ Error audio:', e)));
        audio.addEventListener('error', e => console.error('❌ Error cargando audio:', e));
        audio.load();
    };
    scene.onPointerDown = initAudio;
    window.addEventListener('keydown', initAudio, { once: true });

    let playerController = null;

    const buildScene = () => {
        console.log('🏗️ Construyendo escena...');
        const mainSceneData = assetManager.getModel('mainScene');

        if (mainSceneData?.meshes) {
            console.log('✓ Escena principal cargada, meshes:', mainSceneData.meshes.length);
            const rootMesh = mainSceneData.meshes[0];
            rootMesh.position = BABYLON.Vector3.Zero();
            rootMesh.rotation = BABYLON.Vector3.Zero();
            rootMesh.scaling = new BABYLON.Vector3(1, 1, 1);

            mainSceneData.meshes.forEach(mesh => {
                mesh.isPickable = true;
                mesh.receiveShadows = true;
                if (mesh.material) {
                    mesh.material.specularPower = 32;
                    mesh.material.useSpecularOverAlpha = true;
                }
            });
        }

        playerController = new PlayerController(scene, camera);

        // Cargar personajes
        CHARACTERS_CONFIG.forEach(({ name, key, pos, rotY }) => {
            const data = assetManager.getModel(key);
            if (!data?.meshes) return;
            const rootMesh = data.meshes[0];
            rootMesh.position = toVector3(pos);
            rootMesh.rotation.y = rotY;
            rootMesh.scaling = new BABYLON.Vector3(1, 1, 1);
            data.meshes.forEach(mesh => { shadowGenerator.addShadowCaster(mesh); mesh.receiveShadows = false; });
            playerController.addCharacter({ name, rootMesh, animationGroups: data.animationGroups });
            console.log(`  ${name} posición:`, rootMesh.position);
        });

        if (playerController.characters.length > 0) playerController.setActiveCharacter(0);

        // Colisiones
        const walkableKeywords = ['ground', 'floor', 'terrain', 'road', 'path', 'street'];
        const collisionMeshes = mainSceneData?.meshes?.filter(mesh => {
            const n = mesh.name.toLowerCase();
            return mesh.name !== '__root__' && mesh.isVisible && !walkableKeywords.some(k => n.includes(k));
        }) || [];
        playerController.setCollisionMeshes(collisionMeshes);
        console.log(`🎯 Total meshes de colisión: ${collisionMeshes.length}`);

        // Música de fondo alternativa
        try {
            const bgMusic = new BABYLON.Sound("backgroundMusic", './assets/sounds/horror_ambience.mp3', scene,
                () => { console.log('🎵 Música cargada'); bgMusic.setVolume(0.3); bgMusic.play(); },
                { loop: true, autoplay: false, volume: 0.3 }
            );
        } catch { console.warn('⚠️ No se pudo cargar la música de fondo'); }

        scene.registerBeforeRender(() => playerController?.update());
        updateControlsUI(playerController);
        console.log('✅ Escena construida, personajes:', playerController.characters.length);
    };

    return { scene, assetManager, buildScene };
}

function updateControlsUI(playerController) {
    const controlsDiv = document.getElementById('controls');
    if (!controlsDiv) return;

    setInterval(() => {
        const info = playerController.getCurrentCharacterInfo();
        if (!info) return;
        const charInfo = document.getElementById('characterInfo');
        if (charInfo) charInfo.textContent = `${info.name} (${info.index + 1}/${info.total})`;
        ['X', 'Y', 'Z'].forEach(axis => {
            const el = document.getElementById(`pos${axis}`);
            if (el) el.textContent = info.position[axis.toLowerCase()].toFixed(2);
        });
    }, 100);
}

export async function loadCustomModel(assetManager, modelName, position = BABYLON.Vector3.Zero()) {
    try {
        const meshes = await assetManager.loadModel(modelName, 'models/', `${modelName}.glb`);
        if (meshes?.length) {
            meshes[0].position = position;
            meshes[0].scaling = new BABYLON.Vector3(1, 1, 1);
            return meshes[0];
        }
    } catch (error) { console.error(`Error cargando modelo ${modelName}:`, error); }
    return null;
}

export function playSound(assetManager, soundName) {
    const sound = assetManager.getSound(soundName);
    sound ? sound.play() : console.warn(`Sonido ${soundName} no encontrado`);
}
