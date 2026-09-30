import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "alfa_cliente_session";
const SESSION_DURATION_DAYS = 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Defina SESSION_SECRET no .env.local (string longa e aleatória).");
  }
  return new TextEncoder().encode(secret);
}

export interface ClienteSessionPayload {
  clienteId: string;
  nome: string;
}

export async function criarTokenSessaoCliente(payload: ClienteSessionPayload) {
  return new SignJWT({ nome: payload.nome })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.clienteId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecret());
}

export async function lerSessaoCliente(
  token: string | undefined
): Promise<ClienteSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return { clienteId: payload.sub, nome: (payload.nome as string) ?? "" };
  } catch {
    return null;
  }
}

export const CLIENTE_SESSION_COOKIE = COOKIE_NAME;
export const CLIENTE_SESSION_MAX_AGE = SESSION_DURATION_DAYS * 24 * 60 * 60;
