import { NextResponse, type NextRequest } from "next/server";
import { createAuthService } from "@/services/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROUTES, sanitizeRedirectPath } from "@/lib/routes";

/**
 * Callback de autenticação (OAuth Google/Facebook e link de confirmação de e-mail).
 * Troca o `code` PKCE por uma sessão (gravada em cookies) e redireciona.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next"));

  // O provedor pode devolver erro (ex.: usuário cancelou o consentimento).
  if (searchParams.get("error") || !code) {
    return NextResponse.redirect(new URL(`${ROUTES.login}?error=oauth`, origin));
  }

  const auth = createAuthService(await createSupabaseServerClient());
  const result = await auth.exchangeCodeForSession(code);

  if (!result.ok) {
    return NextResponse.redirect(new URL(`${ROUTES.login}?error=callback`, origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
