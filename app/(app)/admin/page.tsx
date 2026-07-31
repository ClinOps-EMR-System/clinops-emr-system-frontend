"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /admin → dedicated System Admin shell */
export default function LegacyAdminRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/system");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Redirecting to System Admin…
    </div>
  );
}
