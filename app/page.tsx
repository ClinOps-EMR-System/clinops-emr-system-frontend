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
    <div className="flex h-screen w-full items-center justify-center bg-[#fcf9f8]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent"></div>
    </div>
  );
}
