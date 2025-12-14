/**
 * Hormiga Trabajadora: Recoger y Entregar
 * Juego 3D en Babylon.js
 */

// CONFIGURACIÓN DEL JUEGO
const CONFIG = {
    POINTS: { popcorn: 100, chocolate: 50 },
    PICKUP_DISTANCE: 3.0,
    DELIVERY_DISTANCE: 4.0,
    WALK_SPEED: 8.0,
    RUN_SPEED: 15.0,
    ROTATION_SPEED: 15.0,
    
    PHYSICS: {
        ACCELERATION: 25.0,
        FRICTION: 12.0,
        GRAVITY: -30.0,
        GROUND_CHECK_DISTANCE: 2.0,
        MAX_FALL_SPEED: -50.0,
        COLLISION_RADIUS: 0.8
    },
    
    CAMERA: {
        DISTANCE: 12,
        HEIGHT_OFFSET: 2,
        SMOOTHNESS: 5.0,
        MIN_DISTANCE: 5,
        MAX_DISTANCE: 30,
        MIN_BETA: 0.2,
        MAX_BETA: Math.PI / 2.2
    },
    
    FOOD_COUNT: { popcorn: 5, chocolate: 5 },
    FOOD_POSITIONS: { popcorn: [], chocolate: [] },
    FOREST_BOUNDS: null,
    
    FLOAT_HEIGHT: {
        popcorn: { min: 1.25, max: 1.6 },
        chocolate: { min: 1.0, max: 1.6 }
    },
    
    CARRY_POSITION: {
        popcorn: { x: 0, y: 7.0, z: 1.23 },
        chocolate: { x: 0, y: 1.0, z: -0.2 }
    },
    
    ANTHILL_POSITION: { x: 97.02, y: -29.00, z: 0.22 },
    
    SCALES: { forest: 1, ant: 0.5, popcorn: 3.0, chocolate: 3.0, anthill: 30.0 }
};

// ESTADO DEL JUEGO
const gameState = {
    isCarryingFood: false,
    carriedFood: null,
    carriedFoodType: null,
    score: { popcorn: 0, chocolate: 0, total: 0 },
    nearFood: null,
    nearAnthill: false,
    foods: [],
    anthillMesh: null
};

// ELEMENTOS DEL DOM
const canvas = document.getElementById("renderCanvas");
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const progressFill = document.getElementById("progressFill");

// MOTOR DE BABYLON.JS
const engine = new BABYLON.Engine(canvas, true, { 
    preserveDrawingBuffer: true, 
    stencil: true,
    antialias: true
});

// VARIABLES GLOBALES
let scene, camera, antMesh, shadowGenerator, backgroundMusic;
let groundMeshes = [], obstacleMeshes = [];
let groundLevel = 0, antAnimations = null, isAntMoving = false;

// Sistema de física del personaje
const characterPhysics = {
    velocity: { x: 0, y: 0, z: 0 },
    targetVelocity: { x: 0, z: 0 },
    isGrounded: true,
    lastCameraTarget: null,
    lastDeltaTime: 0.016
};

// Estado de movimiento (input)
const moveState = { forward: false, backward: false, left: false, right: false, run: false };

// SISTEMA DE CARGA OPTIMIZADA DE MODELOS GLTF
const GLTFLoader = {
    setupOptimizedTextureLoading(engineInstance) {
        BABYLON.Texture.DEFAULT_SAMPLING_MODE = BABYLON.Texture.BILINEAR_SAMPLINGMODE;
        
        const originalCreateTexture = engineInstance.createTexture.bind(engineInstance);
        engineInstance.createTexture = function(url, noMipmap, invertY, scene, samplingMode, onLoad, onError, buffer, fallback, format, forcedExtension, mimeType, loaderOptions, creationFlags, useSRGBBuffer) {
            return originalCreateTexture(url, true, invertY, scene, BABYLON.Texture.BILINEAR_SAMPLINGMODE, 
                onLoad, onError, buffer, fallback, format, forcedExtension, mimeType, loaderOptions, creationFlags, useSRGBBuffer);
        };
        
        BABYLON.SceneLoader.OnPluginActivatedObservable.add((plugin) => {
            if (plugin.name === "gltf") {
                plugin.onParsedObservable.add(() => console.log('📦 GLTF parseado correctamente'));
            }
        });
        
        console.log('⚙️ Sistema de carga optimizada configurado');
    },
    
    fixAllSceneTextures(scene) {
        if (!scene?.textures) return;
        scene.textures.forEach(texture => {
            try { texture?.updateSamplingMode?.(BABYLON.Texture.BILINEAR_SAMPLINGMODE); } catch(e) {}
        });
        console.log(`🔧 Corregidas ${scene.textures.length} texturas`);
    },
    
    isPowerOfTwo: (value) => (value & (value - 1)) === 0 && value !== 0,
    
    fixMaterialTextures(material) {
        if (!material) return;
        
        const fixTexture = (texture) => {
            if (!texture) return;
            try {
                texture.updateSamplingMode(BABYLON.Texture.BILINEAR_SAMPLINGMODE);
                texture.wrapU = texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
            } catch(e) {}
        };
        
        const pbrProps = ['albedoTexture', 'bumpTexture', 'metallicTexture', 'reflectivityTexture', 
                          'ambientTexture', 'emissiveTexture', 'opacityTexture', 'microSurfaceTexture'];
        const stdProps = ['diffuseTexture', 'bumpTexture', 'specularTexture', 'ambientTexture',
                          'emissiveTexture', 'opacityTexture', 'reflectionTexture'];
        
        if (material instanceof BABYLON.PBRMaterial) {
            pbrProps.forEach(prop => fixTexture(material[prop]));
            material.backFaceCulling = false;
            material.forceIrradianceInFragment = true;
        }
        
        if (material instanceof BABYLON.StandardMaterial) {
            stdProps.forEach(prop => fixTexture(material[prop]));
            material.backFaceCulling = false;
        }
    },
    
    processMeshes(meshes, scene, options = {}) {
        const { receiveShadows = true, addToShadowCaster = true, useFallbackMaterial = false, 
                fallbackColor = new BABYLON.Color3(0.5, 0.5, 0.5) } = options;
        
        meshes.forEach(mesh => {
            mesh.receiveShadows = receiveShadows;
            mesh.isVisible = true;
            
            if (mesh.material) {
                if (useFallbackMaterial) {
                    const fallbackMat = new BABYLON.StandardMaterial("fallback_" + mesh.name, scene);
                    fallbackMat.diffuseColor = fallbackColor;
                    fallbackMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                    fallbackMat.backFaceCulling = false;
                    mesh.material = fallbackMat;
                } else {
                    this.fixMaterialTextures(mesh.material);
                }
            }
            
            if (addToShadowCaster && shadowGenerator) {
                shadowGenerator.addShadowCaster(mesh);
            }
        });
    },
    
    loadModel(rootUrl, fileName, scene, options = {}) {
        return new Promise((resolve, reject) => {
            const originalSamplingMode = BABYLON.Texture.DEFAULT_SAMPLING_MODE;
            BABYLON.Texture.DEFAULT_SAMPLING_MODE = BABYLON.Texture.BILINEAR_SAMPLINGMODE;
            
            BABYLON.SceneLoader.ImportMesh("", rootUrl, fileName, scene,
                (meshes, particleSystems, skeletons, animationGroups) => {
                    BABYLON.Texture.DEFAULT_SAMPLING_MODE = originalSamplingMode;
                    this.processMeshes(meshes, scene, options);
                    resolve({ meshes, particleSystems, skeletons, animationGroups });
                },
                options.onProgress || null,
                (scene, message, error) => {
                    BABYLON.Texture.DEFAULT_SAMPLING_MODE = originalSamplingMode;
                    console.error('❌ Error cargando modelo:', message);
                    reject(error || new Error(message));
                }
            );
        });
    },
    
    createEnvironmentTexture(scene, url) {
        try {
            const envTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(url, scene);
            scene.environmentTexture = envTexture;
            console.log('🌄 Environment texture HDR cargado');
            return envTexture;
        } catch(e) {
            console.warn('⚠️ No se pudo cargar HDR, usando fallback');
            scene.createDefaultEnvironment({ createSkybox: false, createGround: false });
            return null;
        }
    }
};

// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
async function init() {
    try {
        loadingText.textContent = 'Inicializando escena...';
        GLTFLoader.setupOptimizedTextureLoading(engine);
        
        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.4, 0.6, 0.9, 1.0);
        
        setupCamera();
        setupLighting();
        await loadAllModels();
        GLTFLoader.fixAllSceneTextures(scene);
        setupControls();
        setupAudio();
        
        scene.registerBeforeRender(updateGame);
        
        setTimeout(() => loadingScreen.classList.add('hidden'), 500);
        
        engine.runRenderLoop(() => scene.render());
        window.addEventListener("resize", () => engine.resize());
        
        console.log('✅ Juego iniciado -', scene.meshes.length, 'meshes');
    } catch (error) {
        console.error('❌ Error:', error);
        loadingText.textContent = 'Error al cargar el juego';
        loadingText.style.color = '#ff4444';
    }
}

// CONFIGURAR CÁMARA DE TERCERA PERSONA
function setupCamera() {
    const { DISTANCE, MIN_DISTANCE, MAX_DISTANCE, MIN_BETA, MAX_BETA } = CONFIG.CAMERA;
    
    camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, DISTANCE, 
        BABYLON.Vector3.Zero(), scene);
    
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = MIN_DISTANCE;
    camera.upperRadiusLimit = MAX_DISTANCE;
    camera.lowerBetaLimit = MIN_BETA;
    camera.upperBetaLimit = MAX_BETA;
    camera.wheelPrecision = 15;
    camera.angularSensibilityX = camera.angularSensibilityY = 1500;
    camera.panningSensibility = 0;
    camera.inertia = 0.9;
    camera.speed = 0.5;
    camera.checkCollisions = false;
    
    console.log('📷 Cámara configurada');
}

// CONFIGURAR ILUMINACIÓN AVANZADA
function setupLighting() {
    scene.environmentIntensity = 1.0;
    
    // Luz hemisférica (ambiente)
    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.6;
    hemiLight.diffuse = new BABYLON.Color3(0.9, 0.95, 1.0);
    hemiLight.specular = new BABYLON.Color3(0.5, 0.5, 0.5);
    hemiLight.groundColor = new BABYLON.Color3(0.3, 0.4, 0.2);
    
    // Luz direccional (sol) con sombras
    const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-0.5, -1, -0.3), scene);
    sunLight.position = new BABYLON.Vector3(30, 50, 30);
    sunLight.intensity = 1.5;
    sunLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.8);
    sunLight.specular = new BABYLON.Color3(1.0, 0.98, 0.9);
    
    // Generador de sombras
    shadowGenerator = new BABYLON.ShadowGenerator(2048, sunLight);
    Object.assign(shadowGenerator, {
        useBlurExponentialShadowMap: true, blurKernel: 64, darkness: 0.3,
        depthScale: 100, bias: 0.00001, normalBias: 0.01, useKernelBlur: true, blurBoxOffset: 2
    });
    
    // Luces puntuales de ambiente
    const createPointLight = (name, pos, intensity, color, range) => {
        const light = new BABYLON.PointLight(name, pos, scene);
        light.intensity = intensity;
        light.diffuse = color;
        light.range = range;
        return light;
    };
    
    createPointLight("pointLight1", new BABYLON.Vector3(10, 5, 10), 0.8, new BABYLON.Color3(1.0, 0.9, 0.7), 30);
    createPointLight("pointLight2", new BABYLON.Vector3(-10, 5, -10), 0.6, new BABYLON.Color3(0.7, 0.9, 1.0), 30);
    
    // Efectos visuales
    new BABYLON.GlowLayer("glow", scene).intensity = 0.3;
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.005;
    scene.fogColor = new BABYLON.Color3(0.7, 0.8, 0.9);
}

