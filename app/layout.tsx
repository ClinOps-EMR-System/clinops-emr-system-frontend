import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../store/RoleContext";
import OfflineIndicator from "../components/ui/OfflineIndicator";

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
      className={`${fontClassName} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen flex flex-col bg-[#fcf9f8] text-[#1b1c1c] font-sans"
        suppressHydrationWarning
      >
        <AuthProvider>
          <OfflineIndicator />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
