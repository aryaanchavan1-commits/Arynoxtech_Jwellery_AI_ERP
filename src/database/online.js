const { createClient } = require('@libsql/client');

let tursoClient = null;

async function initOnlineDB(url, token) {
  const Store = require('electron-store');
  const store = new Store();
  const config = store.get('config', {});

  const tursoUrl = url || config.tursoUrl;
  const tursoToken = token || config.tursoToken;

  if (!tursoUrl || !tursoToken) {
    console.log('Turso not configured, using offline mode');
    return null;
  }

  try {
    tursoClient = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
    await tursoClient.execute('SELECT 1');
    console.log('Turso connected successfully');
    return tursoClient;
  } catch (err) {
    console.error('Turso connection failed:', err.message);
    tursoClient = null;
    throw err;
  }
}

async function syncToTurso(table, data) {
  if (!tursoClient) throw new Error('Turso not connected');
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(',');
  const updates = keys.map(k => `${k} = excluded.${k}`).join(',');
  await tursoClient.execute({
    sql: `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
    args: values
  });
}

async function syncFromTurso(table, lastSync) {
  if (!tursoClient) throw new Error('Turso not connected');
  const result = await tursoClient.execute({
    sql: `SELECT * FROM "${table}" WHERE updated_at > ? ORDER BY updated_at ASC`,
    args: [lastSync]
  });
  return result.rows.map(row => {
    if (typeof row.toJSON === 'function') return row.toJSON();
    return row;
  });
}

function getTursoClient() {
  return tursoClient;
}

module.exports = { initOnlineDB, syncToTurso, syncFromTurso, getTursoClient };
