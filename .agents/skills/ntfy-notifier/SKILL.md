---
name: ntfy-notifier
description: >-
  Sistema de notificación de progreso de tareas vía NTFY.
  Úsalo obligatoriamente al finalizar cualquier tarea o cambio completo
  para avisar al usuario sobre lo que se ha realizado y qué novedades hay.
---

# Skill: NTFY Notifier

Esta skill define la directiva y procedimiento para notificar al usuario sobre cambios terminados y progreso a través de notificaciones push en **NTFY**.

---

## 1. Cuándo se debe ejecutar

Debes enviar una notificación de NTFY **siempre que hayas completado un cambio completo, nueva función, corrección o tarea solicitada por el usuario**, antes de concluir tu turno de respuesta.

---

## 2. Pautas de Redacción del Mensaje

1. **Explicación clara y natural**:
   - Explica con sencillez qué se ha hecho, qué problema se ha solucionado o qué funcionalidad nueva queda disponible.
   - Responde a la pregunta: *¿Qué ha cambiado y cómo se usa o beneficia al usuario?*

2. **Sin nombres de archivos ni rutas**:
   - **ESTÁ PROHIBIDO** listar rutas o nombres de archivos modificados (nada de `app/...`, `main.js`, etc.).

3. **Sin tecnicismos internos innecesarios**:
   - No menciones variables internas, selectores CSS, expresiones regulares, imports ni funciones internas.
   - Explica el resultado funcional visible, no la fontanería interna del código.

4. **Extensión concisa**:
   - De 2 a 4 oraciones pensadas para leerse cómodamente en la pantalla de un móvil.
   - Un título claro y directo.

### Ejemplos

* ❌ **MAL**:
  > *"He modificado SettingsSection.tsx y main.js para añadir un event listener ipcRenderer.on('ram-change') y el regex /^[0-9]+$/."*

* ✅ **BIEN**:
  > *"¡Listo! Ya tienes disponible el nuevo selector visual de memoria RAM en los ajustes de instalación. Ahora puedes deslizar cómodamente la barra para asignar los gigabytes que prefieras a Minecraft con recomendaciones inteligentes según la memoria de tu equipo."*

---

## 3. Comandos de Envío

Para enviar la notificación:

```bash
node scripts/notify-ntfy.js "Título" "Mensaje"
```

O usando npm (importante incluir `--` para que npm traslade los argumentos correctamente):

```bash
npm run notify -- "Título" "Mensaje"
```

También puedes usar flags explícitos si lo prefieres:

```bash
node scripts/notify-ntfy.js --title "Título" --message "Mensaje"
```

---

## 4. Configuración

El script lee automáticamente la configuración desde `ntfy.config.json` en la raíz del proyecto:
```json
{
  "topic": "helloworld_launcher_ai_notify_29373",
  "server": "https://ntfy.sh",
  "token": "",
  "defaultTitle": "HelloWorld Launcher - Progreso",
  "tags": ["rocket"]
}
```
* **topic**: El nombre del canal de NTFY al que enviar.
* **tags**: Lista de iconos/emojis asociados al mensaje (ej: `["rocket"]`, `["bell"]` o `[]` para ninguno).
