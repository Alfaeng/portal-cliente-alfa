import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { VERSAO_POLITICA } from "@/lib/lgpd";

export function PaginaLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <section className="py-11 sm:py-16">
        <div className="wrap max-w-[720px]">
          <div className="font-jost text-[10px] tracking-[.24em] uppercase text-gold mb-3">
            Versão {VERSAO_POLITICA}
          </div>
          <h1 className="font-jost font-normal text-[26px] sm:text-[32px] leading-tight text-navy mb-6">
            {titulo}
          </h1>
          <p className="text-[12px] text-[#8A5252] bg-[#F7EEEE] border border-[#E6D2D2] rounded px-3.5 py-2.5 mb-8 leading-relaxed">
            Documento em elaboração: os trechos entre colchetes [PREENCHER] e todo o texto precisam da
            revisão do jurídico da Alfa antes do lançamento aos clientes.
          </p>
          <div className="text-[14px] text-[#3C4148] leading-[1.75] [&_h2]:font-jost [&_h2]:font-normal [&_h2]:text-[18px] [&_h2]:text-navy [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1">
            {children}
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
