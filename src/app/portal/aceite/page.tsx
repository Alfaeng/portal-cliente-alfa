import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AceiteForm } from "@/components/cliente/AceiteForm";
import { CLIENTE_SESSION_COOKIE, lerSessaoCliente } from "@/lib/auth/cliente-session";
import { clienteAceitouPolitica } from "@/lib/lgpd";

export default async function AceitePage() {
  const sessao = await lerSessaoCliente((await cookies()).get(CLIENTE_SESSION_COOKIE)?.value);
  if (!sessao) redirect("/");
  if (await clienteAceitouPolitica(sessao.clienteId)) redirect("/portal");

  return (
    <>
      <SiteHeader />
      <section className="py-11 sm:py-16">
        <div className="wrap max-w-[560px]">
          <div className="font-jost text-[10px] tracking-[.24em] uppercase text-gold mb-3">
            Antes de continuar
          </div>
          <h1 className="font-jost font-normal text-[24px] sm:text-[28px] leading-tight text-navy mb-5">
            Sua privacidade no Portal do Cliente
          </h1>
          <div className="bg-surface border border-line rounded p-6 sm:p-8">
            <p className="text-[14px] text-[#3C4148] leading-relaxed mb-4">
              Para mostrar o andamento da sua obra, a Alfa usa alguns dos seus dados: seu nome, seu
              CPF (guardado de forma protegida, sem que o número completo fique visível), e-mail e
              telefone, além das respostas que você der às pesquisas de satisfação.
            </p>
            <p className="text-[14px] text-[#3C4148] leading-relaxed mb-4">
              Você pode pedir a qualquer momento uma cópia dos seus dados, a correção ou a exclusão
              deles. Os detalhes estão na nossa política.
            </p>
            <p className="text-[13px] text-muted mb-6">
              <Link href="/privacidade" target="_blank" className="text-navy underline">
                Política de Privacidade
              </Link>
              {" · "}
              <Link href="/termos" target="_blank" className="text-navy underline">
                Termos de Uso
              </Link>
            </p>
            <AceiteForm />
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
