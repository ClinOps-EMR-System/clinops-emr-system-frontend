import type { ReactNode } from "react";

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
          <div className="absolute -bottom-64 -right-64 w-[800px] h-[800px] rounded-full border border-gray-700/30 pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full border border-gray-700/30 pointer-events-none" />

          <div className="z-10">
            <div className="flex items-center space-x-3 mb-24">
              <div className="w-10 h-10 bg-[#00a651] rounded-md flex items-center justify-center font-bold text-xl">
                C
              </div>
              <span className="text-xl font-semibold tracking-wide">ClinOps EMR</span>
            </div>
            <div className="space-y-6 max-w-md">
              <p className="text-[#00a651] text-sm font-bold tracking-widest uppercase">Must Teaching Hospital</p>
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
              SYSTEM STATUS: <span className="text-[#00a651] font-bold">online</span>
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
