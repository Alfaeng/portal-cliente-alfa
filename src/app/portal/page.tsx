import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ServicosBand } from "@/components/site/ServicosBand";
import { EmpreendimentoCard } from "@/components/cliente/EmpreendimentoCard";
import { SurveyBanner } from "@/components/cliente/SurveyBanner";
import { LogoutButton } from "@/components/cliente/LogoutButton";
import { CLIENTE_SESSION_COOKIE, lerSessaoCliente } from "@/lib/auth/cliente-session";
import { clienteAceitouPolitica } from "@/lib/lgpd";
import { listarEmpreendimentosDoCliente } from "@/lib/data/empreendimentos";
import { buscarCampanhaAtiva, clienteJaRespondeu } from "@/lib/data/pesquisa";

export default async function PortalPage() {
  const token = (await cookies()).get(CLIENTE_SESSION_COOKIE)?.value;
  const sessao = await lerSessaoCliente(token);
  // Antes de mostrar qualquer obra, o cliente precisa ter tomado ciência da política atual.
  if (sessao && !(await clienteAceitouPolitica(sessao.clienteId))) redirect("/portal/aceite");

  const primeiroNome = sessao?.nome?.split(" ")[0] ?? "";

  const [empreendimentos, campanha] = await Promise.all([
    sessao ? listarEmpreendimentosDoCliente(sessao.clienteId) : Promise.resolve([]),
    buscarCampanhaAtiva(),
  ]);

  const jaRespondeu =
    campanha && sessao ? await clienteJaRespondeu(campanha.id, sessao.clienteId) : false;

  return (
    <>
      <SiteHeader />

      <section className="py-11 sm:py-16">
        <div className="wrap">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="font-jost text-[10px] tracking-[.24em] uppercase text-muted">
              Olá, {primeiroNome}
            </div>
            <LogoutButton />
          </div>
          <h2 className="font-jost font-normal text-[22px] sm:text-[26px] leading-tight text-navy max-w-[520px] mb-8 sm:mb-[34px]">
            Escolha o seu empreendimento para acompanhar
          </h2>

          {empreendimentos.length === 0 ? (
            <p className="text-muted text-sm">
              Ainda não há nenhum empreendimento vinculado ao seu cadastro. Fale com a Alfa para mais informações.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-[18px]">
              {empreendimentos.map((emp) => (
                <EmpreendimentoCard key={emp.id} empreendimento={emp} />
              ))}
            </div>
          )}
        </div>
      </section>

      {campanha && (
        <section className="pt-0 pb-11 sm:pb-16">
          <div className="wrap">
            <SurveyBanner campanhaId={campanha.id} pergunta={campanha.pergunta} jaRespondeu={jaRespondeu} />
          </div>
        </section>
      )}

      <ServicosBand />
      <SiteFooter />
    </>
  );
}
