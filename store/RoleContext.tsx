/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

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
  roles?: string[];
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
    // Load auth from localStorage on mount
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

  useEffect(() => {
    // Protect routes
    if (!isLoading) {
      const isAuthPage = pathname.startsWith("/auth");
      if (!token && !isAuthPage) {
        router.push("/auth");
      } else if (token && isAuthPage) {
        router.push(getLandingPage(user));
      }
    }
  }, [token, isLoading, pathname, router, user]);

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

  function getLandingPage(u: User | null): string {
    const roles = (u?.roles || []).map((r) => r.toLowerCase());
    const dept = u?.department?.name?.toLowerCase() || "";

    if (roles.includes("receptionist") || dept.includes("registration") || dept.includes("reception")) return "/receptionist";
    if (roles.includes("nurse") || dept.includes("nurse") || dept.includes("triage")) return "/nurse-station";
    if (roles.includes("pharmacist") || dept.includes("pharm")) return "/pharmacy";
    if (roles.includes("lab technician") || roles.includes("lab") || dept.includes("lab")) return "/lab";
    if (roles.includes("billing officer") || roles.includes("billing") || dept.includes("bill") || dept.includes("finance")) return "/billing";
    return "/dashboard";
  }

  const login = async (newToken: string, newUser: User) => {
    localStorage.setItem("clinops_token", newToken);
    setToken(newToken);

    let finalUser: User = newUser;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"}/user`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        finalUser = data;
        localStorage.setItem("clinops_user", JSON.stringify(data));
        setUser(data);
      } else {
        throw new Error("me endpoint returned non-ok");
      }
    } catch {
      localStorage.setItem("clinops_user", JSON.stringify(newUser));
      setUser(newUser);
    }

    // Determine redirect based on role
    router.push(getLandingPage(finalUser));
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
