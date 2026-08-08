import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('sawsUser') || 'null'));

  const login = useCallback((nextUser) => {
    localStorage.setItem('sawsUser', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sawsUser');
    setUser(null);
  }, []);

  const authedQuery = useMemo(
    () => (user ? `userId=${encodeURIComponent(user.userId)}&role=${user.role}` : ''),
    [user]
  );

  const value = useMemo(() => ({ user, login, logout, authedQuery }), [user, login, logout, authedQuery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
