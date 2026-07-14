/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export interface User {
  id: number;
  username?: string;
  name?: string;
  email: string;
  is_active: boolean;
  department_id?: number | null;
  department?: {
    id: number;
    name: string;
  } | null;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedToken = localStorage.getItem("clinops_token");
    const storedUser = localStorage.getItem("clinops_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("clinops_token");
        localStorage.removeItem("clinops_user");
      }
    }
    setIsLoading(false);
  }, []);

  // Refresh user data from /api/user if stored user lacks roles/permissions
  useEffect(() => {
    async function refreshUser() {
      if (!token) return;
      const storedUser = localStorage.getItem("clinops_user");
      if (!storedUser) return;
      try {
        const existing = JSON.parse(storedUser);
        if (existing?.roles?.length > 0) return;
      } catch {
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const body = await res.json();
        if (body?.data) {
          const fresh = body.data;
          localStorage.setItem("clinops_user", JSON.stringify(fresh));
          setUser(fresh);
        }
      } catch {
        // silent
      }
    }
    refreshUser();
  }, [token]);

  useEffect(() => {
    if (!isLoading) {
      const isAuthPage = pathname.startsWith("/auth");
      if (!token && !isAuthPage) {
        router.push("/auth");
      } else if (token && isAuthPage) {
        router.push("/dashboard");
      }
    }
  }, [token, isLoading, pathname, router]);

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem("clinops_token");
      localStorage.removeItem("clinops_user");
      setToken(null);
      setUser(null);
      router.push("/auth");
    };

    window.addEventListener("clinops_unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("clinops_unauthorized", handleUnauthorized);
    };
  }, [router]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("clinops_token", newToken);
    localStorage.setItem("clinops_user", JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("clinops_token");
    localStorage.removeItem("clinops_user");
    setToken(null);
    setUser(null);
    router.push("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
