"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CLIENTE_SESSION_COOKIE, lerSessaoCliente } from "@/lib/auth/cliente-session";
import { VERSAO_POLITICA } from "@/lib/lgpd";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AceiteState {
  error?: string;
}

export async function aceitarPolitica(
  _prevState: AceiteState,
  _formData: FormData
): Promise<AceiteState> {
  const sessao = await lerSessaoCliente((await cookies()).get(CLIENTE_SESSION_COOKIE)?.value);
  if (!sessao) redirect("/");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("aceites_termos")
    .upsert(
      { cliente_id: sessao.clienteId, versao: VERSAO_POLITICA },
      { onConflict: "cliente_id,versao", ignoreDuplicates: true }
    );

  if (error) {
    console.error("aceitarPolitica", error.message);
    return { error: "Não foi possível registrar agora. Tente novamente em instantes." };
  }

  redirect("/portal");
}
