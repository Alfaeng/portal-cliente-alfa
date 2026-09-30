import type { ReactNode } from "react";

const ICONES: Record<string, ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </>
  ),
  building: (
    <>
      <path d="M3 21h18M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-5h6v5" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h6M7 13h10M7 17h5" />
    </>
  ),
  headset: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

export function ServicoIcon({ name }: { name: string }) {
  return (
    <svg
      className="w-[26px] h-[26px] mb-4 text-navy"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONES[name] ?? null}
    </svg>
  );
}
