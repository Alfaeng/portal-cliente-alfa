"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dentroDoLimite, hashParaChave, ipDaRequisicao } from "@/lib/security/rate-limit";

export interface AdminLoginState {
  error?: string;
}

const JANELA_LOGIN_SEGUNDOS = 15 * 60;
const LIMITE_POR_EMAIL = 5;
const LIMITE_POR_IP = 20;

export async function loginAdmin(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { error: "Informe e-mail e senha." };
  }

  const [okIp, okEmail] = await Promise.all([
    dentroDoLimite(`login_admin_ip:${(await ipDaRequisicao())}`, LIMITE_POR_IP, JANELA_LOGIN_SEGUNDOS),
    dentroDoLimite(`login_admin_email:${hashParaChave(email)}`, LIMITE_POR_EMAIL, JANELA_LOGIN_SEGUNDOS),
  ]);
  if (!okIp || !okEmail) {
    return { error: "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  // O middleware leva para a verificação em duas etapas antes do painel.
  redirect("/admin/obras");
}

export async function logoutAdmin() {
  const supabase = createSupabaseServerClient();
  // Encerra a sessão em todos os aparelhos, não só neste.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/admin/login");
}
