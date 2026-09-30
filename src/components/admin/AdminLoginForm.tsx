"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { loginAdmin, type AdminLoginState } from "@/app/actions/admin-auth";

const initialState: AdminLoginState = {};

function EntrarButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target block w-full text-center py-3.5 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function AdminLoginForm() {
  const [state, formAction] = useActionState(loginAdmin, initialState);

  return (
    <form action={formAction} className="bg-surface border border-line rounded p-8">
      <div className="mb-[18px]">
        <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
          E-mail
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="nome@alfaengenharia.com.br"
          className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] text-ink bg-white focus:outline-none focus:border-navy"
        />
      </div>
      <div className="mb-[18px]">
        <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
          Senha
        </label>
        <input
          name="senha"
          type="password"
          required
          placeholder="••••••••"
          className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] text-ink bg-white focus:outline-none focus:border-navy"
        />
      </div>
      {state?.error && (
        <p className="text-[12.5px] text-[#8A5252] mb-4" role="alert">
          {state.error}
        </p>
      )}
      <EntrarButton />
    </form>
  );
}
