"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { criarEmpreendimento, type ObraFormState } from "@/app/actions/obras";

const initialState: ObraFormState = {};

function CadastrarButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target inline-flex items-center px-6 py-2.5 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
    >
      {pending ? "Cadastrando…" : "Cadastrar empreendimento"}
    </button>
  );
}

export function NovaObraForm() {
  const [state, formAction] = useActionState(criarEmpreendimento, initialState);

  return (
    <form action={formAction} className="bg-surface border border-line rounded p-6 sm:p-8 max-w-xl">
      <div className="mb-[18px]">
        <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">Nome</label>
        <input
          name="nome"
          required
          placeholder="Ex.: Giardino Residenza"
          className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] focus:outline-none focus:border-navy"
        />
      </div>
      <div className="mb-[18px]">
        <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">Bairro</label>
        <input
          name="bairro"
          required
          placeholder="Ex.: Ponta do Farol"
          className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] focus:outline-none focus:border-navy"
        />
      </div>
      <div className="mb-[18px] max-w-[190px]">
        <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
          Avanço geral inicial
        </label>
        <input
          name="avanco_geral"
          type="number"
          min={0}
          max={100}
          step="0.1"
          defaultValue={0}
          className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] focus:outline-none focus:border-navy"
        />
      </div>
      {state?.error && <p className="text-[12.5px] text-[#8A5252] mb-4">{state.error}</p>}
      <CadastrarButton />
      <p className="text-[11.5px] text-muted leading-relaxed mt-4">
        Depois de cadastrar, use a tela de edição para lançar o texto de atualização, as etapas e
        as fotos.
      </p>
    </form>
  );
}
