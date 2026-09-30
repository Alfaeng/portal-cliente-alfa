"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { publicarPergunta, type PesquisaFormState } from "@/app/actions/pesquisa";

const initialState: PesquisaFormState = {};

function PublicarButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target inline-flex items-center px-[22px] py-2.5 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
    >
      {pending ? "Publicando…" : "Publicar nova pergunta"}
    </button>
  );
}

export function PublicarPerguntaForm({ perguntaAtual }: { perguntaAtual: string | null }) {
  const [state, formAction] = useActionState(publicarPergunta, initialState);

  return (
    <div className="bg-surface border border-line rounded p-6 sm:p-8 mb-6">
      <div className="bg-[#FAFBFC] border border-line rounded p-5 mb-4">
        <div className="font-jost text-[10px] tracking-[.24em] uppercase text-muted mb-2">
          Pergunta no ar
        </div>
        <form action={formAction}>
          <input
            name="pergunta"
            defaultValue={perguntaAtual ?? ""}
            placeholder="Ex.: Como você avalia o atendimento da Alfa?"
            className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] focus:outline-none focus:border-navy mb-3"
          />
          <p className="text-[11.5px] text-muted leading-relaxed mb-4">
            Você pode publicar uma pergunta nova, ou reativar uma campanha antiga mais abaixo para
            continuar medindo a mesma coisa ao longo da obra.
          </p>
          {state?.error && <p className="text-[12.5px] text-[#8A5252] mb-3">{state.error}</p>}
          {state?.success && <p className="text-[12.5px] text-[#3F6B45] mb-3">Pergunta publicada.</p>}
          <div className="flex gap-2.5 flex-wrap">
            <PublicarButton />
            <a
              href="/api/export/excel"
              className="tap-target inline-flex items-center px-[22px] py-2.5 rounded border border-navy text-navy text-sm font-medium hover:bg-navy/5 transition-colors"
            >
              Exportar Excel
            </a>
            <a
              href="/api/export/pdf"
              className="tap-target inline-flex items-center px-[22px] py-2.5 rounded border border-navy text-navy text-sm font-medium hover:bg-navy/5 transition-colors"
            >
              Exportar PDF
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
