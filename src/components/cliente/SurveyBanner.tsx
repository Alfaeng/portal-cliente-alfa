"use client";

import { useState, useTransition } from "react";
import { responderPesquisa } from "@/app/actions/survey";

export function SurveyBanner({
  campanhaId,
  pergunta,
  jaRespondeu = false,
}: {
  campanhaId: string;
  pergunta: string;
  jaRespondeu?: boolean;
}) {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [enviado, setEnviado] = useState(jaRespondeu);
  const [isPending, startTransition] = useTransition();

  function votar(valor: number) {
    if (enviado || isPending) return;
    setNota(valor);
    startTransition(async () => {
      const res = await responderPesquisa(campanhaId, valor);
      if (res.ok || res.jaRespondeu) setEnviado(true);
    });
  }

  return (
    <div className="bg-navy rounded px-6 py-8 sm:px-11 sm:py-10 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 sm:gap-10 items-center text-white">
      <div>
        <div className="font-jost text-[10px] tracking-[.24em] uppercase text-gold mb-2">
          Pesquisa Alfa
        </div>
        <h3 className="font-jost font-light text-[20px] sm:text-[23px] leading-snug max-w-[440px] m-0">
          {pergunta}
        </h3>
      </div>
      <div>
        {!enviado ? (
          <div className="flex gap-2 sm:gap-2.5" role="radiogroup" aria-label="Avalie de 1 a 5 estrelas">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} estrelas`}
                onClick={() => votar(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="tap-target text-[29px] leading-none transition-transform hover:scale-110"
                style={{ color: (hover || nota) >= n ? "#C9A24B" : "rgba(255,255,255,.28)" }}
              >
                ★
              </button>
            ))}
          </div>
        ) : (
          <div className="text-[13px] text-gold">Obrigado pela sua resposta.</div>
        )}
      </div>
    </div>
  );
}
