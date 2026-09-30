"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { criarClienteManual, type CriarClienteState } from "@/app/actions/clientes";

const initialState: CriarClienteState = {};

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target inline-flex items-center px-6 py-2.5 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
    >
      {pending ? "Cadastrando…" : "Adicionar cliente"}
    </button>
  );
}

export function ClienteAdicionar() {
  const [state, formAction] = useActionState(criarClienteManual, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="bg-surface border border-line rounded p-6 sm:p-8 mb-6">
      <h2 className="text-lg mb-2">Adicionar cliente manualmente</h2>
      <p className="text-[12.5px] text-muted mb-5">
        Cadastra um único cliente na hora, sem precisar montar e subir uma planilha.
      </p>
      <form ref={formRef} action={formAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <input
          name="nome"
          placeholder="Nome"
          required
          className="tap-target border border-line rounded px-3 text-[13.5px]"
        />
        <input
          name="cpf"
          placeholder="CPF (só números)"
          required
          inputMode="numeric"
          maxLength={14}
          className="tap-target border border-line rounded px-3 text-[13.5px]"
        />
        <input
          name="email"
          type="email"
          placeholder="E-mail (opcional)"
          className="tap-target border border-line rounded px-3 text-[13.5px]"
        />
        <input
          name="telefone"
          placeholder="Telefone (opcional)"
          className="tap-target border border-line rounded px-3 text-[13.5px]"
        />
        <div className="sm:col-span-2">
          <AdicionarButton />
        </div>
      </form>
      {state?.error && <p className="text-[12.5px] text-[#8A5252] mt-3.5">{state.error}</p>}
      {state?.success && <p className="text-[12.5px] text-[#3F6B45] mt-3.5">Cliente cadastrado.</p>}
    </div>
  );
}
