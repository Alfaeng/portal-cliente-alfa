import { exigirAdmin } from "@/lib/auth/admin-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ACOES: Record<string, string> = {
  insert: "Criou",
  update: "Alterou",
  delete: "Excluiu",
  exportou_pesquisa: "Exportou a pesquisa",
  exportou_dados_titular: "Baixou os dados de um cliente",
};

const TABELAS: Record<string, string> = {
  clientes: "Clientes",
  usuarios_admin: "Usuários do admin",
  cliente_empreendimentos: "Vínculo cliente ↔ obra",
  campanhas_pesquisa: "Pesquisa",
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
}

export default async function AdminAuditoriaPage() {
  await exigirAdmin(["administrador"]);
  const supabase = createSupabaseServerClient();

  const [{ data: eventos }, { data: usuarios }] = await Promise.all([
    supabase
      .from("audit_log")
      .select("id, ocorrido_em, usuario_id, acao, tabela, registro_id, detalhes")
      .order("ocorrido_em", { ascending: false })
      .limit(200),
    supabase.from("usuarios_admin").select("id, nome"),
  ]);

  const nomes = new Map((usuarios ?? []).map((u) => [u.id, u.nome]));

  return (
    <>
      <h2 className="text-[22px] text-navy mb-2">Auditoria</h2>
      <p className="text-[12.5px] text-muted mb-6 max-w-[620px]">
        Registro de quem criou, alterou, excluiu ou exportou dados pessoais. O histórico só cresce: ninguém
        consegue editar ou apagar linhas por aqui. Os dados em si não aparecem, apenas o que mudou.
      </p>
      <div className="bg-surface border border-line rounded p-6 sm:p-8 overflow-x-auto">
        <div className="text-[10px] tracking-[.24em] uppercase text-muted mb-4">
          Últimos {eventos?.length ?? 0} registros
        </div>
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr>
              {["Quando", "Quem", "O quê", "Onde", "Detalhes"].map((h) => (
                <th
                  key={h}
                  className="text-left text-[10px] tracking-[.15em] uppercase text-muted font-medium pb-[11px] pr-3 border-b border-line"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(eventos ?? []).map((e) => {
              const colunas = (e.detalhes as { colunas?: string[]; formato?: string } | null) ?? {};
              return (
                <tr key={e.id}>
                  <td className="py-2.5 pr-3 border-b border-line text-[12.5px] text-muted whitespace-nowrap">
                    {formatarData(e.ocorrido_em)}
                  </td>
                  <td className="py-2.5 pr-3 border-b border-line text-[13px] text-navy">
                    {e.usuario_id ? nomes.get(e.usuario_id) ?? "Usuário removido" : "Sistema"}
                  </td>
                  <td className="py-2.5 pr-3 border-b border-line text-[13px]">{ACOES[e.acao] ?? e.acao}</td>
                  <td className="py-2.5 pr-3 border-b border-line text-[13px] text-muted">
                    {TABELAS[e.tabela ?? ""] ?? e.tabela ?? "—"}
                  </td>
                  <td className="py-2.5 border-b border-line text-[12px] text-muted">
                    {colunas.colunas?.length ? `Campos: ${colunas.colunas.join(", ")}` : colunas.formato ?? ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
