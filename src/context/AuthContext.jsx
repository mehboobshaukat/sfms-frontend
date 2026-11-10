import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/auth";
import { usersApi } from "../api/users";
import { tokenStore } from "../api/client";
import { configureCurrency } from "../lib/formatters";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      configureCurrency(null);
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await usersApi.me();
      configureCurrency(me);
      setUser(me);
    } catch {
      tokenStore.clear();
      configureCurrency(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    await authApi.login({ email, password });
    const me = await usersApi.me();
    configureCurrency(me);
    setUser(me);
    return me;
  };

  const register = async (payload) => {
    return authApi.register(payload);
  };

  const logout = async () => {
    await authApi.logout();
    configureCurrency(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    const me = await usersApi.me();
    configureCurrency(me);
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, login, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
