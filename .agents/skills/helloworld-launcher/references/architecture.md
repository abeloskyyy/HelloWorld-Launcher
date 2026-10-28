# Arquitectura del Sistema - HelloWorld Launcher

## 1. Stack Tecnológico

| Capa | Tecnologías | Notas Clave |
| :--- | :--- | :--- |
| **Runtime Principal** | Electron (`^40.1.0`), Node.js (v24 en CI/CD) | Proceso Main en `app/main.js` |
| **Frontend UI** | React 19 (`^19.3.1`), TypeScript (`^7.0.2`), Vite (`^8.3.4`) | Montado sobre `app/ui/src/` |
| **Scripts Legacy / Engine** | JavaScript Vanilla (`app/ui/js/`) | Ejecutan la lógica del cliente y eventos |
| **Estilos** | Vanilla CSS modular | `styles.css`, `onboarding.css`, `skinviewer.css`, etc. |
| **3D & Canvas** | `skinview3d` (`^3.4.2`), Three.js, Canvas 2D | Visor de skins y fondo de partículas de estrellas |
| **Minecraft Core** | `minecraft-launcher-core` (`^3.18.2`) parcheado | Manejo del lanzamiento y descarga de assets |
| **Empaquetado** | `electron-builder` (`^24.13.3`) | ZIP, DEB, DMG |

---

## 2. Ciclo de Vida y Arranque de la Aplicación

### Proceso Main (`app/main.js`)
1. **Blindaje de I/O de Archivos**:
   - `graceful-fs.gracefulify(require('fs'))` se ejecuta antes de cualquier importación de `fs-extra` para capturar errores `EMFILE` ("too many open files").
   - `Semaphore(500)` limita la concurrencia en llamadas de `fs.promises.stat`, `readFile` y `access` para que MCLC no sature los descriptores de archivo del sistema operativo.
2. **Control de Instancia Única**:
   - `app.requestSingleInstanceLock()` garantiza que solo exista una instancia activa del launcher.
   - Si se detecta una segunda instancia con argumentos (como `--launch-profile=<id>`), se pasa el argumento a la instancia primaria y la secundaria se cierra.
3. **Carga de Rutas (`app/src/utils/paths.js`)**:
   - Resuelve el directorio de Minecraft (`.minecraft`) y el directorio privado del launcher (`<mcDir>/.HWLauncher`).
   - Si en `user.json` hay una ruta personalizada en `mcdir`, se recargan las rutas dinámicamente.
4. **Ventana Principal (`BrowserWindow`)**:
   - Configuración: `width: 1200`, `height: 720`, `frame: false` (o barra de título personalizada), `webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }`.
   - Se carga `app/ui/index.html` (en producción lee desde `app/ui/dist`).
5. **Windows JumpList y Bandeja del Sistema (Tray)**:
   - Configura tareas en el menú contextual de la barra de tareas y acceso directo de Windows (`setUserTasks`).
   - Icono en la bandeja del sistema con opciones para abrir el launcher, cambiar cuentas, lanzar perfiles o salir.

### Proceso Renderer e Hibridación React + Scripts (`app/ui/src/App.tsx`)
1. React monta la estructura base del DOM:
   - Banners de notificación y mantenimiento (`TopBanners.tsx`).
   - Loader cúbico 3D con consejos (`InitialLoader.tsx`).
   - Fondo de estrellas interactivo (`BackgroundStarfield.tsx`).
   - Secciones de la aplicación: Play, Profiles, Workshop, Mods/Addons, Skins, Settings.
   - Modales del sistema (perfiles, login, social, skins, workshop, addons).
2. `useEffect` en `App.tsx` carga secuencialmente los scripts del motor del cliente:
   - `js/i18n.js`
   - `js/scripts.js` (núcleo del cliente y selección de perfiles)
   - `js/stats.js`
   - `js/download-listeners.js`
   - `js/skinviewer3d.js`
   - `js/skinpacks.js`
   - `js/tutorial-spotlight.js`
   - `js/tutorial-steps.js`
   - `js/onboarding.js`
   - `js/social.js`
   - `js/workshop.js`
3. Al finalizar la carga, dispara los eventos `DOMContentLoaded`, `pywebviewready` y `hwlready`, y ejecuta `applyTranslations()`.

---

## 3. Estructura de Directorios y Archivos de Usuario

El launcher almacena sus datos de configuración dentro de `<mcDir>/.HWLauncher/`:

```text
<mcDir>/                     # %APPDATA%/.minecraft (Windows) o ~/.minecraft (Linux)
└── .HWLauncher/
    ├── user.json            # Sesión, ajustes generales y preferencias de usuario
    ├── profiles.json        # Perfiles creados por el usuario (excluye built-in)
    ├── saved_accounts.json  # Base de datos del Account Switcher (cuentas guardadas)
    ├── profiles-img/        # Iconos personalizados de perfiles (PNG en base64/disco)
    ├── skin_packs/          # Skinpacks guardados (<uuid>.json) y state.json (activo)
    └── java-runtimes/       # Runtimes oficiales de Mojang descargados
```

### Formato de `user.json`
```json
{
  "username": "PlayerName",
  "account_type": "offline", // "offline" | "microsoft" | "helloworld"
  "uuid": "deterministic-or-mojang-uuid",
  "mcdir": "",               // Vacío = por defecto (%APPDATA%/.minecraft)
  "dev_mode": false,
  "show_snapshots": false,
  "show_old": false,
  "enable_transitions": true,
  "hw_accel": true,
  "privacy_mode": false,
  "reopen_on_game_close": true,
  "ui_scale": 1.0,
  "language": "es"
}
```

