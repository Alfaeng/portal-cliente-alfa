"use client";

import { useState, useTransition } from "react";
import { atualizarCliente, atualizarVinculosCliente, excluirCliente } from "@/app/actions/clientes";
import type { Cliente } from "@/types/database";

function formatCpf(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export interface ObraOpcao {
  id: string;
  nome: string;
}

export function ClienteRow({
  cliente,
  obras,
  obrasVinculadas,
}: {
  cliente: Cliente;
  obras: ObraOpcao[];
  obrasVinculadas: string[];
}) {
  const [selecionadas, setSelecionadas] = useState<string[]>(obrasVinculadas);
  const nomesVinculados = obras.filter((o) => obrasVinculadas.includes(o.id)).map((o) => o.nome);

  const [editando, setEditando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [nome, setNome] = useState(cliente.nome);
  const [email, setEmail] = useState(cliente.email ?? "");
  const [telefone, setTelefone] = useState(cliente.telefone ?? "");
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  async function handleExcluir() {
    const ok = window.confirm(`Excluir o cliente "${cliente.nome}"? Essa ação não pode ser desfeita.`);
    if (!ok) return;

    setExcluindo(true);
    setErroExclusao(null);
    const resultado = await excluirCliente(cliente.id);
    if (resultado.error) {
      setErroExclusao(resultado.error);
      setExcluindo(false);
    }
    // Em caso de sucesso a linha some sozinha quando a lista revalidar.
  }

  if (editando) {
    return (
      <tr>
        <td className="py-2.5 pr-3 border-b border-line">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border border-line rounded px-2 py-1.5 text-[13.5px]"
          />
        </td>
        <td className="py-2.5 pr-3 border-b border-line text-muted text-[13.5px]">
          {formatCpf(cliente.cpf)}
        </td>
        <td className="py-2.5 pr-3 border-b border-line">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="—"
            className="w-full border border-line rounded px-2 py-1.5 text-[13.5px]"
          />
        </td>
        <td className="py-2.5 pr-3 border-b border-line">
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="—"
            className="w-full border border-line rounded px-2 py-1.5 text-[13.5px]"
          />
        </td>
        <td className="py-2.5 pr-3 border-b border-line text-[13px]">
          {obras.length === 0 && <span className="text-muted">Nenhum empreendimento cadastrado</span>}
          {obras.map((obra) => (
            <label key={obra.id} className="flex items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={selecionadas.includes(obra.id)}
                onChange={(e) =>
                  setSelecionadas((atual) =>
                    e.target.checked ? [...atual, obra.id] : atual.filter((id) => id !== obra.id)
                  )
                }
              />
              {obra.nome}
            </label>
          ))}
        </td>
        <td className="py-2.5 border-b border-line text-[13.5px] whitespace-nowrap">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await atualizarCliente(cliente.id, nome, email, telefone);
                await atualizarVinculosCliente(cliente.id, selecionadas);
              });
              setEditando(false);
            }}
            className="text-navy hover:text-gold active:text-gold transition-colors disabled:opacity-50 mr-3"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => {
              setNome(cliente.nome);
              setEmail(cliente.email ?? "");
              setTelefone(cliente.telefone ?? "");
              setSelecionadas(obrasVinculadas);
              setEditando(false);
            }}
            className="text-muted hover:text-navy transition-colors"
          >
            Cancelar
          </button>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr>
        <td className="py-3 pr-3 border-b border-line text-navy font-medium text-[13.5px]">
          {cliente.nome}
        </td>
        <td className="py-3 pr-3 border-b border-line text-muted text-[13.5px]">
          {formatCpf(cliente.cpf)}
        </td>
        <td className="py-3 pr-3 border-b border-line text-muted text-[13.5px]">
          {cliente.email ?? "—"}
        </td>
        <td className="py-3 pr-3 border-b border-line text-muted text-[13.5px]">
          {cliente.telefone ?? "—"}
        </td>
        <td className="py-3 pr-3 border-b border-line text-[13px]">
          {nomesVinculados.length > 0 ? (
            <span className="text-muted">{nomesVinculados.join(", ")}</span>
          ) : (
            <span className="text-[#8A5252]">Nenhum</span>
          )}
        </td>
        <td className="py-3 border-b border-line text-[13.5px] whitespace-nowrap">
          <span
            className={`text-[11px] px-2.5 py-1 rounded-full mr-3 ${
              cliente.ativo ? "bg-[#E8F0E8] text-[#3F6B45]" : "bg-[#F0E8E8] text-[#8A5252]"
            }`}
          >
            {cliente.ativo ? "Ativo" : "Inativo"}
          </span>
          <button
            type="button"
            disabled={excluindo}
            onClick={() => setEditando(true)}
            className="text-navy hover:text-gold active:text-gold transition-colors disabled:opacity-50 mr-3"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={excluindo}
            onClick={handleExcluir}
            className="text-[#8A5252] hover:text-gold active:text-gold transition-colors disabled:opacity-50"
          >
            {excluindo ? "Excluindo…" : "Excluir"}
          </button>
        </td>
      </tr>
      {erroExclusao && (
        <tr>
          <td colSpan={6} className="pb-3 pt-1 border-b border-line text-[12px] text-[#8A5252]">
            {erroExclusao}
          </td>
        </tr>
      )}
    </>
  );
}
