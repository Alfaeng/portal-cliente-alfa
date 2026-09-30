"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { convidarUsuario, type UsuarioFormState } from "@/app/actions/usuarios";

const initialState: UsuarioFormState = {};

function EnviarConviteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target inline-flex items-center px-[26px] py-2.5 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Enviar convite"}
    </button>
  );
}

export function InviteForm() {
  const [state, formAction] = useActionState(convidarUsuario, initialState);

  return (
    <div className="bg-surface border border-line rounded p-6 sm:p-8">
      <h2 className="text-lg mb-5">Convidar nova pessoa</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <form action={formAction}>
          <div className="mb-[18px]">
            <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">Nome</label>
            <input
              name="nome"
              required
              placeholder="Nome de quem vai ter acesso"
              className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] focus:outline-none focus:border-navy"
            />
          </div>
          <div className="mb-[18px]">
            <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">E-mail</label>
            <input
              name="email"
              type="email"
              required
              placeholder="nome@alfaengenhariama.com.br"
              className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] focus:outline-none focus:border-navy"
            />
          </div>
          <div className="mb-[18px]">
            <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
              Nível de acesso
            </label>
            <select
              name="nivel_acesso"
              defaultValue="editor_obras"
              className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] bg-white focus:outline-none focus:border-navy"
            >
              <option value="editor_obras">Editor de obras — atualiza percentuais, textos e fotos</option>
              <option value="editor_completo">Editor completo — obras e pesquisa</option>
              <option value="administrador">
                Administrador — acesso total, inclusive base de clientes e usuários
              </option>
            </select>
          </div>
          {state?.error && <p className="text-[12.5px] text-[#8A5252] mb-4">{state.error}</p>}
          {state?.success && (
            <p className="text-[12.5px] text-[#3F6B45] mb-4">
              Convite enviado. A pessoa recebe um e-mail para criar a própria senha.
            </p>
          )}
          <EnviarConviteButton />
        </form>
        <div>
          <p className="text-[11.5px] text-muted leading-relaxed mt-6 lg:mt-0">
            A pessoa recebe um e-mail com um link para criar a própria senha. Você nunca precisa
            definir a senha dela.
          </p>
          <p className="text-[11.5px] text-muted leading-relaxed mt-3">
            O nível de acesso separa quem só atualiza a obra de quem pode mexer na base de
            clientes. Um engenheiro em campo pode ter só o essencial, sem ver dados sensíveis.
          </p>
        </div>
      </div>
    </div>
  );
}
