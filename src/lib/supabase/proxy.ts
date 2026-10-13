import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";
import {
  DEFAULT_LOGIN_REDIRECT,
  ROUTES,
  isGuestOnlyRoute,
  isProtectedRoute,
} from "@/lib/routes";

/**
 * Renova a sessão do Supabase a cada requisição (gravando cookies atualizados)
 * e aplica redirecionamentos otimistas baseados em autenticação.
 *
 * Importante: a autorização real dos dados é feita pelo RLS no banco.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Não coloque código entre a criação do cliente e getClaims():
  // é esta chamada que valida o JWT e dispara a renovação do token.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    return redirectPreservingCookies(request, response, ROUTES.login, {
      next: `${pathname}${search}`,
    });
  }

  if (isAuthenticated && isGuestOnlyRoute(pathname)) {
    return redirectPreservingCookies(request, response, DEFAULT_LOGIN_REDIRECT);
  }

  return response;
}

function redirectPreservingCookies(
  request: NextRequest,
  source: NextResponse,
  pathname: string,
  searchParams: Record<string, string> = {},
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = new URLSearchParams(searchParams).toString();

  const redirect = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
