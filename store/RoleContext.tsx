"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: number;
  username?: string;
  name?: string;
  email: string;
  is_active: boolean;
  role?: string;
  department?: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  activeRole: string;
  setActiveRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRoleState] = useState<string>("clerk");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load auth from localStorage on mount
    const storedToken = localStorage.getItem("clinops_token");
    const storedUser = localStorage.getItem("clinops_user");
    const storedRole = localStorage.getItem("clinops_active_role");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Default to stored role, or user role, or fallback to clerk
        setActiveRoleState(storedRole || parsedUser.role || "clerk");
      } catch (e) {
        localStorage.removeItem("clinops_token");
        localStorage.removeItem("clinops_user");
        localStorage.removeItem("clinops_active_role");
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
        router.push("/dashboard");
      }
    }
  }, [token, isLoading, pathname, router]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("clinops_token", newToken);
    localStorage.setItem("clinops_user", JSON.stringify(newUser));
    const initialRole = newUser.role || "clerk";
    localStorage.setItem("clinops_active_role", initialRole);
    
    setToken(newToken);
    setUser(newUser);
    setActiveRoleState(initialRole);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("clinops_token");
    localStorage.removeItem("clinops_user");
    localStorage.removeItem("clinops_active_role");
    setToken(null);
    setUser(null);
    setActiveRoleState("clerk");
    router.push("/auth");
  };

  const setActiveRole = (role: string) => {
    localStorage.setItem("clinops_active_role", role);
    setActiveRoleState(role);
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
        activeRole,
        setActiveRole,
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
