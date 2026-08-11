import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("Failed to load stored auth:", err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrPhone, password) => {
    const cleanInput = String(emailOrPhone || "").trim();
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: cleanInput,
        email: cleanInput,
        phone: cleanInput,
        password
      })
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text || "Server error. Please try again.");
    }

    if (!res.ok) {
      throw new Error(data.msg || "Login failed");
    }

    setToken(data.token);
    setUser(data.user);
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    return data;
  };

  const register = async (fullName, email, phone, password) => {
    const parts = String(fullName || "").trim().split(/\s+/);
    const firstName = parts[0] || "User";
    const lastName = parts.slice(1).join(" ") || "";

    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email: String(email || "").trim(),
        phone: String(phone || "").trim(),
        password
      })
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text || "Server error. Please try again.");
    }

    if (!res.ok) {
      throw new Error(data.msg || "Registration failed");
    }

    // After registration, auto login
    return await login(email, password);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
