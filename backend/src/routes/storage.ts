import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { requireModerator } from '../middleware/rbac';
import type { Env, CustomVariables } from '../types/env';
import { getR2Usage, checkStorageLimit, sendNtfyAlert } from '../utils/r2Monitor';
import { sanitizeAndProcessImage } from '../utils/imageSanitizer';

export const storageApp = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

// GET /api/v1/storage/usage - Comprobar uso de R2, límite gratuito y coste estimado (0.00€)
storageApp.get('/usage', async (c) => {
  const bucket = c.env.STORAGE_BUCKET;
  if (!bucket) {
    return c.json({ success: false, error: 'storage_disabled' }, 501);
  }

  try {
    const usage = await getR2Usage(bucket);
    return c.json({
      success: true,
      usage,
      provider: 'Cloudflare R2',
      tier: 'Free (10 GB/mes)',
      safetyStatus: usage.totalBytes >= 8 * 1024 * 1024 * 1024 ? 'CRITICAL_LOCKED' : usage.totalBytes >= 5 * 1024 * 1024 * 1024 ? 'WARNING' : 'SAFE'
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/v1/storage/send-ntfy-report - Forzar envío de informe de estado por NTFY (solo moderador/admin)
storageApp.post('/send-ntfy-report', requireAuth, requireModerator, async (c) => {
  const bucket = c.env.STORAGE_BUCKET;
  if (!bucket) {
    return c.json({ success: false, error: 'storage_disabled' }, 501);
  }

  const usage = await getR2Usage(bucket);
  const sent = await sendNtfyAlert(
    c.env,
    '📊 HelloWorld Launcher - Estado de Almacenamiento R2',
    `Uso actual: ${usage.totalMB} MB (${usage.percentUsed}% del tier gratuito de 10 GB).\nArchivos almacenados: ${usage.totalObjects}\nLímite de seguridad anti-cobro: 8 GB\nCoste estimado: ${usage.costEur}`,
    ['chart_with_upwards_trend', 'floppy_disk'],
    3
  );

  return c.json({ success: sent, usage });
});

// POST /api/v1/storage/upload/avatar - Subir avatar de usuario con recorte 1:1, max 512x512 y compresión
storageApp.post('/upload/avatar', requireAuth, async (c) => {
  const user = c.get('user');
  const bucket = c.env.STORAGE_BUCKET;
  if (!bucket) {
    return c.json({ success: false, error: 'storage_disabled' }, 501);
  }

  // 1. Comprobación estricta de seguridad anti-cobro (bloqueo si llega al 80% / 8 GB)
  const limitCheck = await checkStorageLimit(c.env);
  if (!limitCheck.allowed) {
    return c.json({
      success: false,
      error: 'storage_safety_limit_reached_anti_billing',
      message: 'Se ha alcanzado el límite estricto de seguridad para garantizar 0€ de coste.'
    }, 507);
  }

  const contentType = c.req.header('Content-Type') || '';
  let fileBuffer: ArrayBuffer;
  let mimeType = 'image/png';

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const rawFile = formData.get('file');
    if (!rawFile || typeof rawFile === 'string') return c.json({ success: false, error: 'no_file' }, 400);
    const file = rawFile as File;
    fileBuffer = await file.arrayBuffer();
    mimeType = file.type || 'image/png';
  } else {
    fileBuffer = await c.req.arrayBuffer();
    mimeType = contentType || 'image/png';
  }

  // 2. Protección y Procesamiento en Servidor:
  // - Rechaza ataques de tamaño (max 5MB)
  // - Rechaza bombas de píxeles (>4096px)
  // - Recorta a 1:1 si no viene recortado
  // - Redimensiona a max 512x512 (preservando tamaños menores <=512px como pixel art nativo)
  // - Comprime la imagen
  let sanitized;
  try {
    sanitized = await sanitizeAndProcessImage(fileBuffer, mimeType);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }

  const ext = sanitized.mimeType.includes('webp') ? 'webp' : sanitized.mimeType.includes('jpeg') ? 'jpg' : 'png';
  const r2Key = `avatars/${user.uid}.${ext}`;

  await bucket.put(r2Key, sanitized.buffer, {
    httpMetadata: { contentType: sanitized.mimeType }
  });

  const baseUrl = c.env.BASE_URL || 'https://api.hwlauncher.abelosky.com';
  const publicUrl = `${baseUrl}/storage/${r2Key}?v=${Date.now()}`;

  // Actualizar tabla users en D1
  await c.env.DB.prepare('UPDATE users SET avatar_url = ?, updated_at = datetime(\'now\') WHERE uid = ?').bind(publicUrl, user.uid).run();

  return c.json({
    success: true,
    avatarUrl: publicUrl,
    dimensions: { width: sanitized.width, height: sanitized.height },
    processedOnServer: sanitized.wasProcessed
  });
});

// POST /api/v1/storage/upload/icon - Subir icono para taller o instalación a Cloudflare R2
storageApp.post('/upload/icon', requireAuth, async (c) => {
  const user = c.get('user');
  const bucket = c.env.STORAGE_BUCKET;
  if (!bucket) {
    return c.json({ success: false, error: 'storage_disabled' }, 501);
  }

  // 1. Comprobación estricta de seguridad anti-cobro
  const limitCheck = await checkStorageLimit(c.env);
  if (!limitCheck.allowed) {
    return c.json({
      success: false,
      error: 'storage_safety_limit_reached_anti_billing',
      message: 'Se ha alcanzado el límite estricto de seguridad para garantizar 0€ de coste.'
    }, 507);
  }

  const contentType = c.req.header('Content-Type') || '';
  let fileBuffer: ArrayBuffer;
  let mimeType = 'image/png';

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const rawFile = formData.get('file');
    if (!rawFile || typeof rawFile === 'string') return c.json({ success: false, error: 'no_file' }, 400);
    const file = rawFile as File;
    fileBuffer = await file.arrayBuffer();
    mimeType = file.type || 'image/png';
  } else {
    fileBuffer = await c.req.arrayBuffer();
    mimeType = contentType || 'image/png';
  }

  // 2. Procesamiento, Recorte 1:1, Redimensionado a max 512x512 y Compresión Server-Side
  let sanitized;
  try {
    sanitized = await sanitizeAndProcessImage(fileBuffer, mimeType);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }

  const ext = sanitized.mimeType.includes('webp') ? 'webp' : sanitized.mimeType.includes('jpeg') ? 'jpg' : 'png';
  const r2Key = `workshop/icons/icon_${user.uid}_${Date.now()}.${ext}`;

  await bucket.put(r2Key, sanitized.buffer, {
    httpMetadata: { contentType: sanitized.mimeType }
  });

  const baseUrl = c.env.BASE_URL || 'https://api.hwlauncher.abelosky.com';
  const publicUrl = `${baseUrl}/storage/${r2Key}`;

  return c.json({
    success: true,
    iconUrl: publicUrl,
    dimensions: { width: sanitized.width, height: sanitized.height },
    processedOnServer: sanitized.wasProcessed
  });
});

// POST /api/v1/storage/upload/cloud-icon - Subir icono custom para instalación en la nube (R2 + D1 rate limit)
storageApp.post('/upload/cloud-icon', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user?.uid || user.uid.startsWith('local_')) {
    return c.json({ success: false, error: 'auth_required_for_cloud' }, 401);
  }

  const bucket = c.env.STORAGE_BUCKET;
  if (!bucket) {
    return c.json({ success: false, error: 'storage_disabled' }, 501);
  }

  // 1. Rate limit persistente en D1 (máx 6 subidas de icono / min por usuario)
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  try {
    const rlRow = await c.env.DB.prepare(
      `SELECT COUNT(*) AS cnt, MIN(created_at) AS oldest_ts
       FROM cloud_sync_rate_limits
       WHERE uid = ? AND action = 'upload_icon' AND created_at > ?`
    ).bind(user.uid, windowStart).first<{ cnt: number; oldest_ts: number | null }>();

    if (rlRow && rlRow.cnt >= 6) {
      const oldestTs = rlRow.oldest_ts || now;
      const retryAfterSec = Math.max(1, Math.ceil((60 * 1000 - (now - oldestTs)) / 1000));
      c.header('Retry-After', String(retryAfterSec));
      return c.json({
        success: false,
        error: 'rate_limited',
        retryAfterSec
      }, 429);
    }
  } catch (rlErr) {
    console.warn('[Storage CloudIcon] Rate limit table check skipped:', rlErr);
  }

  // 2. Comprobación estricta de seguridad anti-cobro (bloqueo al 80% / 8 GB)
  const limitCheck = await checkStorageLimit(c.env);
  if (!limitCheck.allowed) {
    return c.json({
      success: false,
      error: 'storage_safety_limit_reached_anti_billing',
      message: 'Se ha alcanzado el límite estricto de seguridad para garantizar 0€ de coste.'
    }, 507);
  }

  const rawProfileId = (c.req.header('X-Profile-Id') || c.req.query('profileId') || '').trim();
  const safeProfileId = rawProfileId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!safeProfileId) {
    return c.json({ success: false, error: 'missing_profile_id' }, 400);
  }

  const contentType = c.req.header('Content-Type') || '';
  let fileBuffer: ArrayBuffer;
  let mimeType = 'image/png';

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const rawFile = formData.get('file');
    if (!rawFile || typeof rawFile === 'string') return c.json({ success: false, error: 'no_file' }, 400);
    const file = rawFile as File;
    fileBuffer = await file.arrayBuffer();
    mimeType = file.type || 'image/png';
  } else {
    fileBuffer = await c.req.arrayBuffer();
    mimeType = contentType || 'image/png';
  }

  // 3. Procesamiento, Recorte 1:1, Redimensionado a max 512x512 y Compresión Server-Side
  let sanitized;
  try {
    sanitized = await sanitizeAndProcessImage(fileBuffer, mimeType);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }

  const ext = sanitized.mimeType.includes('webp') ? 'webp' : sanitized.mimeType.includes('jpeg') ? 'jpg' : 'png';
  const r2Key = `cloud-icons/${user.uid}/${safeProfileId}_${now}.${ext}`;

  await bucket.put(r2Key, sanitized.buffer, {
    httpMetadata: { contentType: sanitized.mimeType }
  });

  try {
    await c.env.DB.prepare(
      `INSERT INTO cloud_sync_rate_limits (uid, installation_id, action, created_at)
       VALUES (?, ?, 'upload_icon', ?)`
    ).bind(user.uid, safeProfileId, now).run();
    await c.env.DB.prepare('DELETE FROM cloud_sync_rate_limits WHERE created_at < ?')
      .bind(now - 2 * 60 * 1000)
      .run();
  } catch (_) {}

  const baseUrl = (c.env.BASE_URL || 'https://api.hwlauncher.abelosky.com').replace(/\/+$/, '');
  const publicUrl = `${baseUrl}/storage/${r2Key}`;

  return c.json({
    success: true,
    iconUrl: publicUrl,
    r2Key,
    dimensions: { width: sanitized.width, height: sanitized.height },
    processedOnServer: sanitized.wasProcessed
  });
});
