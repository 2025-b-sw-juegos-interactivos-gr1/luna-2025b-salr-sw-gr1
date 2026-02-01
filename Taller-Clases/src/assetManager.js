/**
 * AssetManager - Gestión centralizada de assets locales
 * Maneja la carga de texturas, modelos, sonidos y otros recursos
 */

export class AssetManager {
    constructor(scene) {
        this.scene = scene;
        this.baseUrl = './assets/';
        this.textures = {};
        this.models = {};
        this.sounds = {};
        this.loadingCallbacks = [];
    }

    /**
     * Rutas de assets organizadas por tipo
     * INSTRUCCIONES: Agrega aquí las rutas a tus propios assets
     */
    static ASSETS = {
        textures: {
            // Texturas disponibles en el proyecto
            madera: 'textures/madera.jpg',
            marmol: 'textures/marmol.jpg',
            metal: 'textures/metal.jpg',
            ladrillo: 'textures/ladrillo.jpg',
            cesped: 'textures/cesped.jpg',
            // Agrega más texturas aquí según necesites
        },
        models: {
            // Modelo del Yeti
            yeti: 'Yeti.gltf',
        },
        sounds: {
            // Agrega tus sonidos aquí
            // Ejemplo: music: 'sounds/music.mp3',
        }
    };

    /**
     * Carga todas las texturas definidas
     * @returns {Promise} Promise que se resuelve cuando todas las texturas están cargadas
     */
    loadTextures() {
        const texturePromises = [];

        Object.entries(AssetManager.ASSETS.textures).forEach(([key, path]) => {
            const promise = new Promise((resolve, reject) => {
                try {
                    const texture = new BABYLON.Texture(
                        this.baseUrl + path,
                        this.scene,
                        false,
                        true,
                        BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
                        () => {
                            console.log(`✓ Textura cargada: ${key}`);
                            resolve(texture);
                        },
                        (message, exception) => {
                            console.warn(`⚠ Error cargando textura ${key}:`, message);
                            // Crear textura de fallback
                            const fallbackTexture = this.createFallbackTexture(key);
                            resolve(fallbackTexture);
                        }
                    );
                    this.textures[key] = texture;
                } catch (error) {
                    console.error(`Error al crear textura ${key}:`, error);
                    this.textures[key] = this.createFallbackTexture(key);
                    resolve(this.textures[key]);
                }
            });
            texturePromises.push(promise);
        });

        return Promise.all(texturePromises);
    }

