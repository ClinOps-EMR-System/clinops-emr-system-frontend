/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

export interface User {
  id: number;
  username?: string;
  name?: string;
  email: string;
  is_active: boolean;
  department?: {
    id: number;
    name: string;
  };
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
    // Load auth from localStorage on mount, then refresh user from API
    const storedToken = localStorage.getItem("clinops_token");
    const storedUser = localStorage.getItem("clinops_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // Re-fetch full user profile to get fresh roles/permissions
        api.get("/user", storedToken)
          .then((res: any) => {
            const fresh = res.data;
            setUser(fresh);
            localStorage.setItem("clinops_user", JSON.stringify(fresh));
          })
          .catch(() => {
            // Token expired or invalid — clear auth
            localStorage.removeItem("clinops_token");
            localStorage.removeItem("clinops_user");
            setToken(null);
            setUser(null);
          })
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem("clinops_token");
        localStorage.removeItem("clinops_user");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Protect routes
    if (!isLoading) {
      const isAuthPage = pathname.startsWith("/auth");
      if (!token && !isAuthPage) {
        router.push("/auth");
      } else if (token && isAuthPage) {
        router.push("/dashboard");
      }
    }
  }, [token, isLoading, pathname, router]);

  // Listen to 401 unauthorized events
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
