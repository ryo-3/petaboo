import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { userPreferences } from '../../db/index';

const app = new Hono();
const sqlite = new Database('./sqlite.db');
const db = drizzle(sqlite);

// GET /user-preferences/:userId
app.get('/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    
    if (isNaN(userId)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    const preferences = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .get();

    if (!preferences) {
      // デフォルト値を返す
      return c.json({
        userId,
        columnCount: 4,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return c.json(preferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /user-preferences/:userId
app.put('/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    const body = await c.req.json();

    if (isNaN(userId)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    const { columnCount } = body;

    if (typeof columnCount !== 'number' || columnCount < 1 || columnCount > 4) {
      return c.json({ error: 'Invalid column count' }, 400);
    }

    // 既存の設定があるかチェック
    const existing = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .get();

    if (existing) {
      // 更新
      const updated = await db
        .update(userPreferences)
        .set({
          columnCount,
          updatedAt: Date.now()
        })
        .where(eq(userPreferences.userId, userId))
        .returning()
        .get();

      return c.json(updated);
    } else {
      // 新規作成
      const created = await db
        .insert(userPreferences)
        .values({
          userId,
          columnCount,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
        .returning()
        .get();

      return c.json(created);
    }
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;