"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Etapa = "carregando" | "cadastrar" | "verificar";

/**
 * Verificação em duas etapas (TOTP). Na primeira vez o admin cadastra o app
 * autenticador (Google Authenticator, Microsoft Authenticator, 1Password…)
 * lendo um QR code; nas seguintes, só digita o código de 6 dígitos.
 */
export function MfaForm() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [fatorId, setFatorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [segredo, setSegredo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function preparar() {
      const supabase = createSupabaseBrowserClient();
      const { data: lista, error } = await supabase.auth.mfa.listFactors();
      if (cancelado) return;
      if (error) {
        setErro("Não foi possível carregar a verificação. Recarregue a página.");
        return;
      }

      const verificado = lista.totp.find((f) => f.status === "verified");
      if (verificado) {
        setFatorId(verificado.id);
        setEtapa("verificar");
        return;
      }

      // Cadastros que ficaram pela metade são descartados antes de recomeçar.
      for (const f of lista.all.filter((x) => x.factor_type === "totp" && x.status !== "verified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error: erroCadastro } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Alfa Admin",
      });
      if (cancelado) return;
      if (erroCadastro || !data) {
        setErro("Não foi possível iniciar o cadastro. Recarregue a página.");
        return;
      }
      setFatorId(data.id);
      setQrCode(data.totp.qr_code);
      setSegredo(data.totp.secret);
      setEtapa("cadastrar");
    }

    preparar();
    return () => {
      cancelado = true;
    };
  }, []);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!/^\d{6}$/.test(codigo)) {
      setErro("O código tem 6 números.");
      return;
    }

    setEnviando(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo });
    setEnviando(false);

    if (error) {
      setErro("Código incorreto ou expirado. Confira o app e tente de novo.");
      setCodigo("");
      return;
    }

    router.push("/admin/obras");
    router.refresh();
  }

  async function sair() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut({ scope: "global" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="bg-surface border border-line rounded p-8">
      {etapa === "carregando" && !erro && <p className="text-[13px] text-muted">Carregando…</p>}

      {etapa === "cadastrar" && (
        <>
          <h1 className="text-[17px] text-navy mb-2">Proteja seu acesso</h1>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            1. Instale um app autenticador no celular (Google Authenticator, Microsoft
            Authenticator ou 1Password).
            <br />
            2. Leia o QR code abaixo com o app.
            <br />
            3. Digite aqui o código de 6 números que o app mostrar.
          </p>
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR code para o app autenticador" width={180} height={180} />
          </div>
          <details className="text-[12px] text-muted mb-5">
            <summary className="cursor-pointer">Não consigo ler o QR code</summary>
            <p className="mt-2 break-all font-mono text-[12px] text-ink">{segredo}</p>
          </details>
        </>
      )}

      {etapa === "verificar" && (
        <>
          <h1 className="text-[17px] text-navy mb-2">Digite o código</h1>
          <p className="text-[13px] text-muted leading-relaxed mb-5">
            Abra o app autenticador e digite o código de 6 números do acesso “Alfa Admin”.
          </p>
        </>
      )}

      {etapa !== "carregando" && (
        <form onSubmit={confirmar}>
          <label className="block text-[10.5px] tracking-[.13em] uppercase text-muted mb-1.5">
            Código de 6 números
          </label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            className="tap-target w-full py-2.5 px-2.5 mb-4 border border-[#D5D9DF] rounded text-[18px] tracking-[.4em] text-center text-ink bg-white focus:outline-none focus:border-navy"
          />
          {erro && (
            <p className="text-[12.5px] text-[#8A5252] mb-4" role="alert">
              {erro}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="tap-target block w-full text-center py-3.5 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
          >
            {enviando ? "Verificando…" : etapa === "cadastrar" ? "Ativar e entrar" : "Entrar"}
          </button>
        </form>
      )}

      {etapa === "carregando" && erro && (
        <p className="text-[12.5px] text-[#8A5252]" role="alert">
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={sair}
        className="tap-target mt-4 block w-full text-center text-[12px] text-muted hover:text-navy transition-colors"
      >
        Sair
      </button>
    </div>
  );
}
