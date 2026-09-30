"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { atualizarEmpreendimento, type ObraFormState } from "@/app/actions/obras";
import type { EmpreendimentoEtapa, Foto } from "@/types/database";
import type { EmpreendimentoAdminDetalhe } from "@/lib/data/admin-empreendimentos";
import { DeleteFotoButton } from "./DeleteFotoButton";
import { FotosUploader } from "./FotosUploader";

const initialState: ObraFormState = {};

function SalvarButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target inline-flex items-center px-6 py-2.5 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
    >
      {pending ? "Salvando…" : label}
    </button>
  );
}

export function ObraEditor({ detalhe }: { detalhe: EmpreendimentoAdminDetalhe }) {
  const { empreendimento, etapas, fotos } = detalhe;
  const [state, formAction] = useActionState(atualizarEmpreendimento, initialState);

  return (
    <div className="bg-surface border border-line rounded p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h2 className="text-lg text-navy">Editando · {empreendimento.nome}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <form action={formAction}>
          <input type="hidden" name="id" value={empreendimento.id} />

          <div className="mb-[18px]">
            <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
              Texto da atualização
            </label>
            <textarea
              name="texto_atualizacao"
              defaultValue={empreendimento.texto_atualizacao}
              className="w-full min-h-[88px] py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] leading-relaxed focus:outline-none focus:border-navy"
            />
          </div>

          <div className="mb-[18px] max-w-[190px]">
            <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
              Avanço geral (Sienge)
            </label>
            <input
              name="avanco_geral"
              type="number"
              min={0}
              max={100}
              step="0.1"
              defaultValue={empreendimento.avanco_geral}
              className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] focus:outline-none focus:border-navy"
            />
          </div>
          <p className="text-[11.5px] text-muted leading-relaxed">
            Digite o percentual exatamente como aparece no relatório do Sienge. O sistema não
            calcula esse número — o Sienge usa peso por etapa.
          </p>

          <div className="mt-6">
            <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
              Percentual por etapa
            </label>
            {etapas.map((etapa: EmpreendimentoEtapa) => (
              <div key={etapa.id} className="flex items-center gap-3 py-2.5 border-b border-line">
                <span className={`flex-1 text-[12.5px] ${etapa.percentual === 0 ? "text-[#B3B8BF]" : "text-[#3C4148]"}`}>
                  {etapa.nome}
                </span>
                <input
                  name={`etapa_${etapa.id}`}
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  defaultValue={etapa.percentual}
                  className="w-16 py-1.5 px-2 border border-[#D5D9DF] rounded text-[13px] text-right focus:outline-none focus:border-navy"
                />
                <span className="text-muted text-xs">%</span>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-muted leading-relaxed mt-2.5">
            Etapas em 0% ficam ocultas para o cliente e aparecem sozinhas quando a obra chegar
            nelas.
          </p>

          {state?.error && <p className="text-[12.5px] text-[#8A5252] mt-4">{state.error}</p>}
          {state?.success && <p className="text-[12.5px] text-[#3F6B45] mt-4">Alterações salvas.</p>}

          <div className="mt-6">
            <SalvarButton label="Salvar alterações" />
          </div>
        </form>

        <div>
          <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
            Fotos da obra
          </label>
          <FotosUploader empreendimentoId={empreendimento.id} />

          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5 mt-3.5">
              {fotos.map((foto: Foto) => (
                <div key={foto.id} className="relative aspect-square rounded overflow-hidden border border-line bg-[#EEF0F3]">
                  <Image src={foto.url} alt="" fill sizes="100px" className="object-cover" />
                  <DeleteFotoButton fotoId={foto.id} />
                </div>
              ))}
            </div>
          )}

          <p className="text-[11.5px] text-muted leading-relaxed mt-2.5">
            Ao enviar fotos novas, as atuais saem do ar automaticamente. Elas ficam guardadas por
            30 dias caso precise reverter.
          </p>
        </div>
      </div>
    </div>
  );
}
