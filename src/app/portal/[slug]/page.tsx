import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ServicosBand } from "@/components/site/ServicosBand";
import { ProgressDonut } from "@/components/cliente/ProgressDonut";
import { StageBar } from "@/components/cliente/StageBar";
import { Gallery } from "@/components/cliente/Gallery";
import { buscarEmpreendimentoPorSlug } from "@/lib/data/empreendimentos";
import { CLIENTE_SESSION_COOKIE, lerSessaoCliente } from "@/lib/auth/cliente-session";
import { clienteAceitouPolitica } from "@/lib/lgpd";
import { formatDateLong } from "@/lib/utils";

// Sem isso, o Next tende a cachear esta página estaticamente na primeira
// visita (a busca usa a service role key, sem cookies() / headers(), então
// o Next não percebe sozinho que os dados mudam a cada edição no admin).
// Resultado: a obra ficava "congelada" no estado de quando foi vista pela
// primeira vez, mesmo depois de salvar novas etapas/fotos no admin.
export const dynamic = "force-dynamic";

export default async function EmpreendimentoPage({ params }: { params: Promise<{ slug: string }> }) {
  const sessao = await lerSessaoCliente((await cookies()).get(CLIENTE_SESSION_COOKIE)?.value);
  if (!sessao) notFound();

  if (!(await clienteAceitouPolitica(sessao.clienteId))) redirect("/portal/aceite");

  const detalhe = await buscarEmpreendimentoPorSlug((await params).slug, sessao.clienteId);
  if (!detalhe) notFound();

  const { empreendimento, etapasVisiveis, fotos } = detalhe;

  return (
    <>
      <SiteHeader />

      <div className="wrap pt-7">
        <div className="text-xs text-muted">
          <Link href="/portal" className="hover:text-navy transition-colors">
            Portal do Cliente
          </Link>{" "}
          <span className="text-gold">/</span> {empreendimento.nome}
        </div>
      </div>

      <div className="wrap pt-6 pb-10 sm:pb-12">
        <h1 className="font-jost font-normal text-[26px] sm:text-[34px] text-navy mb-2">
          {empreendimento.nome}
        </h1>
        <div className="text-muted text-[13px] mb-6">
          {empreendimento.bairro} · {empreendimento.cidade}, {empreendimento.estado}
        </div>
        {empreendimento.texto_atualizacao && (
          <p className="max-w-[640px] text-[#3C4148] leading-[1.75] m-0">
            {empreendimento.texto_atualizacao}
          </p>
        )}
        <div className="inline-block mt-5 text-[11px] tracking-[.1em] uppercase text-muted border border-line rounded-full px-3.5 py-1.5 bg-surface">
          Atualizado em {formatDateLong(empreendimento.atualizado_em)}
        </div>
      </div>

      <div className="wrap pb-14 sm:pb-16">
        <div className="bg-surface border border-line rounded p-6 sm:p-11">
          <ProgressDonut percentual={empreendimento.avanco_geral} />
          {etapasVisiveis.map((etapa) => (
            <StageBar key={etapa.id} nome={etapa.nome} percentual={etapa.percentual} />
          ))}
        </div>
      </div>

      <section className="pt-0 pb-11 sm:pb-16">
        <div className="wrap">
          <div className="w-14 h-0.5 bg-gold mb-5" />
          <h2 className="font-jost font-normal text-[22px] sm:text-[26px] leading-tight text-navy max-w-[520px] mb-8 sm:mb-[34px]">
            Como está a obra agora
          </h2>
          <Gallery fotos={fotos} />
        </div>
      </section>

      <ServicosBand />
      <SiteFooter />
    </>
  );
}