// VERIFICAR SI UNA POSICIÓN ESTÁ LIBRE DE OBSTÁCULOS
function isPositionAccessible(x, z) {
    const testHeight = 100;
    const checkRadius = 4;
    
    const castRay = (px, pz) => {
        const ray = new BABYLON.Ray(new BABYLON.Vector3(px, testHeight, pz), new BABYLON.Vector3(0, -1, 0), 200);
        return scene.pickWithRay(ray, mesh => obstacleMeshes.includes(mesh));
    };
    
    // Verificar posición central
    if (castRay(x, z)?.hit) return false;
    
    // Verificar en 4 direcciones
    const directions = [[checkRadius, 0], [-checkRadius, 0], [0, checkRadius], [0, -checkRadius]];
    return !directions.some(([dx, dz]) => castRay(x + dx, z + dz)?.hit);
}

// GENERAR POSICIONES ALEATORIAS DE ALIMENTOS
function generateFoodPositions() {
    const { x: centerX, z: centerZ } = CONFIG.ANTHILL_POSITION;
    const spreadRadius = 50;
    
    const findAccessiblePosition = (maxAttempts = 20) => {
        for (let i = 0; i < maxAttempts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + Math.random() * spreadRadius;
            const x = centerX + Math.cos(angle) * distance;
            const z = centerZ + Math.sin(angle) * distance;
            if (isPositionAccessible(x, z)) return { x, y: 0, z };
        }
        const fallbackAngle = Math.random() * Math.PI * 2;
        const fallbackDist = 8 + Math.random() * 15;
        return { x: centerX + Math.cos(fallbackAngle) * fallbackDist, y: 0, z: centerZ + Math.sin(fallbackAngle) * fallbackDist };
    };
    
    ['popcorn', 'chocolate'].forEach(type => {
        CONFIG.FOOD_POSITIONS[type] = Array.from({ length: CONFIG.FOOD_COUNT[type] }, findAccessiblePosition);
        console.log(`🎲 Generadas ${CONFIG.FOOD_COUNT[type]} posiciones de ${type}`);
    });
}

// CARGAR TODOS LOS MODELOS
async function loadAllModels() {
    loadingText.textContent = 'Cargando escenario...';
    await loadForest();
    generateFoodPositions();
    
    const totalModels = 3 + CONFIG.FOOD_POSITIONS.popcorn.length + CONFIG.FOOD_POSITIONS.chocolate.length;
    let loadedModels = 1;
    
    const updateProgress = (name) => {
        loadedModels++;
        progressFill.style.width = `${(loadedModels / totalModels) * 100}%`;
        loadingText.textContent = `Cargando: ${name}... (${loadedModels}/${totalModels})`;
    };
    
    updateProgress('Bosque');
    
    await loadAnthill();
    updateProgress('Hormiguero');
    
    await loadAnt();
    updateProgress('Hormiga');
    
    for (let i = 0; i < CONFIG.FOOD_POSITIONS.popcorn.length; i++) {
        await loadFood('popcorn', CONFIG.FOOD_POSITIONS.popcorn[i], i);
        updateProgress(`Palomitas ${i + 1}`);
    }
    
    for (let i = 0; i < CONFIG.FOOD_POSITIONS.chocolate.length; i++) {
        await loadFood('chocolate', CONFIG.FOOD_POSITIONS.chocolate[i], i);
        updateProgress(`Chocolate ${i + 1}`);
    }
}

