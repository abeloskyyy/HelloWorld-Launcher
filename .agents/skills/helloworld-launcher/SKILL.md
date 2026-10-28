---
name: helloworld-launcher
description: >-
  Guía maestra, arquitectura completa, directivas de desarrollo, catálogo de IPCs y runbooks operativos para HelloWorld-Launcher.
  Activa esta skill cuando el usuario pida desarrollar, depurar, refactorizar, compilar, publicar releases o añadir nuevas funciones al launcher de Minecraft de HelloWorld.
---

# Skill: HelloWorld-Launcher

Guía de desarrollo y contexto operativo para **HelloWorld Launcher**, el launcher personalizado de Minecraft de la comunidad HelloWorld.

---

## 1. Resumen del Proyecto y Stack

* **Nombre del Producto**: `HelloWorld-Launcher` (`com.abelosky.helloworldlauncher`).
* **Autor**: Abelosky (`abelosky.dev@gmail.com`).
* **Versión Actual**: Sincronizada en `package.json`, `RELEASE_NOTES.md` y encabezado `User-Agent` de Modrinth.
* **Proceso Principal**: Electron (`^40.1.0`), Node.js (v24 en CI/CD).
* **Proceso Renderer**: Arquitectura híbrida con **React 19**, **TypeScript** y **Vite**, que renderiza la estructura del DOM y carga de manera coordinada el motor de scripts legacy (`app/ui/js/`).
* **Estilos**: Vanilla CSS modular (`styles.css`, `onboarding.css`, `skinviewer.css`, etc.).
* **Integraciones**: Mojang Authentication (Microsoft OAuth via `msmc`), HelloWorld Auth (Firebase Auth), Modrinth API v2, Three.js (`skinview3d`), Discord Rich Presence.

---

## 2. Reglas de Oro Inviolables del Repositorio

1. **User-Agent de Modrinth Obligatorio**:
   Toda petición HTTP a la API de Modrinth **debe** incluir el encabezado:
   `User-Agent: HelloWorld-Launcher/<version> (abelosky.dev@gmail.com)`. Omitirlo provocará bloqueos por parte del servicio de Modrinth.
2. **Iconos de Modpacks en Workshop (Base64)**:
   Al publicar un modpack en la Workshop comunitaria u oficial, si el icono es personalizado, **debe codificarse a Base64** (`docData.iconB64`). No se deben guardar rutas locales de disco como `custom_123.png` en Firestore porque fallarán en las máquinas de otros usuarios. Solo los iconos nativos del launcher (`furnace.png`, `grass.png`, etc.) mantienen su nombre de archivo.
3. **No guardar perfiles Built-In en `profiles.json`**:
   `latest-release` y `latest-snapshot` son perfiles dinámicos y protegidos (`readOnly: true`). Se generan en memoria al arrancar y **deben eliminarse** antes de escribir en disco (`paths.getProfilesFilePath()`).
4. **Hooks de Precompilación en npm**:
   `electron-builder` requiere que la interfaz web de Vite esté compilada en `app/ui/dist`. En npm, los hooks `pre` requieren nombre exacto (`prebuild:win`, `prebuild:linux`, `prebuild:mac`). Nunca los elimines de `package.json`.
5. **Preservar Reputación SmartScreen en Windows**:
   El instalador bootstrapper (`installer/` -> `HelloWorld-Launcher-Setup.exe`) se mantiene con el mismo binario a través de versiones menores para acumular reputación en Microsoft Defender SmartScreen y evitar la pantalla azul a los usuarios. Solo se actualiza el ZIP `helloworld-launcher-win.zip`.
6. **Manejo de Concurrencia de Archivos (EMFILE/ENOENT)**:
   `graceful-fs` se parchea al inicio de `main.js` y se aplica un `Semaphore(500)` a `fs.promises` para evitar que las descargas masivas de Minecraft saturen los descriptores del sistema operativo.
