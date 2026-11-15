import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, CustomVariables } from './types/env';

import { usersApp } from './routes/users';
import { statsApp } from './routes/stats';
import { presenceApp } from './routes/presence';
import { socialApp } from './routes/social';
import { chatApp } from './routes/chat';
import { inboxApp } from './routes/inbox';
import { workshopApp } from './routes/workshop';
import { reviewsApp } from './routes/reviews';
import { storageApp } from './routes/storage';

const app = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

// 1. Middlewares Globales
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400
}));

// 2. Health Check y Estado de la API
app.get('/', (c) => {
  return c.json({
    name: 'HelloWorld-Launcher Backend API',
    status: 'online',
    version: 'v1',
    edge: true,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// 3. Entrega directa de objetos R2 con caché perimetral (si está configurado)
app.get('/storage/*', async (c) => {
  if (!c.env.STORAGE_BUCKET) {
    return c.text('R2 Storage disabled', 404);
  }
  const path = c.req.path.replace(/^\/storage\//, '');
  const object = await c.env.STORAGE_BUCKET.get(path);

  if (!object) {
    return c.text('Not Found', 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800'); // Caché de 1 día en browser, 7 días en CDN

  return new Response(object.body, { headers });
});

// 4. Montaje de Módulos de la API v1
const v1 = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

v1.route('/users', usersApp);
v1.route('/stats', statsApp);
v1.route('/presence', presenceApp);
v1.route('/social', socialApp);
v1.route('/chat', chatApp);
v1.route('/inbox', inboxApp);
v1.route('/workshop', workshopApp);
v1.route('/reviews', reviewsApp);
v1.route('/storage', storageApp);

app.route('/api/v1', v1);
app.route('/v1', v1); // Soporte alias directo /v1

// 5. Manejador de Errores Global
app.onError((err, c) => {
  console.error('[API Error]', err);
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error'
  }, 500);
});

app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Endpoint not found'
  }, 404);
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (env.STORAGE_BUCKET) {
      try {
        const { getR2Usage, sendNtfyAlert } = await import('./utils/r2Monitor');
        const usage = await getR2Usage(env.STORAGE_BUCKET);
        const dayOfWeek = new Date().getUTCDay();

        // Enviar aviso si supera 1 GB o todos los domingos como reporte semanal de tranquilidad
        if (usage.totalBytes >= 1024 * 1024 * 1024 || dayOfWeek === 0) {
          await sendNtfyAlert(
            env,
            '🛡️ HelloWorld Launcher - Reporte Semanal de R2',
            `Almacenamiento: ${usage.totalMB} MB (${usage.percentUsed}% de 10 GB).\nArchivos: ${usage.totalObjects}\nLímite seguro: 8 GB\nCoste actual: ${usage.costEur}\n¡Protección activa sin costes!`,
            ['shield', 'floppy_disk'],
            2
          );
        }
      } catch (err) {
        console.error('[Scheduled R2 Monitor Error]', err);
      }
    }
  }
};