// ============================================
// CARGAR ESCENARIO (FOREST)
// ============================================
async function loadForest() {
    try {
        const result = await GLTFLoader.loadModel(
            "./assets/models/Forest/",
            "scene.gltf",
            scene,
            { receiveShadows: true, addToShadowCaster: false }
        );
        
        const meshes = result.meshes;
        console.log('✓ Forest cargado:', meshes.length, 'meshes');
        
        const root = meshes[0];
        root.position = new BABYLON.Vector3(0, 0, 0);
        root.scaling = new BABYLON.Vector3(
            CONFIG.SCALES.forest,
            CONFIG.SCALES.forest,
            CONFIG.SCALES.forest
        );
        
        // Listar todos los nombres de mesh para debugging
        console.log('📋 Lista de meshes del forest:');
        meshes.forEach((mesh, idx) => {
            if (idx < 20) {
                console.log(`   ${idx}: ${mesh.name}`);
            }
        });
        
        // Configurar todos los meshes del escenario
        meshes.forEach(mesh => {
            mesh.receiveShadows = true;
            mesh.isPickable = true;
            
            // Corregir texturas de cada material
            if (mesh.material) {
                GLTFLoader.fixMaterialTextures(mesh.material, scene);
                
                if (mesh.material instanceof BABYLON.PBRMaterial) {
                    mesh.material.environmentIntensity = 1.0;
                    mesh.material.directIntensity = 1.5;
                }
            }
            
            const meshName = mesh.name.toLowerCase();
            
            // Detectar meshes del suelo por nombre
            if (meshName.includes('ground') || 
                meshName.includes('floor') || 
                meshName.includes('terrain') ||
                meshName.includes('lake') ||
                meshName.includes('meadow') ||
                meshName.includes('grass') ||
                meshName.includes('plane') ||
                meshName.includes('suelo')) {
                groundMeshes.push(mesh);
            }
            
            // Detectar obstáculos sólidos
            if (meshName.includes('rock') || 
                meshName.includes('tree') ||
                meshName.includes('birch') ||
                meshName.includes('pine') ||
                meshName.includes('oak') ||
                meshName.includes('trunk') ||
                meshName.includes('stump') ||
                meshName.includes('log') ||
                meshName.includes('stone') ||
                meshName.includes('boulder') ||
                meshName.includes('mountain') ||
                meshName.includes('forest')) {
                mesh.checkCollisions = true;
                mesh.isPickable = true;
                obstacleMeshes.push(mesh);
            }
        });
        
        console.log('📊 Total meshes de suelo detectados:', groundMeshes.length);
        console.log('🪨 Total obstáculos detectados:', obstacleMeshes.length);
        
        // Calcular bounding box del forest (perímetro completo)
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let minY = Infinity;
        let foundGroundMesh = null;
        
        // Analizar todos los meshes para encontrar límites
        meshes.forEach(mesh => {
            if (mesh.getTotalVertices && mesh.getTotalVertices() > 0) {
                mesh.computeWorldMatrix(true);
                const boundingInfo = mesh.getBoundingInfo();
                const worldMin = boundingInfo.boundingBox.minimumWorld;
                const worldMax = boundingInfo.boundingBox.maximumWorld;
                
                // Actualizar límites X y Z
                minX = Math.min(minX, worldMin.x);
                maxX = Math.max(maxX, worldMax.x);
                minZ = Math.min(minZ, worldMin.z);
                maxZ = Math.max(maxZ, worldMax.z);
                
                // Buscar nivel del suelo
                if (groundMeshes.includes(mesh) && worldMax.y < minY && worldMax.y > -100) {
                    minY = worldMax.y;
                    foundGroundMesh = mesh;
                }
            }
        });
        
        console.log('🗺️ Perímetro del forest calculado:');
        console.log(`   X: ${minX.toFixed(2)} a ${maxX.toFixed(2)} (ancho: ${(maxX - minX).toFixed(2)})`);
        console.log(`   Z: ${minZ.toFixed(2)} a ${maxZ.toFixed(2)} (largo: ${(maxZ - minZ).toFixed(2)})`);
        
        if (foundGroundMesh) {
            groundLevel = minY;
            console.log('📍 Nivel del suelo detectado desde mesh:', foundGroundMesh.name, 'Y:', groundLevel);
        } else {
            console.log('⚠️ Creando suelo de fallback...');
            const fallbackGround = BABYLON.MeshBuilder.CreateGround(
                "fallbackGround",
                { width: 200, height: 200 },
                scene
            );
            fallbackGround.position.y = -30;
            fallbackGround.isPickable = true;
            fallbackGround.visibility = 0;
            groundMeshes.push(fallbackGround);
            groundLevel = -30;
        }
        
        console.log('📍 Nivel del suelo final:', groundLevel);
        
        // Guardar perímetro para distribución de objetos
        CONFIG.FOREST_BOUNDS = { minX, maxX, minZ, maxZ };
        
        return meshes;
        
    } catch (error) {
        console.error('Error cargando Forest:', error);
        throw error;
    }
}

// DETECTAR NIVEL DEL SUELO CON RAYCAST
function detectGroundLevel(x, z) {
    return getGroundHeight(x, z, true);
}

// OBTENER ALTURA DEL SUELO EN POSICIÓN
function getGroundHeight(x, z, verbose = false) {
    const ray = new BABYLON.Ray(new BABYLON.Vector3(x, 500, z), new BABYLON.Vector3(0, -1, 0), 1000);
    const excludeNames = ['tree', 'flower', 'mushroom', 'rock', 'bush'];
    const groundNames = ['ground', 'floor', 'terrain', 'lake', 'meadow', 'grass', 'plane'];
    
    // Intentar con meshes de suelo identificados
    let hit = scene.pickWithRay(ray, mesh => groundMeshes.includes(mesh) && mesh.isPickable);
    if (hit?.hit) {
        if (verbose) console.log('  Raycast hit (suelo):', hit.pickedMesh.name, 'Y:', hit.pickedPoint.y);
        return hit.pickedPoint.y;
    }
    
    // Fallback: cualquier mesh que parezca suelo
    hit = scene.pickWithRay(ray, mesh => {
        const name = mesh.name.toLowerCase();
        return mesh.isPickable && 
               (groundNames.some(g => name.includes(g)) || !excludeNames.some(e => name.includes(e)));
    });
    
    if (hit?.hit) {
        if (verbose) console.log('  Raycast hit (otro):', hit.pickedMesh.name, 'Y:', hit.pickedPoint.y);
        return hit.pickedPoint.y;
    }
    
    if (verbose) console.log('  Raycast no encontró suelo en:', x, z);
    return groundLevel;
}

// VERIFICAR COLISIÓN CON OBSTÁCULOS
function checkCollision(newX, newZ, currentX, currentZ) {
    if (!antMesh) return false;
    
    const dirX = newX - currentX, dirZ = newZ - currentZ;
    const distance = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (distance < 0.001) return false;
    
    const normalizedDir = new BABYLON.Vector3(dirX / distance, 0, dirZ / distance);
    const rayHeight = antMesh.position.y + 0.5;
    
    const checkRay = (yOffset) => {
        const ray = new BABYLON.Ray(
            new BABYLON.Vector3(currentX, rayHeight + yOffset, currentZ),
            normalizedDir, distance + 0.5
        );
        const hit = scene.pickWithRay(ray, mesh => obstacleMeshes.includes(mesh));
        return hit?.hit && hit.distance < distance + 0.3;
    };
    
    return checkRay(0) || checkRay(-0.3);
}