7. **Política de Seguridad de Contenido (CSP)**:
   `app/ui/index.html` incluye reglas estrictas de CSP. Si añades servicios externos (por ejemplo Firebase Auth, Google Accounts, YouTube, Mojang, servidores de skin), deben reflejarse en las directivas `connect-src`, `frame-src` o `img-src`.
8. **Traducción Completa Obligatoria en TODOS los Idiomas (i18n)**:
   Cualquier texto nuevo, botón, etiqueta, tooltip, mensaje de error, modal o estado de la interfaz **debe** añadirse a **TODOS** los archivos de localización soportados (`app/ui/locales/*.json`, 23 idiomas: `ar`, `ca`, `cs`, `da`, `de`, `el`, `en`, `es`, `eu`, `fr`, `gl`, `hi`, `it`, `ja`, `ko`, `nl`, `pl`, `pt`, `ru`, `sv`, `th`, `tr`, `zh`). Está **estrictamente prohibido** dejar textos hardcodeados o idiomas incompletos con claves faltantes. Todo elemento visual debe sincronizarse mediante `data-i18n`, `data-i18n-tooltip` o `data-i18n-title` y `window.t()`.
9. **Registro Obligatorio en `RELEASE_NOTES.md` tras Cambios Mayores**:
   Siempre que se implemente un cambio mayor o significativo en el launcher, **debe registrarse inmediatamente en `RELEASE_NOTES.md`** bajo la versión en curso (`# RELEASE X.Y.Z`).
   * **¿Qué se considera un cambio mayor? (Ejemplos)**:
     - Nuevas herramientas visuales o controles en la UI (ej: selector interactivo de memoria RAM en instalaciones).
     - Nuevas opciones de configuración o comportamientos automatizados (ej: auto-maximizar y reabrir el launcher al cerrar Minecraft).
     - Integraciones con el sistema operativo (ej: Jump Lists de Windows en barra de tareas y menú de inicio).
     - Correcciones de errores críticos o bloqueantes (ej: resolver bloqueo CSP en login con Microsoft / Firebase Auth).
     - Motores internos clave o compatibilidad (ej: algoritmo de dependencias en Modrinth, renderizado de iconos comunitarios).
   * **Estilo de Redacción Requerido**:
     - Idioma: **Inglés**.
     - Tono: Claro, conciso y centrado en el beneficio práctico del usuario, evitando detalles técnicos internos o sobrecargados (ej: *"Visual RAM slider in installation settings to easily adjust allocated memory with smart recommendations"* en lugar de describir variables CSS, parsing de regex o gradients).
   * **Modelo y Subcategorías a Seguir**:
     Se organiza en las subcategorías `## Added`, `## Changed` y `## Fixed` (incluyendo solo las que apliquen):
     ```markdown
     # RELEASE X.Y.Z

     ## Added

     - Visual RAM slider in installation settings to easily adjust allocated memory with smart recommendations
     - Auto-maximize and reopen launcher when game closes (configurable in settings)
     - Windows Jump List context menu for Start Menu and Taskbar

     ## Changed

     - Improved memory allocation controls for smoother profile configuration

     ## Fixed

     - Fixed Microsoft account verification blocked by Content Security Policy (ERR_BLOCKED_BY_CSP in Firebase Auth iframe)
     - Custom community modpack icons not showing up
     - Modrinth dependency resolution now filters out server-only plugins, ignores embedded dependencies, and prevents recursive explosion of optional dependencies
     ```
