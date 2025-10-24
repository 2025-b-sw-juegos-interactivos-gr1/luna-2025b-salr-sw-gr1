# Babylon.js - Assets Locales

**Autor:** Said Alejandro Luna Rivera  
**Curso:** Juegos Interactivos - EPN 2025B

## 📁 Estructura del Proyecto

```
luna-2025b-salr-sw-gr1/
├── assets/
│   ├── textures/      # Tus texturas (.jpg, .png, etc.)
│   ├── models/        # Tus modelos 3D (.glb, .gltf, etc.)
│   └── sounds/        # Tus sonidos (.mp3, .wav, etc.)
├── src/
│   ├── assetManager.js    # Sistema de gestión de assets
│   ├── scene.js           # Configuración de la escena
│   └── main.js            # Punto de entrada
├── index.html         # Página principal
└── package.json       # Configuración (opcional)
```

## 🚀 Inicio Rápido

### Opción 1: Con Live Server (Recomendado)

1. Instala la extensión **"Live Server"** en VS Code
2. Clic derecho en `index.html`
3. Selecciona **"Open with Live Server"**

### Opción 2: Con Python

```powershell
python -m http.server 8080
# Luego abre: http://localhost:8080
```

### Opción 3: Con Node.js

```powershell
npm install
npm start
# Abre: http://localhost:8080
```

## 📝 Cómo Usar Tus Assets

### 1. Coloca tus archivos

```powershell
# Ejemplo: copiar una textura
copy C:\ruta\a\tu\imagen.jpg assets\textures\
```

### 2. Registra el asset en el código

**En `src/assetManager.js` (línea ~15):**

```javascript
static ASSETS = {
    textures: {
        miTextura: 'textures/mi-textura.jpg',
    },
    models: {
        // Ejemplo: car: 'models/car.glb',
    },
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
