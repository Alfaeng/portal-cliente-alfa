/**
 * A verificação em duas etapas (app autenticador) do admin está DESLIGADA
 * por enquanto. Para religar, defina ADMIN_MFA_OBRIGATORIO=true nas
 * variáveis de ambiente da Vercel e faça um novo deploy.
 */
export function mfaAdminObrigatorio(): boolean {
  return process.env.ADMIN_MFA_OBRIGATORIO === "true";
}
