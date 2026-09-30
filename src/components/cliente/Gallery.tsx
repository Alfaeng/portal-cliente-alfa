"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Foto } from "@/types/database";

export function Gallery({ fotos }: { fotos: Foto[] }) {
  const [aberta, setAberta] = useState<number | null>(null);

  useEffect(() => {
    if (aberta === null) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAberta(null);
      if (e.key === "ArrowRight") setAberta((i) => (i === null ? i : (i + 1) % fotos.length));
      if (e.key === "ArrowLeft") setAberta((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length));
    }
    window.addEventListener("keydown", onKeyDown);
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowOriginal;
    };
  }, [aberta, fotos.length]);

  if (fotos.length === 0) {
    return <p className="text-muted text-sm">Ainda não há fotos recentes desta obra.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {fotos.map((foto, i) => (
          <button
            key={foto.id}
            type="button"
            onClick={() => setAberta(i)}
            aria-label="Ampliar foto da obra"
            className="tap-target relative aspect-[4/3] rounded overflow-hidden border border-line bg-gradient-to-br from-[#D7DBE1] to-[#F0F2F4] cursor-zoom-in"
          >
            <Image
              src={foto.url}
              alt="Foto da obra"
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {aberta !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto da obra ampliada"
          className="fixed inset-0 z-50 bg-navy/95 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setAberta(null)}
        >
          <button
            type="button"
            onClick={() => setAberta(null)}
            aria-label="Fechar"
            className="tap-target absolute top-3 right-3 sm:top-6 sm:right-6 flex items-center justify-center rounded-full bg-white/10 text-white text-2xl leading-none hover:bg-white/20 transition-colors"
          >
            ×
          </button>

          {fotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAberta((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length));
                }}
                aria-label="Foto anterior"
                className="tap-target absolute left-1 sm:left-4 flex items-center justify-center rounded-full bg-white/10 text-white text-2xl leading-none hover:bg-white/20 transition-colors"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAberta((i) => (i === null ? i : (i + 1) % fotos.length));
                }}
                aria-label="Próxima foto"
                className="tap-target absolute right-1 sm:right-4 flex items-center justify-center rounded-full bg-white/10 text-white text-2xl leading-none hover:bg-white/20 transition-colors"
              >
                ›
              </button>
            </>
          )}

          <div
            className="relative w-full h-full max-w-[1100px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={fotos[aberta].url}
              alt="Foto da obra ampliada"
              fill
              sizes="(max-width: 1100px) 100vw, 1100px"
              className="object-contain"
            />
          </div>

          {fotos.length > 1 && (
            <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-[11px] tracking-[.1em] uppercase">
              {aberta + 1} de {fotos.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
