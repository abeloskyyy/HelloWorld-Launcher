# Mods, Addons, Workshop y Skins - HelloWorld Launcher

Este documento explica cómo HelloWorld Launcher gestiona la integración con la API de Modrinth, el sistema de resolución de dependencias, la Workshop de la comunidad y el gestor de skins 3D.

---

## 1. Integración con la API de Modrinth (`app/src/handlers/mods.js`)

### Requisito Obligatorio: `User-Agent`
De acuerdo con la directiva oficial de la API de Modrinth, **toda** petición HTTP debe identificarse mediante un encabezado `User-Agent` con nombre del proyecto, versión y método de contacto:

```javascript
const MODRINTH_USER_AGENT = `HelloWorld-Launcher/${getLauncherVersion()} (abelosky.dev@gmail.com)`;
```

### Exclusión de Plugins de Servidor
Al buscar mods sin loader específico, la API de Modrinth por defecto puede devolver plugins de servidor (Paper, Spigot, Bukkit). Para evitar que los usuarios instalen plugins incompatibles en el cliente:
- Se fuerzan facetas de loaders cliente: `['loaders:fabric', 'loaders:forge', 'loaders:neoforge']`.

### Ubicación de Archivos de Addons en Disco
Cada perfil puede tener su propio directorio de juego (`profile.directory`). Los addons se organizan de la siguiente forma:

| Tipo | Directorio en Disco | Formato / Estados |
| :--- | :--- | :--- |
| **Mods** | `<profileDir>/mods/` | `.jar` (activado) / `.jar.disabled` (desactivado) |
| **Resourcepacks** | `<profileDir>/resourcepacks/` | `.zip` |
| **Shaderpacks** | `<profileDir>/shaderpacks/` | `.zip` |
| **Datapacks** | `<profileDir>/saves/<worldName>/datapacks/` | `.zip` o carpeta descomprimida |

---

## 2. Resolución de Dependencias (`resolveModDependencies`)

Al instalar un mod desde Modrinth, el sistema evalúa su grafo de dependencias:
1. **Ignorar dependencias embebidas**: Se descartan las dependencias marcadas como `dependency_type === 'embedded'` (ya vienen empaquetadas dentro del propio JAR del mod).
2. **Dependencias requeridas**: Filtra las marcadas como `dependency_type === 'required'`.
3. **Prevención de recursión y duplicados**:
   - Comprueba si el mod o su ID de proyecto ya está instalado en el perfil.
   - Evita bucles cíclicos si dos mods se referencian mutuamente.
4. **Presentación en UI**: Notifica al usuario en el modal de addons qué dependencias adicionales se descargarán e instalarán automáticamente.

---

## 3. Workshop de la Comunidad (`workshop.js` y `main.js`)

El sistema Workshop permite a los creadores y jugadores compartir modpacks, configuraciones y mundos personalizados.

### Ciclo de Publicación de un Modpack:
1. **Empaquetado (`workshop_package_profile`)**:
   - Inspecciona el perfil seleccionado.
   - Registra la versión base de Minecraft y el loader.
   - Recopila la lista de IDs de proyectos y versiones de Modrinth para no resubir archivos binarios innecesarios.
   - Empaqueta los archivos de configuración (`config/`, `defaultconfigs/`, opciones personalizadas) en un archivo ZIP codificado en Base64.
2. **Regla Crítica de Iconos Personalizados (Base64)**:
   > [!IMPORTANT]
   > Si el modpack utiliza un icono por defecto del launcher (`furnace.png`, `crafting_table.png`, `grass.png`), se envía únicamente el nombre del archivo.
   > **Si el icono es personalizado** (subido por el usuario o extraído de `profiles-img/`), **es obligatorio convertirlo a Base64** (`data:image/png;base64,...`).
   > Si se subiera solo el nombre de archivo, los demás usuarios no podrían cargarlo desde sus propios ordenadores y se mostraría el icono roto o `default.png`.
3. **Moderación**:
   - Estados del modpack: `pending` (pendiente), `approved` (aprobado), `rejected` (rechazado), `official` (oficial de HelloWorld).
   - Los administradores pueden moderar directamente desde la interfaz con `workshop-moderate-item`.

---

## 4. Gestor de Skins y Visor 3D (`skinViewerManager.ts` y `skins.js`)

La visualización de skins utiliza la librería `skinview3d` construida sobre Three.js.

### Los 3 Tipos de Visores en la Aplicación:
1. **Visor Principal (Sección Skins & Capas)**:
   - Animación en reposo (`IdleAnimation`).
   - Rotación interactiva de 360° con inercia física (`enableDamping = true`, `dampingFactor = 0.06`).
   - Reanudación suave de auto-rotación 700 ms después de soltar el ratón.
   - `ResizeObserver` reactivo para ajustar el canvas si cambia el tamaño de ventana.
2. **Visor de Modales (Crear / Editar Skinpack)**:
   - Contenedor con altura fija (`480px`) en CSS para evitar que el `ResizeObserver` entre en un bucle infinito estirando el modal hacia abajo.
   - Cambio reactivo inmediato entre modelos `classic` (Steve 4px) y `slim` (Alex 3px).
   - Limpieza rigurosa de memoria WebGL (`viewer.dispose()`) al cerrar el modal.
3. **Miniaturas 3D en la Cuadrícula**:
   - Orientación frontal estática y centrada (`rotation.set(0, 0, 0)`).
   - Al pasar el cursor (`mouseenter`), inicia rotación dinámica (`0.8`); al retirar el cursor (`mouseleave`), regresa suavemente al centro.

### Subida a Mojang
Para usuarios con cuentas de Microsoft autenticadas, `activateSkinPack(id, token)` envía la skin directamente a la API oficial de Mojang (`https://api.minecraftservices.com/minecraft/profile/skins`) mediante una petición multipart con el token de portador (`Bearer`).
