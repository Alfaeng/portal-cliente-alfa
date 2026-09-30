import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <section className="py-16 sm:py-24">
        <div className="wrap text-center max-w-[520px] mx-auto">
          <div className="font-jost text-[10px] tracking-[.24em] uppercase text-gold mb-3">
            Página não encontrada
          </div>
          <h1 className="font-jost font-normal text-[26px] sm:text-[32px] leading-tight text-navy mb-4">
            Não encontramos o que você procura
          </h1>
          <p className="text-muted text-[14px] leading-relaxed mb-8">
            O endereço pode estar incorreto ou você não tem acesso a esta página. Volte para o
            início e tente novamente.
          </p>
          <Link
            href="/"
            className="tap-target inline-flex items-center px-6 py-3 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
