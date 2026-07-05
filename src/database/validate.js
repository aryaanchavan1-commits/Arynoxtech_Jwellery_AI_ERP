function sanitizeSql(sql) {
  if (typeof sql !== 'string') throw new Error('SQL must be a string');
  const action = sql.trim().split(/\s+/)[0].toUpperCase();
  const allowed = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'PRAGMA', 'CREATE', 'ALTER', 'DROP', 'BEGIN', 'COMMIT', 'ROLLBACK', 'REINDEX', 'ANALYZE', 'ATTACH', 'DETACH', 'EXPLAIN'];
  if (!allowed.includes(action)) throw new Error(`Disallowed SQL action: ${action}`);
  return sql;
}

function sanitizeParams(params) {
  if (params === null || params === undefined) return [];
  if (!Array.isArray(params)) throw new Error('Params must be an array');
  return params.map(p => {
    if (typeof p === 'string') return p;
    if (typeof p === 'number') return p;
    if (p === null) return null;
    if (p instanceof Date) return p.toISOString();
    if (Buffer.isBuffer(p)) return p;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return String(p);
  });
}

module.exports = { sanitizeSql, sanitizeParams };
