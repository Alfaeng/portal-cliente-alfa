import { NextResponse, type NextRequest } from "next/server";
import { updateAdminSession } from "@/lib/supabase/middleware";
import { CLIENTE_SESSION_COOKIE, lerSessaoCliente } from "@/lib/auth/cliente-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Área administrativa: exige sessão Supabase Auth ---
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const { response, user, aal } = await updateAdminSession(request);

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    // Verificação em duas etapas obrigatória: sem o código do app
    // autenticador (aal2), só a tela de verificação/cadastro é acessível.
    const verificado = aal?.currentLevel === "aal2";
    if (pathname === "/admin/mfa") {
      if (verificado) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/obras";
        return NextResponse.redirect(url);
      }
      return response;
    }
    if (!verificado) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/mfa";
      return NextResponse.redirect(url);
    }

    return response;
  }

  // --- Portal do cliente: exige sessão simples criada no login por CPF ---
  if (pathname.startsWith("/portal")) {
    const token = request.cookies.get(CLIENTE_SESSION_COOKIE)?.value;
    const sessao = await lerSessaoCliente(token);

    if (!sessao) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
