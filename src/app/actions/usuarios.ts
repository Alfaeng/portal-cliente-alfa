"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/auth/admin-guard";
import { emailSchema, idSchema, campo } from "@/lib/validation";
import type { NivelAcesso } from "@/types/database";

export interface UsuarioFormState {
  error?: string;
  success?: boolean;
}

const NIVEIS_VALIDOS: NivelAcesso[] = ["editor_obras", "editor_completo", "administrador"];

export async function convidarUsuario(
  _prevState: UsuarioFormState,
  formData: FormData
): Promise<UsuarioFormState> {
  const usuarioAtual = await exigirAdmin(["administrador"]);

  const nome = campo(formData, "nome").trim();
  const emailValido = emailSchema.safeParse(campo(formData, "email"));
  const nivel = campo(formData, "nivel_acesso") as NivelAcesso;

  if (nome.length < 2 || nome.length > 100 || !emailValido.success || !NIVEIS_VALIDOS.includes(nivel)) {
    return { error: "Preencha nome, um e-mail válido e o nível de acesso." };
  }
  const email = emailValido.data;

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/set-password`,
  });

  if (error || !data.user) {
    return { error: "Não foi possível enviar o convite. Confira o e-mail informado." };
  }

  const serverSupabase = createSupabaseServerClient();
  const { error: insertError } = await serverSupabase.from("usuarios_admin").insert({
    id: data.user.id,
    nome,
    email,
    nivel_acesso: nivel,
    convite_status: "pendente",
    convidado_por: usuarioAtual.id,
  });

  if (insertError) {
    // Desfaz o convite para não deixar um cadastro "fantasma" no Auth.
    console.error("convidarUsuario: falha ao registrar em usuarios_admin", insertError.message);
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Não foi possível registrar o acesso. O convite foi cancelado, tente de novo." };
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}

export async function reenviarConvite(email: string) {
  await exigirAdmin(["administrador"]);
  if (!emailSchema.safeParse(email).success) return;
  const admin = createSupabaseAdminClient();
  await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/set-password`,
  });
}

export interface UsuarioAcaoState {
  error?: string;
}

async function contarAdministradores(
  supabase: ReturnType<typeof createSupabaseServerClient>
): Promise<number> {
  const { count } = await supabase
    .from("usuarios_admin")
    .select("id", { count: "exact", head: true })
    .eq("nivel_acesso", "administrador");
  return count ?? 0;
}

// Troca o nível de acesso de um usuário já cadastrado. Bloqueia rebaixar
// o último administrador restante — senão ninguém mais consegue gerenciar
// usuários ou a base de clientes.
export async function atualizarNivelAcesso(
  id: string,
  nivel: NivelAcesso
): Promise<UsuarioAcaoState> {
  await exigirAdmin(["administrador"]);
  if (!idSchema.safeParse(id).success) return { error: "Usuário inválido." };
  if (!NIVEIS_VALIDOS.includes(nivel)) return { error: "Nível de acesso inválido." };

  const supabase = createSupabaseServerClient();

  const { data: usuario } = await supabase
    .from("usuarios_admin")
    .select("nivel_acesso")
    .eq("id", id)
    .maybeSingle();

  if (usuario?.nivel_acesso === "administrador" && nivel !== "administrador") {
    const totalAdmins = await contarAdministradores(supabase);
    if (totalAdmins <= 1) {
      return { error: "Precisa existir ao menos um administrador. Torne outra pessoa administradora antes de rebaixar esta." };
    }
  }

  const { error } = await supabase
    .from("usuarios_admin")
    .update({ nivel_acesso: nivel })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar o novo nível de acesso." };

  revalidatePath("/admin/usuarios");
  return {};
}

// Remove o acesso de alguém por completo — cancela um convite pendente
// ou revoga o acesso de quem já estava ativo. Além de tirar da tabela
// usuarios_admin, apaga o usuário no Supabase Auth (senão o convite
// cancelado deixa um cadastro "fantasma" e um novo convite pro mesmo
// e-mail pode falhar).
export async function excluirUsuarioAdmin(formData: FormData): Promise<UsuarioAcaoState> {
  const usuarioAtual = await exigirAdmin(["administrador"]);
  const idEntrada = idSchema.safeParse(campo(formData, "id"));
  if (!idEntrada.success) return {};
  const id = idEntrada.data;

  if (id === usuarioAtual.id) {
    return { error: "Você não pode excluir o seu próprio acesso." };
  }

  const supabase = createSupabaseServerClient();

  const { data: usuario } = await supabase
    .from("usuarios_admin")
    .select("nivel_acesso")
    .eq("id", id)
    .maybeSingle();

  if (usuario?.nivel_acesso === "administrador") {
    const totalAdmins = await contarAdministradores(supabase);
    if (totalAdmins <= 1) {
      return { error: "Precisa existir ao menos um administrador. Torne outra pessoa administradora antes de excluir esta." };
    }
  }

  const { error } = await supabase.from("usuarios_admin").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o usuário." };

  const admin = createSupabaseAdminClient();
  await admin.auth.admin.deleteUser(id);

  revalidatePath("/admin/usuarios");
  return {};
}
