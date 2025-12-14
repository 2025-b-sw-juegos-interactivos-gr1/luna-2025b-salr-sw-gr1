/**
 * AssetManager - Gestión centralizada de assets locales
 */
export class AssetManager {
    static ASSETS = {
        textures: { madera: 'textures/madera.jpg', marmol: 'textures/marmol.jpg', metal: 'textures/metal.jpg', ladrillo: 'textures/ladrillo.jpg', cesped: 'textures/cesped.jpg' },
        models: {
            mainScene: { folder: 'models/Main Escene/', file: 'scene.gltf' },
            grimReaper: { folder: 'models/grim_reaper_monster/', file: 'scene.gltf' },
            leatherGhost: { folder: 'models/leather_ghost/', file: 'scene.gltf' },
        },
        sounds: {}
    };

    static FALLBACK_COLORS = {
        wood: [0.6, 0.4, 0.2], marble: [0.9, 0.9, 0.9], metal: [0.5, 0.5, 0.5],
        brick: [0.7, 0.3, 0.2], grass: [0.2, 0.6, 0.2], default: [0.5, 0.5, 0.5]
    };

    constructor(scene) {
        this.scene = scene;
        this.baseUrl = './assets/';
        this.textures = {};
        this.models = {};
        this.sounds = {};
    }

    loadTextures() {
        return Promise.all(Object.entries(AssetManager.ASSETS.textures).map(([key, path]) => 
            new Promise(resolve => {
                try {
                    const texture = new BABYLON.Texture(this.baseUrl + path, this.scene, false, true, BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
                        () => { console.log(`✓ Textura cargada: ${key}`); resolve(texture); },
                        () => { console.warn(`⚠ Error cargando textura ${key}`); resolve(this.createFallbackTexture(key)); }
                    );
                    this.textures[key] = texture;
                } catch (error) {
                    console.error(`Error al crear textura ${key}:`, error);
                    this.textures[key] = this.createFallbackTexture(key);
                    resolve(this.textures[key]);
                }
            })
        ));
    }

    createFallbackTexture(name) {
        const [r, g, b] = AssetManager.FALLBACK_COLORS[name] || AssetManager.FALLBACK_COLORS.default;
        const texture = new BABYLON.DynamicTexture(`fallback_${name}`, 512, this.scene);
        const ctx = texture.getContext();
        ctx.fillStyle = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < 512; i += 64) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512);
            ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
        }
        texture.update();
        return texture;
    }

    loadModel(key, path, fileName) {
        return new Promise((resolve, reject) => {
            BABYLON.SceneLoader.ImportMesh("", this.baseUrl + path, fileName, this.scene,
                (meshes, _, skeletons, animationGroups) => {
                    this.models[key] = { meshes, skeletons, animationGroups };
                    console.log(`✓ Modelo cargado: ${key} (${animationGroups.length} animaciones)`);
                    resolve(this.models[key]);
                },
                null,
                (_, message, exception) => { console.error(`Error cargando modelo ${key}:`, message); reject(exception); }
            );
        });
    }

    loadSound(key, path) {
        return new Promise(resolve => {
            const sound = new BABYLON.Sound(key, this.baseUrl + path, this.scene, () => {
                this.sounds[key] = sound;
                console.log(`✓ Sonido cargado: ${key}`);
                resolve(sound);
            }, { loop: false, autoplay: false });
        });
    }

    getTexture(key) { return this.textures[key] || this.createFallbackTexture(key); }
    getModel(key) { return this.models[key]; }
    getSound(key) { return this.sounds[key]; }

    async loadAll(progressCallback) {
        console.log('🔄 Iniciando carga de assets...');
        const { textures, models, sounds } = AssetManager.ASSETS;
        const totalAssets = Object.keys(textures).length + Object.keys(models).length + Object.keys(sounds).length;
        let loadedAssets = 0;
        const updateProgress = () => progressCallback?.(++loadedAssets / totalAssets * 100, loadedAssets, totalAssets);

        try {
            await this.loadTextures();
            Object.keys(textures).forEach(updateProgress);

            for (const [key, { folder = 'models/', file }] of Object.entries(models)) {
                try { await this.loadModel(key, folder, file); } catch (e) { console.warn(`No se pudo cargar modelo ${key}:`, e); }
                updateProgress();
            }

            for (const [key, path] of Object.entries(sounds)) {
                try { await this.loadSound(key, path); } catch { console.warn(`No se pudo cargar sonido ${key}`); }
                updateProgress();
            }

            console.log('✅ Todos los assets cargados');
        } catch (error) {
            console.error('Error durante la carga de assets:', error);
            throw error;
        }
    }

    static downloadAssets() {
        const assets = [
            ['wood.jpg', 'wood'], ['marble.jpg', 'marble'], ['metal.jpg', 'metal'], ['brick.jpg', 'brick'], ['grass.jpg', 'grass']
        ];
        console.log('📥 Para descargar los assets, ejecuta:');
        assets.forEach(([file]) => console.log(`curl -o assets/textures/${file} https://assets.babylonjs.com/environments/${file}`));
    }
}
