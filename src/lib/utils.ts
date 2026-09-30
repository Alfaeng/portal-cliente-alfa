import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export function maskCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

/** Valida CPF pelos dígitos verificadores (algoritmo padrão da Receita Federal). */
export function cpfValido(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(cpf[i], 10) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calc(9) === parseInt(cpf[9], 10) && calc(10) === parseInt(cpf[10], 10);
}

export function formatDateShort(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatDateLong(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatPeriodo(inicio: string, fim: string | null) {
  const format = (d: string) => {
    const date = new Date(`${d}T00:00:00`);
    return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
  };
  return fim ? `${format(inicio)} – ${format(fim)}` : `${format(inicio)} – atual`;
}

/** Transforma um nome em "slug": sem acento, minúsculo, com hífens. */
export function slugify(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
