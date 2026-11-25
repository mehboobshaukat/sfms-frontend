import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/auth";
import { usersApi } from "../api/users";
import { sessionEndMessage, tokenStore } from "../api/client";
import { configureCurrency } from "../lib/formatters";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const signedOut = useCallback(() => {
    configureCurrency(null);
    setUser(null);
  }, []);

  // Page load / reload: the access token lives in memory only, so ask the backend for a fresh one
  // using the HttpOnly refresh cookie. Visitors who never signed in skip the call.
  const loadUser = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      if (!tokenStore.mayHaveSession()) {
        signedOut();
        setLoading(false);
        return;
      }
      try {
        await authApi.restoreSession();
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) tokenStore.clear();
        signedOut();
        setLoading(false);
        return;
      }
    }
    try {
      const me = await usersApi.me();
      configureCurrency(me);
      setUser(me);
    } catch {
      signedOut();
    } finally {
      setLoading(false);
    }
  }, [signedOut]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // The session ended somewhere (refresh refused, logout in another tab, ...): drop to the login page
  // with a clear explanation instead of failing silently.
  useEffect(() => {
    const onEnded = (ev) => {
      const code = ev.detail?.code;
      signedOut();
      if (code && code !== "logged_out") setNotice(sessionEndMessage(code));
    };
    window.addEventListener("sfms:session-ended", onEnded);
    return () => window.removeEventListener("sfms:session-ended", onEnded);
  }, [signedOut]);

  const login = async (email, password) => {
    await authApi.login({ email, password });
    const me = await usersApi.me();
    configureCurrency(me);
    setUser(me);
    setNotice("");
    return me;
  };

  /** After an external sign-in (Google) already created the session: just load the profile. */
  const finishLogin = async () => {
    const me = await usersApi.me();
    configureCurrency(me);
    setUser(me);
    setNotice("");
    return me;
  };

  const register = async (payload) => {
    return authApi.register(payload);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      signedOut();
    }
  };

  const refreshProfile = async () => {
    const me = await usersApi.me();
    configureCurrency(me);
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider
      value={{
        user, loading, notice, clearNotice: () => setNotice(""),
        isAuthenticated: !!user, login, finishLogin, register, logout, refreshProfile,
      }}
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
