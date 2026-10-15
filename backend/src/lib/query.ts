import type { Response } from 'express';

/**
 * Hard ceiling on list endpoints. These UIs search and filter client-side, so
 * the API hands back one large page instead of real pagination; without a cap a
 * growing table turns every list request into an unbounded query (which is a
 * memory/CPU-exhaustion vector). Bump this if the UI moves to server-side paging.
 */
export const LIST_LIMIT = 1000;

/** Cap for append-only history feeds (scan history, activity log). */
export const HISTORY_LIMIT = 200;

/**
 * Respond with `{ data, meta }`. `meta.capped` is true when the row count hit
 * the limit, so the UI can warn that the list is truncated instead of silently
 * presenting a partial set as complete.
 */
export function listResponse<T>(res: Response, rows: T[], limit: number = LIST_LIMIT): void {
  res.json({ data: rows, meta: { limit, capped: rows.length >= limit } });
}
