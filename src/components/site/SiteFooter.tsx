import type { ReactNode } from "react";
import Image from "next/image";
import { ALFA_LOGO_URL, FOOTER_COLUNAS, REDES_SOCIAIS } from "@/lib/site-content";

const SOCIAL_ICONS: Record<string, ReactNode> = {
  Facebook: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.523 1.492-3.917 3.777-3.917 1.094 0 2.238.197 2.238.197v2.476h-1.26c-1.243 0-1.63.775-1.63 1.57v1.888h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94Z" />
    </svg>
  ),
  Instagram: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.25 1.21.6 1.76 1.15.5.5.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.25-.66.6-1.21 1.15-1.76a4.9 4.9 0 0 1 1.76-1.15c.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.28 2 12 2Zm0 1.8c-2.67 0-2.99.01-4.04.06-.87.04-1.34.18-1.65.3-.42.16-.71.36-1.02.67-.31.31-.5.6-.67 1.02-.12.31-.26.78-.3 1.65C4.27 8.55 4.26 8.87 4.26 12s.01 3.45.06 4.5c.04.87.18 1.34.3 1.65.16.42.36.71.67 1.02.31.31.6.5 1.02.67.31.12.78.26 1.65.3 1.05.05 1.37.06 4.04.06s2.99-.01 4.04-.06c.87-.04 1.34-.18 1.65-.3.42-.17.71-.36 1.02-.67.31-.31.5-.6.67-1.02.12-.31.26-.78.3-1.65.05-1.05.06-1.37.06-4.5s-.01-3.45-.06-4.5c-.04-.87-.18-1.34-.3-1.65a2.75 2.75 0 0 0-.67-1.02 2.75 2.75 0 0 0-1.02-.67c-.31-.12-.78-.26-1.65-.3C14.99 3.81 14.67 3.8 12 3.8Zm0 3.05a5.15 5.15 0 1 1 0 10.3 5.15 5.15 0 0 1 0-10.3Zm0 1.8a3.35 3.35 0 1 0 0 6.7 3.35 3.35 0 0 0 0-6.7Zm5.35-1.98a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z" />
    </svg>
  ),
};

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white py-12 sm:py-[52px]">
      <div className="wrap">
        <div className="text-center text-gold mb-9 text-[13px]">︿</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 mb-10 sm:mb-11">
          {FOOTER_COLUNAS.map((coluna, i) => (
            <div key={coluna.titulo} className={i === 1 ? "sm:text-center" : i === 2 ? "sm:text-right" : ""}>
              <h5 className="font-jost font-normal text-sm text-white/50 mb-4">{coluna.titulo}</h5>
              <ul className="space-y-2.5 list-none p-0 m-0">
                {coluna.links.map((link) => (
                  <li key={link.label} className="text-[13px] text-white/90">
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                      className="hover:text-gold transition-colors tap-target inline-flex items-center"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/15 pt-[22px] flex flex-col sm:flex-row items-center justify-between gap-5 text-[11.5px] text-white/55">
          <span className="flex gap-4">
            {REDES_SOCIAIS.map((rede) => (
              <a
                key={rede.label}
                href={rede.href}
                target="_blank"
                rel="noreferrer"
                aria-label={rede.label}
                className="hover:text-gold transition-colors tap-target inline-flex items-center justify-center"
              >
                {SOCIAL_ICONS[rede.label]}
              </a>
            ))}
          </span>
          <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <a href="/privacidade" className="hover:text-gold transition-colors">Política de Privacidade</a>
            <a href="/termos" className="hover:text-gold transition-colors">Termos de Uso</a>
            <span>Todos os direitos reservados</span>
          </span>
          <Image src={ALFA_LOGO_URL} alt="Alfa Engenharia" width={64} height={18} className="h-4 w-auto" unoptimized />
        </div>
      </div>
    </footer>
  );
}
