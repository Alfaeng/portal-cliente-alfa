import { ObrasTable } from "@/components/admin/ObrasTable";
import { ObraEditor } from "@/components/admin/ObraEditor";
import { listarEmpreendimentosAdmin, buscarEmpreendimentoAdmin } from "@/lib/data/admin-empreendimentos";
import { exigirAdmin } from "@/lib/auth/admin-guard";

export default async function AdminObrasPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const usuario = await exigirAdmin(["editor_obras", "editor_completo", "administrador"]);
  const empreendimentos = await listarEmpreendimentosAdmin();
  const editId = (await searchParams).edit ?? empreendimentos[0]?.id;
  const detalhe = editId ? await buscarEmpreendimentoAdmin(editId) : null;

  return (
    <>
      <h2 className="text-[22px] text-navy mb-6">Empreendimentos</h2>
      <ObrasTable empreendimentos={empreendimentos} nivelAcesso={usuario.nivel_acesso} />
      {detalhe && <ObraEditor key={detalhe.empreendimento.id} detalhe={detalhe} />}
    </>
  );
}
