"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../store/RoleContext";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const departmentName = user?.department?.name || "Clinical Operations";

  // Available clinical modules corresponding to backend routes
  const navLinks: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      name: "Patients Directory",
      href: "/patients",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: "New Patient Intake",
      href: "/patients/register",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-64 bg-brand-dark flex flex-col justify-between h-full flex-shrink-0 border-r border-gray-800 z-20 font-sans">
      <div>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-green rounded flex items-center justify-center text-white font-extrabold text-lg">
              C
            </div>
            <span className="text-white font-bold text-lg tracking-tight">ClinOps EMR</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          <div className="px-6 mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {departmentName}
            </span>
          </div>
          <ul className="space-y-1">
            {navLinks.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-6 py-3 transition-all duration-150 relative ${
                      isActive
                        ? "bg-gray-800/80 text-white font-semibold border-l-4 border-brand-green"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/30"
                    }`}
                  >
                    <span className={`mr-3 ${isActive ? "text-brand-green" : "text-gray-400"}`}>
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-800 text-[10px] text-gray-500 flex items-center gap-1.5 font-mono">
        <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse"></span>
        SYSTEM ONLINE
      </div>
    </aside>
  );
}