// CARGAR HORMIGUERO (ANTHILL)
async function loadAnthill() {
    try {
        const result = await GLTFLoader.loadModel("./assets/models/anthill/", "scene.gltf", scene, { 
            receiveShadows: true, addToShadowCaster: true, useFallbackMaterial: true,
            fallbackColor: new BABYLON.Color3(0.55, 0.35, 0.2)
        });
        
        const { meshes } = result;
        const root = meshes[0];
        const { x, y, z } = CONFIG.ANTHILL_POSITION;
        const scale = CONFIG.SCALES.anthill;
        
        root.position = new BABYLON.Vector3(x, y, z);
        root.scaling = new BABYLON.Vector3(scale, scale, scale);
        gameState.anthillMesh = root;
        
        meshes.forEach(mesh => {
            if (mesh !== root && mesh.getTotalVertices?.() > 0) {
                mesh.checkCollisions = mesh.isPickable = true;
                obstacleMeshes.push(mesh);
            }
        });
        
        // Zona de entrega visual
        const deliveryZone = BABYLON.MeshBuilder.CreateDisc("deliveryZone", 
            { radius: CONFIG.DELIVERY_DISTANCE, tessellation: 64 }, scene);
        deliveryZone.position = new BABYLON.Vector3(x, y + 0.1, z);
        deliveryZone.rotation.x = Math.PI / 2;
        
        const zoneMat = new BABYLON.StandardMaterial("zoneMat", scene);
        Object.assign(zoneMat, {
            diffuseColor: new BABYLON.Color3(0.2, 0.8, 0.2),
            emissiveColor: new BABYLON.Color3(0.1, 0.4, 0.1),
            alpha: 0.3, backFaceCulling: false
        });
        deliveryZone.material = zoneMat;
        
        console.log('✅ Anthill cargado y posicionado');
        return meshes;
    } catch (error) {
        console.error('Error cargando Anthill:', error);
        throw error;
    }
}

// CARGAR HORMIGA (WORKER ANT)
async function loadAnt() {
    try {
        const result = await GLTFLoader.loadModel("./assets/models/worker_ant_animation/", "scene.gltf", scene,
            { receiveShadows: true, addToShadowCaster: true });
        
        const { meshes, animationGroups } = result;
        const root = meshes[0];
        const startX = CONFIG.ANTHILL_POSITION.x + 10;
        const startZ = CONFIG.ANTHILL_POSITION.z;
        const scale = CONFIG.SCALES.ant;
        
        root.position = new BABYLON.Vector3(startX, getGroundHeight(startX, startZ), startZ);
        root.scaling = new BABYLON.Vector3(scale, scale, scale);
        root.rotation.y = 0;
        antMesh = root;
        
        if (animationGroups.length > 0) {
            animationGroups.forEach(anim => anim.stop());
            const walkAnim = animationGroups.find(a => a.name.toLowerCase().includes('walk')) || animationGroups[0];
            antAnimations = { walk: walkAnim, all: animationGroups };
        }
        
        camera.setTarget(root.position);
        console.log('✅ Hormiga cargada y posicionada');
        return meshes;
    } catch (error) {
        console.error('Error cargando Ant:', error);
        throw error;
    }
}

