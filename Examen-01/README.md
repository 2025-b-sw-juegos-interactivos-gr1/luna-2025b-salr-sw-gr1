# After Life - Horror Game 🎮👻

**Autor:** Said Alejandro Luna Rivera  
**Curso:** Juegos Interactivos - EPN 2025B

Juego de terror en tercera persona desarrollado con Babylon.js donde controlas monstruos en una escena oscura y aterradora.

## 🎯 Características

- ✅ **Dos personajes jugables**: Grim Reaper y Leather Ghost
- ✅ **Sistema de animaciones**: Idle, caminar, correr, atacar
- ✅ **Cámara tercera persona**: Sigue al personaje activo
- ✅ **Cambio dinámico de personajes**: Presiona F3
- ✅ **Ambiente terrorífico**: Niebla, iluminación oscura
- ✅ **Controles intuitivos**: WASD + Shift + Mouse

## 🕹️ Controles

| Tecla/Acción | Función |
|--------------|---------|
| **W, A, S, D** | Movimiento del personaje |
| **Shift + W** | Correr hacia adelante |
| **Clic Derecho** | Atacar |
| **F3** | Cambiar entre personajes |
| **Mouse** | Rotar cámara |
| **Rueda del Mouse** | Zoom in/out |

## 📁 Estructura del Proyecto

```plaintext
After Life/
├── index.html              # Página principal
├── assets/
│   ├── models/
│   │   ├── Main Escene/           # Escenario principal
│   │   ├── grim_reaper_monster/   # Personaje 1 (con animaciones)
│   │   └── leather_ghost/         # Personaje 2 (con animaciones)
│   ├── sounds/                    # Archivos de audio (agregar manualmente)
│   └── textures/                  # Texturas del proyecto
└── src/
    ├── main.js                    # Punto de entrada
    ├── scene.js                   # Configuración de la escena
    ├── assetManager.js            # Gestor de recursos
    └── PlayerController.js        # Controlador de jugadores
```

## 🚀 Cómo ejecutar

### Opción 1: Servidor local simple (Python)
```powershell
# Python 3
python -m http.server 8000

# Luego abre: http://localhost:8000
```

### Opción 2: Con Live Server (Recomendado)

1. Instala la extensión **"Live Server"** en VS Code
2. Clic derecho en `index.html`
3. Selecciona **"Open with Live Server"**

### Opción 3: Con Node.js

```powershell
npx http-server -p 8000
# Abre: http://localhost:8000
```

## 🎵 Configuración de Audio

La carpeta `assets/sounds/` está vacía por defecto. Para agregar música:

1. Descarga archivos de audio (formato MP3):
   - `horror_ambience.mp3` - Música de fondo
   - `footsteps.mp3` - Sonido de pasos (opcional)

2. Colócalos en `assets/sounds/`

3. El juego los cargará automáticamente

**Fuentes de audio gratuito:**
- [Freesound.org](https://freesound.org)
- [OpenGameArt.org](https://opengameart.org)
- [Incompetech](https://incompetech.com)

## 🛠️ Tecnologías Utilizadas

- **Babylon.js 7.x**: Motor de juego 3D
- **JavaScript (ES6 Modules)**: Lógica del juego
- **HTML5 Canvas**: Renderizado
- **GLTF 2.0**: Modelos 3D

## 📋 Modelos 3D

Los modelos incluyen las siguientes animaciones:
- **idle** - Animación de reposo
- **walk** - Caminar
- **run** - Correr
- **attack** - Ataque

## 🎨 Características Visuales

- Niebla atmosférica
- Iluminación hemisférica + direccional
- Colores oscuros y ambiente tenebroso
- UI informativa con controles

## 🐛 Solución de Problemas

### Los modelos no se cargan
- Verifica que las rutas en `assetManager.js` sean correctas
- Asegúrate de ejecutar con un servidor HTTP (no abrir el archivo directamente)

### No hay sonido
- Verifica que los archivos de audio estén en `assets/sounds/`
- Los nombres deben coincidir: `horror_ambience.mp3`
- Revisa la consola del navegador para errores

### La cámara no funciona bien
- Ajusta `lowerRadiusLimit` y `upperRadiusLimit` en `scene.js`
- Modifica parámetros de cámara en `PlayerController.js`

## 📝 Personalización

### Ajustar velocidad de movimiento
Edita en `PlayerController.js`:
```javascript
this.walkSpeed = 0.1;  // Velocidad al caminar
this.runSpeed = 0.2;   // Velocidad al correr
```

### Cambiar posición inicial de personajes
Edita en `scene.js`:
```javascript
rootMesh.position = new BABYLON.Vector3(x, y, z);
```

### Modificar niebla
Edita en `scene.js`:
```javascript
scene.fogDensity = 0.01;  // Más alto = más niebla
```

## 👨‍💻 Desarrollo

Proyecto creado como parte del curso de Juegos Interactivos en EPN.

### Estructura de clases principales:

1. **AssetManager**: Gestiona carga de modelos, texturas y sonidos
2. **PlayerController**: Maneja input, movimiento y animaciones
3. **Scene**: Configura la escena 3D y coordina componentes

## 📄 Licencia

Los modelos 3D tienen sus propias licencias (ver archivos `license.txt` en cada carpeta de modelo).

---

**¡Disfruta del juego! 👻🎮**
    sounds: {
        // Ejemplo: music: 'sounds/music.mp3',
    }
};
```

## 📦 Formatos Soportados

- **Texturas:** JPG, PNG, BMP, TGA, DDS, HDR
- **Modelos 3D:** GLB, GLTF, OBJ, STL
- **Sonidos:** MP3, WAV, OGG

## 🔗 Recursos

- **Assets Gratis:** [polyhaven.com](https://polyhaven.com/), [sketchfab.com](https://sketchfab.com/)
- **Documentación:** [doc.babylonjs.com](https://doc.babylonjs.com/)
- **Playground:** [playground.babylonjs.com](https://playground.babylonjs.com/)

---

💡 **Tip:** El proyecto usa una estructura modular organizada. Edita `src/scene.js` para crear tu escena 3D.
