# Cloudflare Telemetry Worker - HelloWorld Launcher

Este worker gestiona la ingesta de telemetría, errores y crashes de HelloWorld Launcher, almacenando los datos estructurados en **Cloudflare D1 (SQL)** y los logs comprimidos en **Cloudflare R2**.

---

## 🚀 Despliegue en 3 Minutos (100% Gratuito)

### 1. Iniciar sesión en Cloudflare
Desde esta carpeta (`cloudflare/telemetry-worker`):
```bash
npx wrangler login
```

### 2. Crear la Base de Datos D1 y el Bucket R2
```bash
# 1. Crear base de datos D1
npx wrangler d1 create hwlauncher-telemetry

# 2. Copia el 'database_id' que sale en la terminal y pégalo en wrangler.toml:
# database_id = "tu-uuid-aqui"

# 3. Crear bucket R2 para los logs completos
npx wrangler r2 bucket create hwlauncher-logs

# 4. Crear las tablas e índices en D1
npx wrangler d1 execute hwlauncher-telemetry --file=./schema.sql
```

### 3. Desplegar el Worker
```bash
npx wrangler deploy
```

La consola te dará la URL pública de tu worker, por ejemplo:
`https://hwlauncher-telemetry.tu-subdominio.workers.dev`

---

## 🔍 Cómo Consultar la Telemetría

### Opción 1: Desde la consola oficial de Cloudflare
1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com).
2. Ve a **Workers & Pages** > **D1** > `hwlauncher-telemetry`.
3. Pestaña **Data**: Filtra directamente por la columna `username`.
4. Pestaña **Console**: Puedes lanzar consultas SQL directas:
```sql
-- Ver los últimos 20 reportes de un usuario
SELECT created_at, trigger_reason, is_crash, exit_code, unmanaged_mods_json, recent_logs_text
FROM telemetry_reports
WHERE username = 'Abelosky'
ORDER BY created_at DESC
LIMIT 20;

-- Ver solo crashes de Minecraft con mods manuales
SELECT username, created_at, profile_name, unmanaged_mods_json, recent_logs_text
FROM telemetry_reports
WHERE is_crash = 1
ORDER BY created_at DESC;
```

### Opción 2: Mediante API HTTP / cURL
```bash
# Ver últimos reportes de un usuario
curl "https://tu-worker.workers.dev/reports?username=Abelosky" -H "x-admin-key: hwlauncher_admin_telemetry_key"

# Descargar el log completo .gz de un reporte
curl "https://tu-worker.workers.dev/reports/{report_id}/logs" -H "x-admin-key: hwlauncher_admin_telemetry_key" --output log.json.gz
```
