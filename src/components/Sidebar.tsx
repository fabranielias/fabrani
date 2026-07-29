"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  Building2,
  ClipboardCheck,
  Database,
  FolderOpen,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Scale,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { MENU } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONES: Record<string, LucideIcon> = {
  LayoutDashboard,
  Gauge,
  Building2,
  Scale,
  ClipboardCheck,
  Users,
  GraduationCap,
  Database,
  FolderOpen,
  BookMarked,
  Settings,
  Sparkles,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu principal" className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <div className="px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Fabrani</p>
        <p className="mt-0.5 text-sm font-semibold text-white">Gestão MEC/INEP</p>
      </div>

      {MENU.map((grupo) => {
        const Icone = ICONES[grupo.icone] ?? LayoutDashboard;
        return (
          <div key={grupo.rotulo}>
            <p className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Icone size={13} aria-hidden />
              {grupo.rotulo}
            </p>
            <ul className="space-y-0.5">
              {grupo.itens.map((item) => {
                const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors",
                        ativo ? "bg-slate-700/80 font-medium text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                      )}
                    >
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
