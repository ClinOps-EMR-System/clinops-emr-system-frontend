import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../store/RoleContext";
import OfflineIndicator from "../components/ui/OfflineIndicator";
import KeyboardShortcutsOverlay from "../components/ui/KeyboardShortcutsOverlay";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const fontClassName = "font-sans";

export const metadata: Metadata = {
  title: "ClinOps EMR",
  description: "Clinical Operations Electronic Medical Record System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", fontClassName, "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen flex flex-col bg-[#fcf9f8] text-[#1b1c1c]"
        suppressHydrationWarning
      >
        <AuthProvider>
          <TooltipProvider>
            <OfflineIndicator />
            <KeyboardShortcutsOverlay />
            {children}
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
