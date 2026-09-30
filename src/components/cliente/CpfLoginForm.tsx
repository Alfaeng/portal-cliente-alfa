"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { useState } from "react";
import { loginComCpf, type LoginState } from "@/app/actions/auth";
import { maskCpf } from "@/lib/utils";

const initialState: LoginState = {};

function EntrarButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target block w-full text-center py-3.5 rounded bg-navy text-white text-sm font-medium transition-opacity hover:bg-navy-soft disabled:opacity-60"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function CpfLoginForm() {
  const [state, formAction] = useActionState(loginComCpf, initialState);
  const [cpf, setCpf] = useState("");

  return (
    <div className="bg-bg border border-line rounded p-7 sm:p-8">
      <h3 className="text-[17px] text-navy mb-5">Digite seu CPF para entrar</h3>
      <form action={formAction}>
        <div className="mb-5">
          <label htmlFor="cpf" className="block text-[11px] tracking-[.12em] uppercase text-muted mb-1.5">
            CPF
          </label>
          <input
            id="cpf"
            name="cpf"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            className="tap-target w-full py-2.5 px-0.5 border-0 border-b border-[#C9CDD4] bg-transparent text-base text-ink transition-colors focus:outline-none focus:border-navy"
          />
        </div>
        {state?.error && (
          <p className="text-[12.5px] text-[#8A5252] mb-4" role="alert">
            {state.error}
          </p>
        )}
        <EntrarButton />
        <a
          href="https://alfaengenhariama.com.br/fale-conosco/"
          target="_blank"
          rel="noreferrer"
          className="tap-target mt-2.5 block w-full text-center py-3 rounded border border-navy text-navy text-sm font-medium bg-transparent hover:bg-navy/5 transition-colors"
        >
          Não consigo entrar
        </a>
        <p className="text-[11.5px] text-muted mt-4 leading-relaxed">
          Seu CPF é usado apenas para confirmar que você é cliente Alfa. Nenhum dado do seu
          contrato é exibido aqui.
        </p>
      </form>
    </div>
  );
}