    /**
     * Crea una textura de fallback cuando no se puede cargar la original
     */
    createFallbackTexture(name) {
        const colors = {
            wood: new BABYLON.Color3(0.6, 0.4, 0.2),
            marble: new BABYLON.Color3(0.9, 0.9, 0.9),
            metal: new BABYLON.Color3(0.5, 0.5, 0.5),
            brick: new BABYLON.Color3(0.7, 0.3, 0.2),
            grass: new BABYLON.Color3(0.2, 0.6, 0.2),
        };

        const texture = new BABYLON.DynamicTexture(`fallback_${name}`, 512, this.scene);
        const context = texture.getContext();
        const color = colors[name] || new BABYLON.Color3(0.5, 0.5, 0.5);
        
        context.fillStyle = `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;
        context.fillRect(0, 0, 512, 512);
        
        // Añadir patrón simple
        context.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < 512; i += 64) {
            context.beginPath();
            context.moveTo(i, 0);
            context.lineTo(i, 512);
            context.moveTo(0, i);
            context.lineTo(512, i);
            context.stroke();
        }
        
        texture.update();
        return texture;
    }

    /**
     * Carga un modelo 3D desde archivo local
     * @param {string} key - Clave del modelo
     * @param {string} path - Ruta al archivo del modelo
     * @param {string} fileName - Nombre del archivo
     * @returns {Promise}
     */
    loadModel(key, path, fileName) {
        return new Promise((resolve, reject) => {
            BABYLON.SceneLoader.ImportMesh(
                "",
                this.baseUrl + path,
                fileName,
                this.scene,
                (meshes) => {
                    this.models[key] = meshes;
                    console.log(`✓ Modelo cargado: ${key}`);
                    resolve(meshes);
                },
                null,
                (scene, message, exception) => {
                    console.error(`Error cargando modelo ${key}:`, message);
                    reject(exception);
                }
            );
        });
    }

    /**
     * Carga un sonido desde archivo local
     * @param {string} key - Clave del sonido
     * @param {string} path - Ruta al archivo de sonido
     * @returns {Promise}
     */
    loadSound(key, path) {
        return new Promise((resolve, reject) => {
            const sound = new BABYLON.Sound(
                key,
                this.baseUrl + path,
                this.scene,
                () => {
                    this.sounds[key] = sound;
                    console.log(`✓ Sonido cargado: ${key}`);
                    resolve(sound);
                },
                {
                    loop: false,
                    autoplay: false
                }
            );
        });
    }

    /**
     * Obtiene una textura cargada
     * @param {string} key - Clave de la textura
     * @returns {BABYLON.Texture}
     */
    getTexture(key) {
        return this.textures[key] || this.createFallbackTexture(key);
    }

    /**
     * Obtiene un modelo cargado
     * @param {string} key - Clave del modelo
     * @returns {Array}
     */
    getModel(key) {
        return this.models[key];
    }

    /**
     * Obtiene un sonido cargado
     * @param {string} key - Clave del sonido
     * @returns {BABYLON.Sound}
     */
    getSound(key) {
        return this.sounds[key];
    }

    /**
     * Carga todos los assets definidos
     * @param {Function} progressCallback - Callback para reportar progreso
     * @returns {Promise}
     */
    async loadAll(progressCallback) {
        console.log('🔄 Iniciando carga de assets...');
        
        const totalAssets = Object.keys(AssetManager.ASSETS.textures).length +
                          Object.keys(AssetManager.ASSETS.models).length +
                          Object.keys(AssetManager.ASSETS.sounds).length;
        
        let loadedAssets = 0;

        const updateProgress = () => {
            loadedAssets++;
            const progress = (loadedAssets / totalAssets) * 100;
            if (progressCallback) {
                progressCallback(progress, loadedAssets, totalAssets);
            }
        };

        try {
            // Cargar texturas
            await this.loadTextures();
            Object.keys(AssetManager.ASSETS.textures).forEach(() => updateProgress());

            // Cargar modelos (si hay)
            for (const [key, path] of Object.entries(AssetManager.ASSETS.models)) {
                try {
                    await this.loadModel(key, 'models/', path);
                } catch (error) {
                    console.warn(`No se pudo cargar modelo ${key}`);
                }
                updateProgress();
            }

            // Cargar sonidos (si hay)
            for (const [key, path] of Object.entries(AssetManager.ASSETS.sounds)) {
                try {
                    await this.loadSound(key, path);
                } catch (error) {
                    console.warn(`No se pudo cargar sonido ${key}`);
                }
                updateProgress();
            }

            console.log('✅ Todos los assets cargados');
        } catch (error) {
            console.error('Error durante la carga de assets:', error);
            throw error;
        }
    }

    /**
     * Descarga assets desde URLs externas (útil para desarrollo inicial)
     */
    static async downloadAssets() {
        const assetsToDownload = [
            { url: 'https://assets.babylonjs.com/environments/wood.jpg', path: 'assets/textures/wood.jpg' },
            { url: 'https://assets.babylonjs.com/environments/marble.jpg', path: 'assets/textures/marble.jpg' },
            { url: 'https://assets.babylonjs.com/environments/metal.jpg', path: 'assets/textures/metal.jpg' },
            { url: 'https://assets.babylonjs.com/environments/brick.jpg', path: 'assets/textures/brick.jpg' },
            { url: 'https://assets.babylonjs.com/environments/grass.jpg', path: 'assets/textures/grass.jpg' },
        ];

        console.log('📥 Para descargar los assets, ejecuta:');
        assetsToDownload.forEach(asset => {
            console.log(`curl -o ${asset.path} ${asset.url}`);
        });
    }
}
