import { createContext, useState, useEffect } from "react";
import { apiUrl } from "../utils/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem("user")) || null
  );

  const [token, setToken] = useState(
    () => localStorage.getItem("token") || ""
  );
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem("token"));

  
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      if (!token) {
        if (isMounted) setAuthReady(true);
        return;
      }

      try {
        const res = await fetch(apiUrl("/api/auth/me"), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok && isMounted) {
          const freshUser = await res.json();
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }
      } finally {
        if (isMounted) setAuthReady(true);
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = (userData, tokenValue) => {
    setUser(userData);
    setToken(tokenValue);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", tokenValue);
    setAuthReady(true);
  };

  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setAuthReady(true);
  };

  const refreshUser = async () => {
    const activeToken = localStorage.getItem("token") || token;
    if (!activeToken) return null;

    const res = await fetch(apiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${activeToken}` }
    });

    if (!res.ok) return null;

    const freshUser = await res.json();
    setUser(freshUser);
    localStorage.setItem("user", JSON.stringify(freshUser));
    return freshUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authReady,
        setUser,
        setToken,  
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