10. **Pautas de Versionado Semántico (MAJOR.MINOR.PATCH)**:
    El launcher sigue el estándar SemVer estricto (`X.Y.Z`). Se debe aplicar siempre el siguiente criterio al decidir qué parte del número incrementar:
    * **`MAJOR` (`X.0.0`) — Cambia poquísimo**:
      - **Frecuencia**: Muy rara vez.
      - **Criterio**: Exclusivo para cambios estructurales masivos, rupturas profundas de retrocompatibilidad o migraciones nucleares de arquitectura.
      - **Ejemplos**: Migrar de Firebase a un backend propio dedicado con API REST/WebSockets propia, reescritura total del motor del launcher, cambio radical del sistema de cuentas o incompatibilidad total con clientes anteriores.
    * **`MINOR` (`x.Y.0`) — El incremento habitual de desarrollo**:
      - **Frecuencia**: Es el incremento estándar que acompaña la evolución habitual de la aplicación.
      - **Criterio**: Nuevas características visibles para el usuario, herramientas añadidas, nuevas opciones de configuración o integraciones relevantes con el sistema operativo que no rompen la arquitectura central.
      - **Ejemplos**: Nuevo deslizador interactivo de memoria RAM con recomendaciones (v2.3.0), auto-maximizar el launcher al cerrar Minecraft, menús Jump List en la barra de tareas de Windows, nueva pestaña o integración con Modrinth.
    * **`PATCH` (`x.y.Z`) — Correcciones puntuales y hotfixes**:
      - **Frecuencia**: Actualizaciones rápidas y enfocadas.
      - **Criterio**: Reservado casi exclusivamente para parcheo de bugs, hotfixes de emergencia, ajustes cosméticos mínimos o correcciones de dependencias sin añadir funciones de gran calado.
      - **Ejemplos**: Solución a un error de Content Security Policy (CSP), fallo de carga de iconos en un listado, corrección de tipografías/márgenes en CSS o resolución de un timeout en una descarga.

---

## 3. Mapa de Navegación del Código

```text
HelloWorld-Launcher/
├── app/
│   ├── main.js                  # Proceso principal: ciclo de vida, IPCs, lanzamiento, tray, JumpList
│   ├── preload.js               # Context Bridge seguro: expone window.hwlAPI, pywebview y electronAPI
│   ├── secrets.json             # Credenciales locales de Firebase y URLs de Gist (ignorado en git)
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── mods.js          # API Modrinth, dependencias, addons (mods, shaders, resourcepacks)
│   │   │   ├── profiles.js      # CRUD de perfiles, resolución de iconos y atajos de escritorio
│   │   │   └── skins.js         # Gestión de skinpacks y subida a la API de Mojang
│   │   └── utils/
│   │       ├── javaRuntime.js   # Descarga y resolución automática de Java oficial de Mojang
│   │       ├── mclcPatch.js     # Parche de alto rendimiento para MCLC (arranque en 0ms y cancelación)
│   │       ├── paths.js         # Resuelve rutas de .minecraft, .HWLauncher y documentos
│   │       ├── rpc.js           # Discord Rich Presence
│   │       ├── serversDat.js    # Inyección NBT de servidores para juego rápido
│   │       └── version.js       # Normalización y detección de versiones (Vanilla, Fabric, Forge, NeoForge)
│   └── ui/
│       ├── index.html           # Documento raíz con CSP y montaje del contenedor #root
│       ├── css/                 # Hojas de estilo Vanilla CSS (styles.css, onboarding.css, etc.)
│       ├── js/                  # Scripts del motor (scripts.js, workshop.js, social.js, i18n.js)
│       └── src/                 # Aplicación React 19 + TypeScript (App.tsx, vistas, componentes)
├── installer/                   # Instalador ligero Bootstrapper de Windows
├── .github/workflows/
│   ├── build.yml                # Fase 1: Compilación en la nube (Windows, Linux, macOS)
│   └── release.yml              # Fase 2: Publicación de Release oficial + Discord Webhook
├── RELEASE_NOTES.md             # Notas de versión públicas
├── version-build.md             # Documentación humana del ciclo CI/CD
└── vite.config.mts              # Configuración del bundler Vite hacia app/ui/dist
```

---

## 4. Runbooks Operativos

### Runbook 1: Añadir un Nuevo Canal IPC
1. **Definir en el Proceso Main (`app/main.js` o `app/src/handlers/`)**:
   Implementa el manejador con `ipcMain.handle('mi-nuevo-canal', async (event, args) => { ... })`.
