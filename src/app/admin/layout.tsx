import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { logoutAdmin } from "@/app/actions/admin-auth";
import { ALFA_LOGO_URL } from "@/lib/site-content";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // O middleware já garante que qualquer rota /admin/* (exceto /admin/login)
  // só é alcançada com uma sessão válida. Aqui só buscamos o usuário sem
  // redirecionar — se não houver sessão, estamos na tela de login, que
  // tem seu próprio layout de página inteira (sem o "chrome" do admin).
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  // Sem o segundo fator (código do app), mostra só a tela de verificação,
  // sem o menu do admin.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    return <>{children}</>;
  }

  const { data: usuario } = await supabase
    .from("usuarios_admin")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!usuario) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#EDEFF2]">
      <div className="bg-navy">
        <div className="wrap flex items-center justify-between gap-4 py-3">
          <span className="inline-flex items-center gap-2">
            <Image src={ALFA_LOGO_URL} alt="Alfa Engenharia" width={64} height={18} className="h-4 w-auto" unoptimized />
            <span className="text-white/40 text-[11px] tracking-[.2em] uppercase">Admin</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-white/70 text-[12px] hidden sm:inline">{usuario.nome}</span>
            <form action={logoutAdmin}>
              <button className="tap-target text-[12px] text-white/60 hover:text-white transition-colors">
                Sair
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="py-9 sm:py-11">
        <div className="wrap">
          <div className="mb-6">
            <AdminTabs nivelAcesso={usuario.nivel_acesso} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
