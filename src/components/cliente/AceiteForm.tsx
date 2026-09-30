"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { aceitarPolitica, type AceiteState } from "@/app/actions/aceite";

const initialState: AceiteState = {};

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target block w-full text-center py-3.5 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
    >
      {pending ? "Registrando…" : "Li e estou ciente"}
    </button>
  );
}

export function AceiteForm() {
  const [state, formAction] = useActionState(aceitarPolitica, initialState);
  return (
    <form action={formAction}>
      {state?.error && (
        <p className="text-[12.5px] text-[#8A5252] mb-4" role="alert">
          {state.error}
        </p>
      )}
      <Botao />
    </form>
  );
}