// CARGAR ALIMENTOS
async function loadFood(type, position, index) {
    const isPopcorn = type === 'popcorn';
    const modelPath = isPopcorn ? "./assets/models/golden_caramel_pop_corn/" : "./assets/models/lindt_chocolate_reindeer/";
    const scale = CONFIG.SCALES[type];
    const modelYOffset = isPopcorn ? 0.45 * scale : 0;
    
    try {
        const { meshes } = await GLTFLoader.loadModel(modelPath, "scene.gltf", scene,
            { receiveShadows: true, addToShadowCaster: true });
        
        const root = meshes[0];
        meshes.forEach(m => { m.isVisible = true; m.setEnabled(true); });
        
        const foodGroundY = getGroundHeight(position.x, position.z);
        const adjustedY = foodGroundY + modelYOffset;
        
        root.position = new BABYLON.Vector3(position.x, adjustedY, position.z);
        root.scaling = new BABYLON.Vector3(scale, scale, scale);
        
        // Helper para crear animaciones
        const createAnim = (name, prop, fps, keys, loopFrames) => {
            const anim = new BABYLON.Animation(name, prop, fps, 
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
            anim.setKeys(keys);
            root.animations.push(anim);
            scene.beginAnimation(root, 0, loopFrames, true);
        };
        
        const { min, max } = CONFIG.FLOAT_HEIGHT[type];
        createAnim(`float_${type}_${index}`, "position.y", 30,
            [{ frame: 0, value: adjustedY + min }, { frame: 30, value: adjustedY + max }, { frame: 60, value: adjustedY + min }], 60);
        createAnim(`rotate_${type}_${index}`, "rotation.y", 30,
            [{ frame: 0, value: 0 }, { frame: 120, value: Math.PI * 2 }], 120);
        
        gameState.foods.push({
            mesh: root, type, points: CONFIG.POINTS[type],
            originalPosition: { x: position.x, y: adjustedY, z: position.z }, collected: false
        });
        
        return meshes;
    } catch (error) {
        console.error(`Error cargando ${type}:`, error);
        throw error;
    }
}

// CONFIGURAR CONTROLES
function setupControls() {
    const keyMap = { w: 'forward', s: 'backward', a: 'left', d: 'right', shift: 'run' };
    
    scene.onKeyboardObservable.add((kbInfo) => {
        const key = kbInfo.event.key.toLowerCase();
        const isPressed = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
        
        if (keyMap[key]) {
            moveState[keyMap[key]] = isPressed;
        } else if (isPressed) {
            if (key === 'e') handleInteraction();
            if (key === 'i') toggleControls();
        }
    });
}

// CONFIGURAR AUDIO
function setupAudio() {
    let audioInitialized = false;
    
    const initAudio = () => {
        if (audioInitialized) return;
        audioInitialized = true;
        
        const audio = new Audio('./assets/sounds/Sonidos Del Bosque.mp3');
        audio.loop = true;
        audio.volume = 0.4;
        audio.addEventListener('canplaythrough', () => 
            audio.play().catch(err => console.error('Error audio:', err)));
        audio.load();
        backgroundMusic = audio;
    };
    
    scene.onPointerDown = initAudio;
    window.addEventListener('keydown', initAudio, { once: true });
}

// LOOP DE ACTUALIZACIÓN DEL JUEGO
function updateGame() {
    if (!antMesh) return;
    const deltaTime = Math.min(engine.getDeltaTime() / 1000, 0.1);
    characterPhysics.lastDeltaTime = deltaTime;
    
    updateMovementWithPhysics(deltaTime);
    updateCameraSmooth(deltaTime);
    checkProximity();
    updateUI();
}

// ACTUALIZAR MOVIMIENTO CON FÍSICA
function updateMovementWithPhysics(deltaTime) {
    // Procesar input
    let inputX = (moveState.right ? 1 : 0) - (moveState.left ? 1 : 0);
    let inputZ = (moveState.forward ? 1 : 0) - (moveState.backward ? 1 : 0);
    const hasInput = inputX !== 0 || inputZ !== 0;
    
    let worldMoveDirection = BABYLON.Vector3.Zero();
    
    if (hasInput) {
        const mag = Math.sqrt(inputX * inputX + inputZ * inputZ);
        inputX /= mag; inputZ /= mag;
        
        const camFwd = camera.getForwardRay().direction;
        const forward = new BABYLON.Vector3(camFwd.x, 0, camFwd.z).normalize();
        const right = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), forward).normalize();
        worldMoveDirection = forward.scale(inputZ).add(right.scale(inputX));
        if (worldMoveDirection.length() > 0.001) worldMoveDirection.normalize();
    }
    
    // Velocidad objetivo
    const targetSpeed = moveState.run ? CONFIG.RUN_SPEED : CONFIG.WALK_SPEED;
    characterPhysics.targetVelocity.x = hasInput ? worldMoveDirection.x * targetSpeed : 0;
    characterPhysics.targetVelocity.z = hasInput ? worldMoveDirection.z * targetSpeed : 0;
    
    // Aplicar aceleración/fricción
    const { ACCELERATION, FRICTION, GRAVITY, MAX_FALL_SPEED } = CONFIG.PHYSICS;
    
    if (hasInput) {
        const accel = Math.min(ACCELERATION * deltaTime, 1.0);
        characterPhysics.velocity.x += (characterPhysics.targetVelocity.x - characterPhysics.velocity.x) * accel;
        characterPhysics.velocity.z += (characterPhysics.targetVelocity.z - characterPhysics.velocity.z) * accel;
    } else {
        const friction = Math.max(1.0 - FRICTION * deltaTime, 0.0);
        characterPhysics.velocity.x *= friction;
        characterPhysics.velocity.z *= friction;
        
        const hSpeed = Math.hypot(characterPhysics.velocity.x, characterPhysics.velocity.z);
        if (hSpeed < 0.1) characterPhysics.velocity.x = characterPhysics.velocity.z = 0;
    }
    
    // Gravedad
    if (!characterPhysics.isGrounded) {
        characterPhysics.velocity.y = Math.max(characterPhysics.velocity.y + GRAVITY * deltaTime, MAX_FALL_SPEED);
    }
    
    // Calcular nueva posición
    const { x: curX, y: curY, z: curZ } = antMesh.position;
    const newX = curX + characterPhysics.velocity.x * deltaTime;
    const newZ = curZ + characterPhysics.velocity.z * deltaTime;
    let newY = curY + characterPhysics.velocity.y * deltaTime;
    
    // Colisiones horizontales con deslizamiento
    let [finalX, finalZ] = [newX, newZ];
    if (checkCollision(newX, newZ, curX, curZ)) {
        if (!checkCollision(newX, curZ, curX, curZ)) {
            finalX = newX; finalZ = curZ; characterPhysics.velocity.z = 0;
        } else if (!checkCollision(curX, newZ, curX, curZ)) {
            finalX = curX; finalZ = newZ; characterPhysics.velocity.x = 0;
        } else {
            finalX = curX; finalZ = curZ;
            characterPhysics.velocity.x = characterPhysics.velocity.z = 0;
        }
    }
    
    // Colisión con suelo
    const groundY = getGroundHeight(finalX, finalZ);
    if (newY <= groundY) {
        newY = groundY; characterPhysics.velocity.y = 0; characterPhysics.isGrounded = true;
    } else {
        characterPhysics.isGrounded = newY <= groundY + 0.1;
        if (characterPhysics.isGrounded) newY = groundY;
    }
    
    // Aplicar posición
    antMesh.position.set(finalX, newY, finalZ);
    
    // Rotar personaje
    const hVel = Math.hypot(characterPhysics.velocity.x, characterPhysics.velocity.z);
    if (hVel > 0.5) {
        const targetRot = Math.atan2(characterPhysics.velocity.x, characterPhysics.velocity.z);
        if (antMesh.rotationQuaternion) {
            antMesh.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, targetRot);
        } else {
            antMesh.rotation.y = targetRot;
        }
    }
    
    updateCharacterAnimation(hVel);
}

// INTERPOLACIÓN DE ÁNGULOS
function lerpAngle(current, target, t) {
    let diff = target - current;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return current + diff * Math.min(t, 1.0);
}

// ACTUALIZAR ANIMACIONES DEL PERSONAJE
function updateCharacterAnimation(speed) {
    const isNowMoving = speed > 0.5;
    if (isNowMoving !== isAntMoving && antAnimations?.walk) {
        isNowMoving ? antAnimations.walk.start(true) : antAnimations.walk.stop();
        isAntMoving = isNowMoving;
    }
}

