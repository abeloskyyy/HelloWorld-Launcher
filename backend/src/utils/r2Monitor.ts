import type { Env } from '../types/env';

export interface StorageUsage {
  totalObjects: number;
  totalBytes: number;
  totalMB: number;
  totalGB: number;
  freeTierLimitGB: number;
  safetyCapGB: number;
  percentUsed: number;
  costEur: string;
}

const FREE_TIER_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
const SAFETY_CAP_BYTES = 8 * 1024 * 1024 * 1024; // 8 GB límite estricto de seguridad anti-cobro

/**
 * Calcula el espacio total usado en el bucket R2
 */
export async function getR2Usage(bucket: R2Bucket): Promise<StorageUsage> {
  let totalBytes = 0;
  let totalObjects = 0;
  let cursor: string | undefined = undefined;

  do {
    const list = await bucket.list({ limit: 1000, cursor });
    for (const obj of list.objects) {
      totalBytes += obj.size;
      totalObjects++;
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  const totalMB = +(totalBytes / (1024 * 1024)).toFixed(2);
  const totalGB = +(totalBytes / (1024 * 1024 * 1024)).toFixed(3);
  const percentUsed = +((totalBytes / FREE_TIER_BYTES) * 100).toFixed(2);

  // Estimación de coste: 0€ si está dentro de 10 GB
  const costEur = totalBytes <= FREE_TIER_BYTES ? '0.00€' : `${((totalGB - 10) * 0.015).toFixed(2)}€`;

  return {
    totalObjects,
    totalBytes,
    totalMB,
    totalGB,
    freeTierLimitGB: 10,
    safetyCapGB: 8,
    percentUsed,
    costEur
  };
}

/**
 * Envía una notificación a través de NTFY
 */
export async function sendNtfyAlert(
  env: Env,
  title: string,
  message: string,
  tags: string[] = ['cloud', 'floppy_disk'],
  priority: number = 3
): Promise<boolean> {
  const server = env.NTFY_SERVER || 'https://ntfy.sh';
  const topic = env.NTFY_TOPIC || 'helloworld_launcher_ai_notify_29373';

  if (!topic) return false;

  try {
    const res = await fetch(`${server}/${topic}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': String(priority),
        'Tags': tags.join(','),
        'Content-Type': 'text/plain; charset=utf-8'
      },
      body: message
    });
    return res.ok;
  } catch (err) {
    console.error('[NTFY Alert Error]', err);
    return false;
  }
}

/**
 * Comprueba si el almacenamiento ha superado umbrales y previene cobros bloqueando subidas si supera el tope de seguridad.
 */
export async function checkStorageLimit(env: Env): Promise<{ allowed: boolean; usage: StorageUsage | null }> {
  if (!env.STORAGE_BUCKET) {
    return { allowed: false, usage: null };
  }

  const usage = await getR2Usage(env.STORAGE_BUCKET);

  // 1. Si supera el tope estricto de seguridad (8 GB de 10 GB), BLOQUEO TOTAL para evitar cualquier coste
  if (usage.totalBytes >= SAFETY_CAP_BYTES) {
    await sendNtfyAlert(
      env,
      '🚨 HelloWorld Launcher - ¡Tope de R2 alcanzado!',
      `ALERTA MÁXIMA: El almacenamiento R2 ha alcanzado ${usage.totalMB} MB (${usage.percentUsed}% de 10 GB).\nSe han bloqueado nuevas subidas por seguridad para evitar que Cloudflare te cobre jamás ni un céntimo.`,
      ['warning', 'rotating_light'],
      5 // High priority
    );
    return { allowed: false, usage };
  }

  // 2. Si supera el 50% (5 GB), avisar preventivamente
  if (usage.totalBytes >= 5 * 1024 * 1024 * 1024) {
    // Se puede cachear en KV para no spamear
    const kvKey = 'alert_r2_warning_5gb';
    const alreadySent = await env.PRESENCE_KV.get(kvKey);
    if (!alreadySent) {
      await sendNtfyAlert(
        env,
        '⚠️ HelloWorld Launcher - R2 al 50%',
        `Aviso preventivo: El almacenamiento R2 ha llegado a ${usage.totalMB} MB (${usage.percentUsed}% del tier gratuito de 10 GB). Coste actual: 0.00€.`,
        ['warning', 'chart_with_upwards_trend'],
        4
      );
      // Guardar en KV durante 3 días para no repetir la alerta continuamente
      await env.PRESENCE_KV.put(kvKey, '1', { expirationTtl: 259200 });
    }
  }

  return { allowed: true, usage };
}

