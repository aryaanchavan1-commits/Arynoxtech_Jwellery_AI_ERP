export function getAccountFilter(user) {
  if (!user) return { clause: '', params: [] };
  if (user.role === 'admin') return { clause: '', params: [] };
  if (user.accountType === 'black') return { clause: 'AND (is_black_account = 1 OR is_black_account IS NULL)', params: [] };
  return { clause: 'AND (is_black_account = 0 OR is_black_account IS NULL)', params: [] };
}

export function getAccountValue(user) {
  if (!user) return 0;
  if (user.role === 'admin') return null;
  return user.accountType === 'black' ? 1 : 0;
}

const ACCOUNT_FILTER_COLS = ['transactions', 'parties', 'items', 'ledgers', 'companies'];

function getFilteredSQL(sql, params, accountValue) {
  if (accountValue === null || accountValue === undefined) return { sql, params };

  const upper = sql.trim().toUpperCase();

  if (upper.startsWith('SELECT')) {
    let modified = false;
    for (const col of ACCOUNT_FILTER_COLS) {
      const regex = new RegExp(`\\bFROM\\s+${col}\\b`, 'i');
      if (regex.test(sql)) {
        const whereIdx = sql.toUpperCase().search(/\bWHERE\b/);
        if (whereIdx === -1) {
          const orderIdx = sql.toUpperCase().search(/\bORDER\s+BY\b/);
          const limitIdx = sql.toUpperCase().search(/\bLIMIT\b/);
          const insertAt = Math.min(
            orderIdx > -1 ? orderIdx : Infinity,
            limitIdx > -1 ? limitIdx : Infinity
          );
          if (insertAt < Infinity) {
            sql = sql.slice(0, insertAt) + ` WHERE is_black_account = ${accountValue} ` + sql.slice(insertAt);
          } else {
            sql = sql + ` WHERE is_black_account = ${accountValue}`;
          }
        } else {
          sql = sql.slice(0, whereIdx + 5) + ` is_black_account = ${accountValue} AND ` + sql.slice(whereIdx + 5);
        }
        modified = true;
        break;
      }
    }
    if (!modified) {
      for (const col of ACCOUNT_FILTER_COLS) {
        const joinRegex = new RegExp(`\\bJOIN\\s+${col}\\b`, 'i');
        if (joinRegex.test(sql)) {
          if (upper.includes('WHERE')) {
            sql = sql.replace(/\bWHERE\b/i, `WHERE ${col}.is_black_account = ${accountValue} AND `);
          } else {
            sql = sql + ` AND ${col}.is_black_account = ${accountValue}`;
          }
          break;
        }
      }
    }
    return { sql, params };
  }

  if (upper.startsWith('INSERT')) {
    const match = sql.match(/INSERT\s+INTO\s+(\w+)/i);
    if (match && ACCOUNT_FILTER_COLS.includes(match[1].toLowerCase())) {
      const table = match[1];
      if (upper.includes('(') && !upper.includes('SELECT')) {
        const colMatch = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
        if (colMatch && !colMatch[1].toLowerCase().includes('is_black_account')) {
          sql = sql.replace(/\(([^)]+)\)/, `($1, is_black_account)`);
          sql = sql.replace(/VALUES\s*\(([^)]+)\)/i, (m, vals) => {
            return `VALUES (${vals}, ${accountValue})`;
          });
        }
      }
    }
    return { sql, params };
  }

  if (upper.startsWith('UPDATE')) {
    const match = sql.match(/UPDATE\s+(\w+)/i);
    if (match && ACCOUNT_FILTER_COLS.includes(match[1].toLowerCase())) {
      if (upper.includes('WHERE')) {
        sql = sql.replace(/\bWHERE\b/i, `WHERE is_black_account = ${accountValue} AND `);
      } else {
        sql = sql + ` WHERE is_black_account = ${accountValue}`;
      }
    }
    return { sql, params };
  }

  return { sql, params };
}

export function patchElectronAPI(accountValue) {
  if (!window.electronAPI || !window.electronAPI.db) return;

  const orig = {
    all: window.electronAPI.db.all,
    get: window.electronAPI.db.get,
    run: window.electronAPI.db.run,
  };

  window.electronAPI.db.all = async (sql, params) => {
    const { sql: filteredSQL } = getFilteredSQL(sql, params, accountValue);
    return orig.all(filteredSQL, params);
  };

  window.electronAPI.db.get = async (sql, params) => {
    const { sql: filteredSQL } = getFilteredSQL(sql, params, accountValue);
    return orig.get(filteredSQL, params);
  };

  window.electronAPI.db.run = async (sql, params) => {
    const { sql: filteredSQL } = getFilteredSQL(sql, params, accountValue);
    return orig.run(filteredSQL, params);
  };
}

export function restoreElectronAPI() {
  if (!window.electronAPI || !window.electronAPI.db) return;
  if (window.__origDB) {
    window.electronAPI.db.all = window.__origDB.all;
    window.electronAPI.db.get = window.__origDB.get;
    window.electronAPI.db.run = window.__origDB.run;
  }
}
