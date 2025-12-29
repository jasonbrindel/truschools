// D1-based error logging for TruSchools
// Logs errors to the error_log table for review in the admin panel

interface ErrorLogEntry {
  endpoint?: string;
  method?: string;
  error_message: string;
  error_stack?: string;
  error_type?: string;
  url?: string;
  user_agent?: string;
  ip_hash?: string;
  extra_data?: Record<string, any>;
}

// Hash IP address for privacy
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'truschools-error-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

/**
 * Log an error to D1 database
 */
export async function logError(
  db: any,
  entry: ErrorLogEntry
): Promise<void> {
  if (!db) {
    console.error('[ErrorLogger] No database connection, logging to console:', entry);
    return;
  }

  try {
    await db.prepare(`
      INSERT INTO error_log (endpoint, method, error_message, error_stack, error_type, url, user_agent, ip_hash, extra_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      entry.endpoint || null,
      entry.method || null,
      entry.error_message,
      entry.error_stack || null,
      entry.error_type || null,
      entry.url || null,
      entry.user_agent?.substring(0, 500) || null,
      entry.ip_hash || null,
      entry.extra_data ? JSON.stringify(entry.extra_data) : null
    ).run();
  } catch (logError) {
    // Don't let logging errors crash the app
    console.error('[ErrorLogger] Failed to log error:', logError);
    console.error('[ErrorLogger] Original error:', entry);
  }
}

/**
 * Capture an exception and log it to D1
 * Compatible API with the previous Sentry implementation
 */
export async function captureException(
  db: any,
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    request?: Request;
  }
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));

  let ipHash: string | undefined;
  if (context?.request) {
    const ip = context.request.headers.get('cf-connecting-ip') ||
               context.request.headers.get('x-forwarded-for')?.split(',')[0] ||
               'unknown';
    ipHash = await hashIP(ip);
  }

  await logError(db, {
    endpoint: context?.tags?.endpoint,
    method: context?.tags?.method,
    error_message: err.message,
    error_stack: err.stack,
    error_type: err.name,
    url: context?.request?.url,
    user_agent: context?.request?.headers.get('user-agent') || undefined,
    ip_hash: ipHash,
    extra_data: context?.extra,
  });
}

/**
 * Get recent errors from the log
 */
export async function getRecentErrors(
  db: any,
  limit: number = 100,
  offset: number = 0
): Promise<{ errors: any[]; total: number }> {
  if (!db) {
    return { errors: [], total: 0 };
  }

  const [errors, countResult] = await Promise.all([
    db.prepare(`
      SELECT * FROM error_log
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all(),
    db.prepare('SELECT COUNT(*) as count FROM error_log').first()
  ]);

  return {
    errors: errors.results || [],
    total: countResult?.count || 0
  };
}

/**
 * Get error counts grouped by endpoint
 */
export async function getErrorStats(db: any): Promise<any[]> {
  if (!db) {
    return [];
  }

  const result = await db.prepare(`
    SELECT
      endpoint,
      COUNT(*) as error_count,
      MAX(created_at) as last_error
    FROM error_log
    WHERE created_at > datetime('now', '-7 days')
    GROUP BY endpoint
    ORDER BY error_count DESC
  `).all();

  return result.results || [];
}

/**
 * Clear old errors (older than specified days)
 */
export async function clearOldErrors(db: any, daysOld: number = 30): Promise<number> {
  if (!db) {
    return 0;
  }

  const result = await db.prepare(`
    DELETE FROM error_log
    WHERE created_at < datetime('now', '-' || ? || ' days')
  `).bind(daysOld).run();

  return result.meta.changes || 0;
}