2. **Exponer en Preload (`app/preload.js`)**:
   - Añade el método en `hwlAPI` (ejemplo: `miNuevoMetodo: (args) => ipcRenderer.invoke('mi-nuevo-canal', args)`).
   - Añade el alias en `pywebviewAPI` si los scripts legacy (`scripts.js`, `workshop.js`) lo necesitan.
3. **Declarar Tipos (`app/ui/src/types/launcher.d.ts`)**:
   Añade la firma del método a la interfaz `HwlAPI`.
4. **Usar en el Frontend**:
   Invoca mediante `window.hwlAPI.miNuevoMetodo(...)` o el hook `useLauncher()`.

### Runbook 2: Modificar o Añadir Componentes en la UI
1. Abre el componente en `app/ui/src/components/`.
2. Mantén los IDs y clases de CSS existentes si los scripts de `app/ui/js/` (como `scripts.js` o `social.js`) realizan consultas mediante `document.getElementById` o selectores.
3. Añade atributos `data-i18n="clave"`, `data-i18n-tooltip` o `data-i18n-title`. Añade y traduce dicha clave en **TODOS los 23 idiomas** de `app/ui/locales/*.json` sin excepción. Nunca dejes textos hardcodeados.
4. Valida la compilación ejecutando:
   ```powershell
   npx tsc --noEmit
   npm run build:ui
   ```

### Runbook 3: Diagnosticar Fallos en el Lanzamiento de Minecraft
1. **Verificar Assets**: El parche `mclcPatch.js` crea `<assetId>.verified`. Si hay archivos corruptos, borrar ese marcador en `.minecraft/assets/indexes/` forzará una reverificación limpia.
2. **Librerías de NeoForge/Forge**: Revisa que `arguments.jvm` del JSON de la versión sea extraído e inyectado en `customArgs`. Sin esto, NeoForge fallará con `"The installation is corrupted!"`.
3. **Java Runtime**: Comprueba los registros de `JavaRuntimeManager`. Si la descarga falla, el launcher intentará usar el fallback en `java-runtimes/` o el comando `java` del sistema.
4. **Juego ya en ejecución**: El launcher protege contra instancias duplicadas a menos que se llame con `force = true`.

### Runbook 4: Publicar una Release Oficial
Sigue rigurosamente el flujo en dos fases:
1. Aplica la **Regla de Oro #10 (SemVer)** para determinar la nueva versión (`MAJOR` para reescrituras/backend, `MINOR` para nuevas funciones/ajustes, `PATCH` para bugs/hotfixes) y actualiza `version` en `package.json`.
2. Escribe las notas de versión en `RELEASE_NOTES.md` siguiendo la **Regla de Oro #9** (`## Added`, `## Changed`, `## Fixed`).
3. Sincroniza el encabezado `User-Agent: HelloWorld-Launcher/<version>` si procede.
4. `git add package.json RELEASE_NOTES.md` ➔ `git commit` ➔ `git push origin main`.
5. En GitHub Actions, ejecuta **Build Application (Artifacts)**.
6. Descarga y prueba los instaladores locales.
7. En GitHub Actions, ejecuta **Publish Official Release** para publicar en GitHub, actualizar el Gist y notificar a Discord.

---

## 5. Referencias Detalladas

Para consultas profundas y especificaciones de bajo nivel, consulta los documentos de referencia especializados:

* [Arquitectura e IPCs](references/architecture.md): Especificación del ciclo de arranque, sistema de archivos, variables de `user.json` y catálogo completo de canales IPC.
* [Motor de Lanzamiento](references/launch_engine.md): Detalles técnicos de `mclcPatch.js`, `javaRuntime.js`, normalización de versiones, inyección de JVM y conexión directa a servidores.
* [Mods, Workshop y Skins](references/mods_and_workshop.md): Reglas de la API de Modrinth, algoritmo de dependencias, empaquetado de modpacks en la Workshop y visores 3D con Three.js.
* [Guía de Compilación y CI/CD](references/build_and_release.md): Flujo de trabajo en dos fases, reputación SmartScreen, scripts de build y checklist de releases.
