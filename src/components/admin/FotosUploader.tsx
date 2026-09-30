"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { concluirLoteFotos, enviarFoto } from "@/app/actions/obras";

const TIPOS_ACEITOS = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
const LIMITE_ENVIO = 4 * 1024 * 1024;
const LIMITE_REDUCAO = 3 * 1024 * 1024;

function ehHeic(arquivo: File) {
  return /\.(heic|heif)$/i.test(arquivo.name) || /image\/hei[cf]/i.test(arquivo.type);
}

/**
 * Fotos grandes do celular passam do limite de envio. Antes de mandar,
 * reduzimos para no máximo 2400 px. HEIC segue como está: o navegador não
 * sabe abrir esse formato, quem converte é o servidor.
 */
async function prepararArquivo(arquivo: File): Promise<File> {
  if (ehHeic(arquivo) || arquivo.size <= LIMITE_REDUCAO) return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob) return arquivo;
    return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}

export function FotosUploader({ empreendimentoId }: { empreendimentoId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selecionados, setSelecionados] = useState<File[]>([]);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (selecionados.length === 0 || enviando) return;

    setEnviando(true);
    setErros([]);
    setSucesso(null);

    const idsNovos: string[] = [];
    const falhas: string[] = [];

    for (let i = 0; i < selecionados.length; i++) {
      const original = selecionados[i];
      setProgresso(`Enviando foto ${i + 1} de ${selecionados.length}…`);

      const arquivo = await prepararArquivo(original);
      if (arquivo.size > LIMITE_ENVIO) {
        falhas.push(`${original.name}: a foto tem mais de 4 MB.`);
        continue;
      }

      const dados = new FormData();
      dados.set("empreendimento_id", empreendimentoId);
      dados.set("foto", arquivo);

      try {
        const resultado = await enviarFoto(dados);
        if (resultado.ok && resultado.id) idsNovos.push(resultado.id);
        else falhas.push(`${original.name}: ${resultado.erro ?? "não foi possível enviar."}`);
      } catch {
        falhas.push(`${original.name}: falha de conexão. Tente de novo.`);
      }
    }

    if (idsNovos.length > 0) {
      setProgresso("Finalizando…");
      await concluirLoteFotos(empreendimentoId, idsNovos);
      setSucesso(
        `${idsNovos.length} foto(s) publicada(s).` +
          (falhas.length ? ` ${falhas.length} não puderam ser enviadas.` : "")
      );
      setSelecionados([]);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    }

    setErros(falhas);
    setProgresso(null);
    setEnviando(false);
  }

  return (
    <form onSubmit={enviar}>
      <label
        htmlFor="fotos"
        className="block border-[1.5px] border-dashed border-[#C5CAD2] rounded p-6 text-center text-muted text-[12.5px] bg-[#FAFBFC] cursor-pointer tap-target"
      >
        {selecionados.length > 0 ? (
          <>{selecionados.length} foto(s) selecionada(s)</>
        ) : (
          <>
            Arraste as fotos aqui
            <br />
            ou clique para escolher
          </>
        )}
        <input
          ref={inputRef}
          id="fotos"
          type="file"
          accept={TIPOS_ACEITOS}
          multiple
          className="hidden"
          onChange={(e) => setSelecionados(Array.from(e.target.files ?? []))}
        />
      </label>
      <div className="mt-3">
        <button
          type="submit"
          disabled={enviando || selecionados.length === 0}
          className="tap-target inline-flex items-center px-6 py-2.5 rounded bg-navy text-white text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Enviar fotos"}
        </button>
      </div>
      {progresso && <p className="text-[12.5px] text-muted mt-3">{progresso}</p>}
      {sucesso && <p className="text-[12.5px] text-[#3F6B45] mt-3">{sucesso}</p>}
      {erros.map((erro) => (
        <p key={erro} className="text-[12.5px] text-[#8A5252] mt-1.5">
          {erro}
        </p>
      ))}
    </form>
  );
}