// ACTUALIZAR CÁMARA CON SEGUIMIENTO SUAVE
function updateCameraSmooth(deltaTime) {
    if (!antMesh) return;
    
    const targetPos = antMesh.position.add(new BABYLON.Vector3(0, CONFIG.CAMERA.HEIGHT_OFFSET, 0));
    
    if (!characterPhysics.lastCameraTarget) {
        characterPhysics.lastCameraTarget = targetPos.clone();
        camera.setTarget(targetPos);
        return;
    }
    
    const smooth = Math.min(CONFIG.CAMERA.SMOOTHNESS * deltaTime, 1.0);
    const last = characterPhysics.lastCameraTarget;
    last.x += (targetPos.x - last.x) * smooth;
    last.y += (targetPos.y - last.y) * smooth;
    last.z += (targetPos.z - last.z) * smooth;
    camera.setTarget(last);
}

// VERIFICAR PROXIMIDAD
function checkProximity() {
    const antPos = antMesh.position;
    gameState.nearFood = null;
    gameState.nearAnthill = false;
    
    const anthillPos = new BABYLON.Vector3(CONFIG.ANTHILL_POSITION.x, antPos.y, CONFIG.ANTHILL_POSITION.z);
    gameState.nearAnthill = BABYLON.Vector3.Distance(antPos, anthillPos) < CONFIG.DELIVERY_DISTANCE;
    
    if (!gameState.isCarryingFood) {
        gameState.nearFood = gameState.foods.find(f => 
            !f.collected && BABYLON.Vector3.Distance(antPos, f.mesh.position) < CONFIG.PICKUP_DISTANCE
        ) || null;
    }
}

// MANEJAR INTERACCIÓN (TECLA E)
function handleInteraction() {
    if (gameState.isCarryingFood) {
        gameState.nearAnthill ? deliverFood() : console.log('⚠️ Debes estar cerca del hormiguero');
    } else if (gameState.nearFood) {
        pickupFood(gameState.nearFood);
    }
}

// RECOGER ALIMENTO
function pickupFood(food) {
    gameState.isCarryingFood = true;
    gameState.carriedFood = food;
    gameState.carriedFoodType = food.type;
    food.collected = true;
    
    scene.stopAnimation(food.mesh);
    food.mesh.parent = antMesh;
    
    const { x, y, z } = CONFIG.CARRY_POSITION[food.type];
    food.mesh.position = new BABYLON.Vector3(x, y, z);
    
    if (food.mesh.rotationQuaternion) {
        food.mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
    } else {
        food.mesh.rotation = BABYLON.Vector3.Zero();
    }
    
    food.originalScale = food.originalScale || food.mesh.scaling.clone();
    food.mesh.scaling = food.originalScale.scale(2.5);
    
    createPickupEffect(food.mesh.absolutePosition);
}

// ENTREGAR ALIMENTO
function deliverFood() {
    const food = gameState.carriedFood;
    if (!food) return;
    
    new Audio('./assets/sounds/logro.mp3').play().catch(() => {});
    
    gameState.score[food.type]++;
    gameState.score.total += food.points;
    
    food.mesh.parent = null;
    food.mesh.dispose();
    
    gameState.isCarryingFood = false;
    gameState.carriedFood = gameState.carriedFoodType = null;
    
    createDeliveryEffect();
    updateScoreUI();
    checkGameComplete();
}

// VERIFICAR SI EL JUEGO ESTÁ COMPLETO
function checkGameComplete() {
    const { popcorn, chocolate } = CONFIG.FOOD_COUNT;
    if (gameState.score.popcorn + gameState.score.chocolate >= popcorn + chocolate) {
        showVictoryScreen();
    }
}

