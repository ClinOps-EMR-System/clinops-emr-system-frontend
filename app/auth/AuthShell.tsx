import type { ReactNode } from "react";
import Logo from "@/assets/logo/logo";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="flex min-h-screen w-full">
        <aside className="hidden lg:flex flex-col w-[40%] bg-[#1a1d1c] text-white p-12 justify-between relative overflow-hidden">
          <div className="z-10">
            <div className="flex items-center mb-24">
              <Logo variant="auth" />
            </div>
            <div className="space-y-6 max-w-md">
              <p className="text-brand-green text-sm font-bold tracking-widest uppercase">Must Teaching Hospital</p>
              <h1 className="text-5xl font-bold leading-tight">
                One patient.
                <br />
                One record.
                <br />
                Every ward.
              </h1>
            </div>
          </div>

          <div className="z-10 text-sm font-mono text-gray-500 space-y-1">
            <p>
              SYSTEM STATUS: <span className="text-brand-green font-bold">online</span>
            </p>
          </div>
        </aside>

        <section className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
              <p className="text-gray-500">{subtitle}</p>
            </div>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