### Formato de `profiles.json`
> [!IMPORTANT]
> Los perfiles built-in (`latest-release` y `latest-snapshot`) **nunca** se guardan en el archivo `profiles.json`. Se generan en memoria al cargar y se filtran automáticamente antes de escribir a disco para evitar inconsistencias de versiones.

```json
{
  "profiles": {
    "uuid-del-perfil": {
      "name": "Mi Supervivencia",
      "version": "Fabric 1.21.11 (0.58.2)",
      "icon": "furnace.png",
      "directory": "C:\\Users\\...\\Documents\\MinecraftDirectories\\mi-supervivencia",
      "jvm_args": "-Xmx4G",
      "java_path": "",
      "addons": []
    }
  }
}
```

---

## 4. Catálogo de Canales IPC (`preload.js` ➔ `main.js`)

Se expone en el objeto canónico `window.hwlAPI` y mediante los adaptadores de compatibilidad `window.pywebview.api` y `window.electronAPI`:

### Autenticación y Cuentas
| Método `hwlAPI` | Canal IPC (`invoke`) | Parámetros | Retorno |
| :--- | :--- | :--- | :--- |
| `getUserJson()` | `get-user-json` | Ninguno | `UserData` |
| `saveUserJson(data)` | `save-user-json` | `data: Partial<UserData>` | `{ success: boolean }` |
| `loginMicrosoft()` | `login-microsoft` | Ninguno | Perfil Microsoft o error |
| `loginHelloWorld(u, p)`| `login-helloworld` | `email, password` | Sesión HelloWorld |
| `logout()` | `logout` | Ninguno | Estado reset a offline |
| `getSavedAccounts()` | `get-saved-accounts` | Ninguno | `SavedAccount[]` |
| `switchAccount(id, t)` | `switch-account` | `accountId, targetType` | `{ success: boolean, ... }` |
| `removeSavedAccount(id)`| `remove-saved-account` | `accountId` | `{ success: boolean }` |
| `removeAllAccounts()` | `remove-all-accounts` | Ninguno | `{ success: boolean }` |

### Perfiles y Versiones
| Método `hwlAPI` | Canal IPC (`invoke`) | Parámetros | Retorno |
| :--- | :--- | :--- | :--- |
| `getProfiles()` | `get-profiles` | Ninguno | `{ profiles: Record<string, Profile> }` |
| `addProfile(data)` | `add-profile` | Datos del perfil | `{ success: boolean, profile_id: string }` |
| `editProfile(data)` | `edit-profile` | ID y campos a editar | `{ success: boolean }` |
| `deleteProfile(id)` | `delete-profile` | `profileId` | `{ success: boolean }` |
| `getProfileIcon(name)` | `get-profile-icon` | `filename` | Data URL en Base64 o ruta local |
| `getWorlds(profileId)` | `get-worlds` | `profileId` | Lista de mundos encontrados |
| `createProfileShortcut(d)`| `create-profile-shortcut` | `{ profileId, profileName, icon }` | `{ success: boolean }` |
| `getAvailableVersions()` | `get-available-versions` | Ninguno | Versiones vanilla y loaders |
| `startGame(pId, n, f, s, sv)`| `launch-profile` | `{ profileId, nickname, force, serverIp, saveServer }` | Estado del lanzamiento |
| `cancelLaunch()` | `cancel-launch` | Ninguno | Cancela la descarga o el proceso |
| `isMinecraftRunning()` | `is-minecraft-running` | Ninguno | `boolean` |

### Mods, Addons y Modrinth
| Método `hwlAPI` | Canal IPC (`invoke`) | Parámetros | Retorno |
| :--- | :--- | :--- | :--- |
| `searchModrinth(q, opt)` | `search-modrinth` | `{ query, options }` | Resultados con hits de Modrinth |
| `getModDetails(id)` | `get-mod-details` | `projectId` | Metadatos completos del addon |
| `getModVersions(id, v, l)`| `get-mod-versions` | `{ project_id, game_version, loader }` | Lista de versiones compatibles |
| `installAddon(data)` | `install-addon` | `{ project_id, version_id, profile_id, type, world_name }` | `{ success: boolean }` |
| `getInstalledAddons(p, t, w)`| `get-installed-addons` | `{ profile_id, type, world_name }` | Addons en la carpeta del perfil |
| `toggleAddon(...)` | `toggle-addon` | Argumentos flexibles (ID o filename) | Renombra `.jar` a `.jar.disabled` |
| `deleteAddon(...)` | `delete-addon` | Filename, profile_id, type, world_name | Elimina el archivo del addon |
| `resolveModDependencies(o)`| `resolve-mod-dependencies`| Objeto con versión y loader | Árbol de dependencias requeridas |

### Eventos Globales (Main ➔ Renderer)
- `download-progress`: Progreso porcentual y bytes descargados en assets/librerías/Java.
- `info-message`: Notificaciones informativas o errores emergentes en UI.
- `reload-profiles`: Ordena al cliente recargar la lista de perfiles tras un cambio.
- `quick-launch-profile`: Disparado por accesos directos o JumpList de Windows.
- `auto-launch-profile`: Recibe orden de autoiniciar un perfil específico.