// MOSTRAR PANTALLA DE VICTORIA
function showVictoryScreen() {
    const { popcorn, chocolate, total } = gameState.score;
    
    const overlay = document.createElement('div');
    overlay.id = 'victoryScreen';
    overlay.innerHTML = `
        <style>
            #victoryScreen { position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:2000; animation:fadeIn 0.5s; }
            @keyframes fadeIn { from{opacity:0} to{opacity:1} }
            @keyframes scaleIn { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
            .victory-content { background:linear-gradient(135deg,#2d5016,#1a3009); padding:40px 60px; border-radius:20px; text-align:center; border:3px solid #8bc34a; box-shadow:0 0 50px rgba(139,195,74,0.5); animation:scaleIn 0.5s; }
            .victory-content h1 { color:#ffc107; font-size:36px; margin:0 0 20px; text-shadow:2px 2px 4px rgba(0,0,0,0.5); }
            .victory-content p { color:#c8e6c9; font-size:20px; margin:0 0 30px; }
            .final-score { background:rgba(0,0,0,0.3); padding:20px 30px; border-radius:10px; margin-bottom:30px; }
            .final-score div { color:white; font-size:18px; margin:10px 0; }
            .final-score .total { color:#ffc107; font-size:24px; font-weight:bold; border-top:1px solid rgba(255,255,255,0.3); padding-top:15px; margin-top:15px; }
            #playAgainBtn { background:linear-gradient(135deg,#4caf50,#2e7d32); color:white; border:none; padding:15px 40px; font-size:20px; font-weight:bold; border-radius:30px; cursor:pointer; transition:all 0.3s; box-shadow:0 4px 15px rgba(76,175,80,0.4); }
            #playAgainBtn:hover { background:linear-gradient(135deg,#66bb6a,#388e3c); transform:scale(1.05); }
        </style>
        <div class="victory-content">
            <h1>🎉 ¡FELICITACIONES! 🎉</h1>
            <p>Has completado el juego</p>
            <div class="final-score">
                <div>🍿 Palomitas: ${popcorn}</div>
                <div>🍫 Chocolates: ${chocolate}</div>
                <div class="total">⭐ Puntuación Total: ${total}</div>
            </div>
            <button id="playAgainBtn">🔄 Volver a Jugar</button>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('playAgainBtn').onclick = () => location.reload();
}

// EFECTO AL RECOGER
function createPickupEffect(position) {
    const ps = new BABYLON.ParticleSystem("pickup", 50, scene);
    ps.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYV2NkYGD4z4AHMP7//x8fMxQYAADnTQT9LXMN7QAAAABJRU5ErkJggg==", scene);
    ps.emitter = position.clone();
    Object.assign(ps, {
        minEmitBox: new BABYLON.Vector3(-0.5, 0, -0.5),
        maxEmitBox: new BABYLON.Vector3(0.5, 0, 0.5),
        color1: new BABYLON.Color4(0, 1, 0.5, 1),
        color2: new BABYLON.Color4(0.5, 1, 0, 1),
        minSize: 0.05, maxSize: 0.15, minLifeTime: 0.3, maxLifeTime: 0.8, emitRate: 30,
        gravity: new BABYLON.Vector3(0, 3, 0),
        direction1: new BABYLON.Vector3(-0.5, 1, -0.5),
        direction2: new BABYLON.Vector3(0.5, 2, 0.5)
    });
    ps.start();
    setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 1000); }, 300);
}

// EFECTO DE ENTREGA (CONFETTI)
function createDeliveryEffect() {
    const confettiPieces = [];
    const colors = [
        [1,0.2,0.2], [0.2,1,0.2], [0.2,0.2,1], [1,1,0.2],
        [1,0.5,0], [1,0.2,1], [0.2,1,1], [1,1,1]
    ].map(c => new BABYLON.Color3(...c));
    
    const { x, y, z } = CONFIG.ANTHILL_POSITION;
    const basePos = new BABYLON.Vector3(x, y + 3, z);
    const shapes = [
        () => BABYLON.MeshBuilder.CreateBox("c", { size: 0.15 }, scene),
        () => BABYLON.MeshBuilder.CreateSphere("c", { diameter: 0.12 }, scene),
        () => BABYLON.MeshBuilder.CreatePlane("c", { width: 0.2, height: 0.15 }, scene),
        () => BABYLON.MeshBuilder.CreateDisc("c", { radius: 0.08, tessellation: 6 }, scene)
    ];
    
    for (let i = 0; i < 50; i++) {
        const confetti = shapes[i % 4]();
        const color = colors[Math.floor(Math.random() * colors.length)];
        const mat = new BABYLON.StandardMaterial(`cm${i}`, scene);
        mat.diffuseColor = color;
        mat.emissiveColor = color.scale(0.5);
        mat.backFaceCulling = false;
        confetti.material = mat;
        
        confetti.position = basePos.clone();
        confetti.position.x += (Math.random() - 0.5) * 2;
        confetti.position.z += (Math.random() - 0.5) * 2;
        confetti.rotation = new BABYLON.Vector3(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
        
        confettiPieces.push({
            mesh: confetti,
            velocity: {
                x: (Math.random() - 0.5) * 8, y: 5 + Math.random() * 8, z: (Math.random() - 0.5) * 8,
                rotX: (Math.random() - 0.5) * 10, rotY: (Math.random() - 0.5) * 10, rotZ: (Math.random() - 0.5) * 10
            }
        });
    }
    
    let elapsed = 0;
    const observer = scene.onBeforeRenderObservable.add(() => {
        const dt = engine.getDeltaTime() / 1000;
        elapsed += engine.getDeltaTime();
        
        confettiPieces.forEach(({ mesh, velocity }) => {
            velocity.y -= 15 * dt;
            mesh.position.x += velocity.x * dt;
            mesh.position.y += velocity.y * dt;
            mesh.position.z += velocity.z * dt;
            mesh.rotation.x += velocity.rotX * dt;
            mesh.rotation.y += velocity.rotY * dt;
            mesh.rotation.z += velocity.rotZ * dt;
            velocity.x *= 0.99;
            velocity.z *= 0.99;
        });
        
        if (elapsed >= 3000) {
            scene.onBeforeRenderObservable.remove(observer);
            confettiPieces.forEach(p => p.mesh.dispose());
        }
    });
}
// ACTUALIZAR UI
function updateUI() {
    const statusEl = document.getElementById('playerStatus');
    const hintEl = document.getElementById('interactionHint');
    const foodLabel = (type) => type === 'popcorn' ? '🍿 Palomitas' : '🍫 Chocolate';
    
    if (gameState.isCarryingFood) {
        statusEl.textContent = `🐜 Cargando: ${foodLabel(gameState.carriedFoodType)}`;
        statusEl.className = gameState.nearAnthill ? 'carrying near-anthill' : 'carrying';
        hintEl.textContent = gameState.nearAnthill ? 'Presiona E para entregar' : '';
        hintEl.className = gameState.nearAnthill ? 'visible' : '';
    } else {
        statusEl.textContent = gameState.nearFood 
            ? `🐜 Cerca de: ${foodLabel(gameState.nearFood.type)}`
            : '🐜 Hormiga lista para trabajar';
        statusEl.className = '';
        hintEl.textContent = gameState.nearFood ? 'Presiona E para recoger' : '';
        hintEl.className = gameState.nearFood ? 'visible' : '';
    }
}

// ACTUALIZAR UI DE PUNTUACIÓN
function updateScoreUI() {
    const { popcorn, chocolate, total } = gameState.score;
    document.getElementById('popcornScore').textContent = popcorn;
    document.getElementById('chocolateScore').textContent = chocolate;
    document.getElementById('totalScore').textContent = total;
}

// ALTERNAR PANEL DE CONTROLES
function toggleControls() {
    const controls = document.getElementById('controls');
    if (controls) controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
}

// INICIAR JUEGO
document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', init) 
    : init();

// LIMPIAR AL CERRAR
window.addEventListener('beforeunload', () => {
    backgroundMusic?.pause();
    engine?.dispose();
});
