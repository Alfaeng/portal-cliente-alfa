"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NivelAcesso } from "@/types/database";

const TODAS_ABAS = [
  { href: "/admin/obras", label: "Obras", niveis: ["editor_obras", "editor_completo", "administrador"] },
  { href: "/admin/pesquisa", label: "Pesquisa", niveis: ["editor_completo", "administrador"] },
  { href: "/admin/clientes", label: "Clientes", niveis: ["administrador"] },
  { href: "/admin/usuarios", label: "Usuários", niveis: ["administrador"] },
  { href: "/admin/auditoria", label: "Auditoria", niveis: ["administrador"] },
] as const;

export function AdminTabs({ nivelAcesso }: { nivelAcesso: NivelAcesso }) {
  const pathname = usePathname();
  const abas = TODAS_ABAS.filter((aba) => (aba.niveis as readonly string[]).includes(nivelAcesso));

  return (
    <div className="flex gap-0.5 bg-[#E3E6EA] p-[3px] rounded-md w-full sm:w-auto overflow-x-auto">
      {abas.map((aba) => {
        const ativo = pathname.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={`tap-target inline-flex items-center text-[12.5px] px-4 py-2 rounded whitespace-nowrap transition-colors ${
              ativo ? "bg-white text-navy" : "text-muted hover:text-navy"
            }`}
          >
            {aba.label}
          </Link>
        );
      })}
    </div>
  );
}
