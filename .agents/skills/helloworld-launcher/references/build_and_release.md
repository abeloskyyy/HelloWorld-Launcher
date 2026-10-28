# Guía de Compilación, CI/CD y Publicación - HelloWorld Launcher

HelloWorld Launcher utiliza un flujo de trabajo profesional en dos fases en GitHub Actions para compilar binarios multi-plataforma (Windows, Linux y macOS), preservar la reputación del instalador y publicar releases con anuncios automáticos.

---

## 1. El Flujo de Trabajo en Dos Fases

```mermaid
graph LR
    subgraph Fase 1: Compilación
    A[Cambio de versión en package.json y RELEASE_NOTES.md] --> B[Push a main]
    B --> C[Lanzar workflow 'Build Application']
    C --> D[Descargar Artifacts y probar en local]
    end
    subgraph Fase 2: Publicación
    D --> E{¿Pruebas superadas?}
    E -- Sí --> F[Lanzar workflow 'Publish Official Release']
    F --> G[Release pública + Gist + Notificación Discord]
    end
```

---

## 2. Criterios de Versionado Semántico (MAJOR.MINOR.PATCH)

HelloWorld Launcher sigue rigurosamente SemVer (`X.Y.Z`):

* **`MAJOR` (`X.0.0`) — Muy infrecuente**:
  - Cambia poquísimo y solo ante cambios arquitectónicos masivos o rupturas profundas de compatibilidad.
  - *Ejemplos*: Migración de Firebase a un backend propio dedicado, rediseño completo del motor o arquitectura del launcher, cambio integral de sistemas de autenticación o ruptura total de protocolos con clientes anteriores.
* **`MINOR` (`x.Y.0`) — Incremento estándar de desarrollo**:
  - Es el incremento habitual en el ciclo de vida continuo del proyecto.
  - *Ejemplos*: Nuevas características visibles para el usuario (ej. selector visual de memoria RAM en instalaciones), nuevas opciones de configuración (ej. auto-maximizar al cerrar juego), integración de Jump Lists en la barra de tareas de Windows, o nuevas integraciones con Modrinth.
* **`PATCH` (`x.y.Z`) — Mantenimiento y corrección de bugs**:
  - Reservado casi exclusivamente para parcheo de bugs, hotfixes de emergencia, ajustes cosméticos menores o solución a fallos en librerías/dependencias sin añadir funcionalidades nuevas.
  - *Ejemplos*: Corrección de bloqueo CSP en un iframe, arreglos en la visualización de iconos de modpacks, ajustes de espaciado en CSS o resolución de fallos de timeout.

---

## 3. Estrategia de Reputación SmartScreen (Windows)

> [!IMPORTANT]
> **Preservación del Instalador Bootstrapper:**
> El instalador de Windows (`HelloWorld-Launcher-Setup.exe` ubicado en `installer/`) es un instalador ligero independiente.
> - Al compilar una nueva versión menor o parche del launcher, el workflow `build.yml` **reutiliza el mismo `HelloWorld-Launcher-Setup.exe` de la release anterior**.
> - Esto mantiene el mismo hash SHA-256 del ejecutable de instalación, acumulando descargas y evitando la pantalla azul de advertencia de **Microsoft Defender SmartScreen**.
> - El setup descarga dinámicamente `helloworld-launcher-win.zip` (que sí se actualiza y recompila en cada release).
> - Si se necesita modificar la interfaz o el código del propio instalador, se activa el parámetro `build_setup: true` en el workflow `Build Application`.

---

## 4. Scripts de npm y Regla de Hooks de Precompilación

En `package.json`, Electron-Builder requiere que la interfaz web de Vite esté compilada previamente en `app/ui/dist`:

```json
"scripts": {
  "dev:ui": "vite",
  "build:ui": "vite build",
  "prebuild": "npm run build:ui",
  "build": "electron-builder",
  "prebuild:win": "npm run build:ui",
  "build:win": "electron-builder --win -p never --config.win.target=zip",
  "prebuild:linux": "npm run build:ui",
  "build:linux": "electron-builder --linux -p never",
  "prebuild:mac": "npm run build:ui",
  "build:mac": "electron-builder --mac -p never"
}
```

> [!NOTE]
> En npm, los hooks `pre` requieren coincidencia exacta del nombre del script.
> Ejecutar `npm run build:win` llama a **`prebuild:win`**, no a `prebuild`. Por ello, existen `prebuild:win`, `prebuild:linux` y `prebuild:mac` para asegurar que `npm run build:ui` siempre se ejecute antes de empaquetar con Electron.

---

## 5. Checklist para Publicar una Nueva Versión

Sigue estos pasos rigurosos cada vez que vayas a liberar una actualización:

### 1. Sincronización Local
- [ ] Actualiza la versión en `package.json` (ejemplo: `"version": "2.2.2"`).
- [ ] Redacta las notas en `RELEASE_NOTES.md` bajo el encabezado `# RELEASE <version>`.
- [ ] Si es necesario, verifica que `MODRINTH_USER_AGENT` en `app/src/handlers/mods.js` lea la versión actualizada.
- [ ] Comprueba que no hay errores de TypeScript ejecutando:
  ```powershell
  npx tsc --noEmit
  npm run build:ui
  ```
- [ ] Haz commit y push a la rama `main`:
  ```bash
  git add package.json RELEASE_NOTES.md
  git commit -m "Prepare v2.2.2 release"
  git push origin main
  ```

### 2. Compilación en la Nube
- [ ] Ve a GitHub ➔ Pestaña **Actions**.
- [ ] Selecciona el workflow **Build Application (Artifacts)**.
- [ ] Pulsa **Run workflow** (marcando Windows, Linux y macOS).
- [ ] Espera a que finalice y descarga los artefactos empaquetados (`windows-artifacts`, etc.) para verificar el funcionamiento.

### 3. Publicación Oficial
- [ ] En **Actions**, selecciona el workflow **Publish Official Release**.
- [ ] Pulsa **Run workflow**. El script automáticamente:
  - Creará el tag Git y la Release oficial en GitHub.
  - Subirá todos los binarios empaquetados.
  - Actualizará el Gist remoto de metadatos de actualización.
  - Enviará un anuncio formateado con el changelog al canal de Discord `#updates`.
