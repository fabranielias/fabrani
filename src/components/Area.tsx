"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { areaDaRota } from "@/lib/nav";

/** Aplica a cor de acento da seção a toda a subárvore. */
export function Area({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  return (
    <div data-area={areaDaRota(pathname)} className={className}>
      {children}
    </div>
  );
}
