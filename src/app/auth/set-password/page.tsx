"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ALFA_LOGO_URL } from "@/lib/site-content";

export default function SetPasswordPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 10 || !/[a-z]/.test(senha) || !/[A-Z]/.test(senha) || !/\d/.test(senha)) {
      setErro("A senha precisa ter pelo menos 10 caracteres, com letra maiúscula, minúscula e número.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEnviando(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);

    if (error) {
      setErro("Não foi possível salvar a senha. Peça um novo convite ao administrador.");
      return;
    }

    router.push("/admin/obras");
  }

  return (
    <div className="min-h-[70vh] bg-[#EDEFF2] py-11">
      <div className="wrap max-w-[390px] mx-auto">
        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center rounded bg-navy px-3 py-2">
            <Image src={ALFA_LOGO_URL} alt="Alfa Engenharia" width={90} height={24} className="h-5 w-auto" unoptimized />
          </span>
          <div className="font-jost text-[10px] tracking-[.24em] uppercase text-muted mt-2.5">
            Crie sua senha de acesso
          </div>
        </div>
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded p-8">
          <div className="mb-[18px]">
            <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
              Nova senha
            </label>
            <input
              type="password"
              required
              minLength={10}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] focus:outline-none focus:border-navy"
            />
          </div>
          <div className="mb-[18px]">
            <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
              Confirmar senha
            </label>
            <input
              type="password"
              required
              minLength={10}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="tap-target w-full py-2.5 px-2.5 border border-[#D5D9DF] rounded text-[13.5px] focus:outline-none focus:border-navy"
            />
          </div>
          {erro && <p className="text-[12.5px] text-[#8A5252] mb-4">{erro}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="tap-target block w-full text-center py-3.5 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
          >
            {enviando ? "Salvando…" : "Criar senha e entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
