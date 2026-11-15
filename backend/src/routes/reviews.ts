import { Hono } from 'hono';
import { optionalAuth } from '../middleware/auth';
import type { Env, CustomVariables } from '../types/env';

export const reviewsApp = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

// GET /api/v1/reviews - Obtener todas las valoraciones y promedio
reviewsApp.get('/', async (c) => {
  const db = c.env.DB;
  const rows = await db.prepare('SELECT * FROM reviews ORDER BY created_at DESC LIMIT 100').all<any>();
  const reviews = rows.results || [];

  const count = reviews.length;
  const totalStars = reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0);
  const average = count > 0 ? (totalStars / count).toFixed(1) : '5.0';

  return c.json({
    success: true,
    stats: {
      count,
      average,
      totalStars
    },
    reviews: reviews.map(r => ({
      id: r.id,
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      timestamp: r.created_at
    }))
  });
});

// POST /api/v1/reviews - Publicar una reseña comunitaria
reviewsApp.post('/', optionalAuth, async (c) => {
  const body = await c.req.json<{
    name?: string;
    rating: number | string;
    comment: string;
  }>();

  const ratingNum = parseInt(String(body.rating), 10);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return c.json({ success: false, error: 'rating_must_be_between_1_and_5' }, 400);
  }

  const comment = (body.comment || '').trim();
  if (!comment) {
    return c.json({ success: false, error: 'comment_required' }, 400);
  }

  const name = (body.name || '').trim() || 'Anonymous';
  const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowMs = Date.now();

  await c.env.DB.prepare(`
    INSERT INTO reviews (id, name, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, name.slice(0, 40), ratingNum, comment.slice(0, 500), nowMs).run();

  return c.json({ success: true, id, timestamp: nowMs });
});

