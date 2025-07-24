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
        memoColumnCount: 4,
        taskColumnCount: 2,
        memoViewMode: 'list',
        taskViewMode: 'list',
        memoHideControls: false,
        taskHideControls: false,
        hideHeader: false,
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

    const { memoColumnCount, taskColumnCount, memoViewMode, taskViewMode, memoHideControls, taskHideControls, hideHeader } = body;
    

    if (memoColumnCount !== undefined && (typeof memoColumnCount !== 'number' || memoColumnCount < 1 || memoColumnCount > 4)) {
      return c.json({ error: 'Invalid memo column count' }, 400);
    }

    if (taskColumnCount !== undefined && (typeof taskColumnCount !== 'number' || taskColumnCount < 1 || taskColumnCount > 4)) {
      return c.json({ error: 'Invalid task column count' }, 400);
    }

    if (memoViewMode !== undefined && !['card', 'list'].includes(memoViewMode)) {
      return c.json({ error: 'Invalid memo view mode' }, 400);
    }

    if (taskViewMode !== undefined && !['card', 'list'].includes(taskViewMode)) {
      return c.json({ error: 'Invalid task view mode' }, 400);
    }

    if (memoHideControls !== undefined && typeof memoHideControls !== 'boolean') {
      return c.json({ error: 'Invalid memo hide controls value' }, 400);
    }

    if (taskHideControls !== undefined && typeof taskHideControls !== 'boolean') {
      return c.json({ error: 'Invalid task hide controls value' }, 400);
    }

    if (hideHeader !== undefined && typeof hideHeader !== 'boolean') {
      return c.json({ error: 'Invalid hide header value' }, 400);
    }

    // 既存の設定があるかチェック
    const existing = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .get();

    const updateData: Partial<typeof userPreferences.$inferInsert> = { updatedAt: Date.now() };
    if (memoColumnCount !== undefined) updateData.memoColumnCount = memoColumnCount;
    if (taskColumnCount !== undefined) updateData.taskColumnCount = taskColumnCount;
    if (memoViewMode !== undefined) updateData.memoViewMode = memoViewMode;
    if (taskViewMode !== undefined) updateData.taskViewMode = taskViewMode;
    if (memoHideControls !== undefined) updateData.memoHideControls = memoHideControls;
    if (taskHideControls !== undefined) updateData.taskHideControls = taskHideControls;
    if (hideHeader !== undefined) updateData.hideHeader = hideHeader;

    if (existing) {
      // 更新
      const updated = await db
        .update(userPreferences)
        .set(updateData)
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
          memoColumnCount: memoColumnCount || 4,
          taskColumnCount: taskColumnCount || 2,
          memoViewMode: memoViewMode || 'list',
          taskViewMode: taskViewMode || 'list',
          memoHideControls: memoHideControls || false,
          taskHideControls: taskHideControls || false,
          hideHeader: hideHeader || false,
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