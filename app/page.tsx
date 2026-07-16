"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../store/RoleContext";

export default function Home() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (token) {
        router.push("/dashboard");
      } else {
        router.push("/auth");
      }
    }
  }, [token, isLoading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F3F3F3] font-sans">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-teal border-t-transparent"></div>
    </div>
  );
}
