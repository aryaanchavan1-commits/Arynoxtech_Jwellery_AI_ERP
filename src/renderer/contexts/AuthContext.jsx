import React, { createContext, useState, useEffect, useCallback } from 'react';
import { patchElectronAPI, restoreElectronAPI, getAccountValue, getAccountFilter } from '../utils/accountFilter';

export const AuthContext = createContext();

const USERS = [
  { username: 'admin', role: 'white_account', display_name: 'Admin', accountType: 'white', hint: 'Legal/GST books — only white transactions visible' },
  { username: 'black', role: 'black_account', display_name: 'Black', accountType: 'black', hint: 'Actual business books — only black transactions visible' },
  { username: 'superadmin', role: 'admin', display_name: 'Super Admin', accountType: 'admin', hint: 'Full access — sees both white & black books' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setUser(u);
        setIsAuthenticated(true);
        const av = getAccountValue(u);
        if (av !== null && av !== undefined) patchElectronAPI(av);
      } catch (e) {
        localStorage.removeItem('auth_user');
      }
    }
  }, []);

  const login = async (username, password) => {
    try {
      let storedUser = await window.electronAPI.db.get("SELECT * FROM users WHERE username = ?", [username]);
      if (!storedUser) {
        const userDef = USERS.find(u => u.username === username);
        if (!userDef) return { success: false, error: 'Invalid username or password' };
        const hash = await window.electronAPI.auth.hash(password);
        const id = crypto.randomUUID();
        await window.electronAPI.db.run("INSERT INTO users (id, username, password, role, display_name) VALUES (?, ?, ?, ?, ?)",
          [id, username, hash, userDef.role, userDef.display_name]);
        storedUser = await window.electronAPI.db.get("SELECT * FROM users WHERE username = ?", [username]);
      }
      const { matched } = await window.electronAPI.auth.compare(password, storedUser.password);
      if (matched) {
        const u = { ...storedUser, accountType: storedUser.role === 'black_account' ? 'black' : storedUser.role === 'admin' ? 'admin' : 'white' };
        setUser(u);
        setIsAuthenticated(true);
        localStorage.setItem('auth_user', JSON.stringify(u));
        const av = getAccountValue(u);
        if (av !== null && av !== undefined) patchElectronAPI(av);
        return { success: true, user: u };
      }
      return { success: false, error: 'Invalid username or password' };
    } catch (e) {
      return { success: false, error: 'Invalid username or password' };
    }
  };

  const logout = () => {
    restoreElectronAPI();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_user');
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const storedUser = await window.electronAPI.db.get("SELECT * FROM users WHERE username = ?", [user?.username]);
      if (!storedUser) return { success: false, error: 'User not found' };
      const { matched } = await window.electronAPI.auth.compare(oldPassword, storedUser.password);
      if (!matched) return { success: false, error: 'Current password is incorrect' };
      const hash = await window.electronAPI.auth.hash(newPassword);
      await window.electronAPI.db.run("UPDATE users SET password = ? WHERE username = ?", [hash, user.username]);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}
