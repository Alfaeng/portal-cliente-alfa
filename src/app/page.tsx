import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ServicosBand } from "@/components/site/ServicosBand";
import { SobreAccordion } from "@/components/site/SobreAccordion";
import { DestaquesSemana } from "@/components/site/DestaquesSemana";
import { CpfLoginForm } from "@/components/cliente/CpfLoginForm";
import { CLIENTE_SESSION_COOKIE, lerSessaoCliente } from "@/lib/auth/cliente-session";

export default async function LoginPage() {
  const token = (await cookies()).get(CLIENTE_SESSION_COOKIE)?.value;
  const sessao = await lerSessaoCliente(token);
  if (sessao) redirect("/portal");

  return (
    <>
      <SiteHeader />

      <div className="bg-surface border-b border-line">
        <div className="wrap py-10 sm:py-[68px]">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-14 items-center">
            <div>
              <div className="font-jost text-[10px] tracking-[.24em] uppercase text-muted mb-3">
                Portal do Cliente
              </div>
              <h1 className="font-jost font-normal text-[29px] sm:text-[38px] leading-[1.18] text-navy mb-4">
                Acompanhe sua obra de onde você estiver
              </h1>
              <p className="text-muted max-w-[400px] m-0">
                Informe seu CPF para ver o andamento atualizado do seu empreendimento, etapa por
                etapa, com as fotos mais recentes.
              </p>
            </div>
            <CpfLoginForm />
          </div>
        </div>
      </div>

      <DestaquesSemana />
      <ServicosBand />
      <SobreAccordion />
      <SiteFooter />
    </>
  );
}
