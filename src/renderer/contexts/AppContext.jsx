import React, { createContext, useState, useCallback } from 'react';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notifications, setNotifications] = useState([]);
  const [theme, setTheme] = useState('dark');

  const addNotification = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const dbQuery = useCallback(async (sql, params = []) => {
    try {
      return await window.electronAPI.db.all(sql, params);
    } catch (err) {
      console.error('DB Error:', err);
      addNotification(err.message, 'error');
      return [];
    }
  }, [addNotification]);

  const dbRun = useCallback(async (sql, params = []) => {
    try {
      return await window.electronAPI.db.run(sql, params);
    } catch (err) {
      console.error('DB Error:', err);
      addNotification(err.message, 'error');
      return null;
    }
  }, [addNotification]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatWeight = (weight) => {
    return (weight || 0).toFixed(3) + ' g';
  };

  return (
    <AppContext.Provider value={{
      pageTitle, setPageTitle,
      currentDate,
      notifications, addNotification,
      dbQuery, dbRun,
      formatCurrency, formatWeight
    }}>
      {children}
    </AppContext.Provider>
  );
}
