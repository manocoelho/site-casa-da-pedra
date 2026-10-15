/**
 * Mapa central de rotas da aplicação e regras de acesso usadas pelo proxy.
 */
export const ROUTES = {
  home: "/",
  login: "/login",
  cadastro: "/cadastro",
  authCallback: "/auth/callback",
  minhaConta: "/minha-conta",
  admin: "/admin",
  chat: "/chat",
  privacidade: "/privacidade",
  termos: "/termos",
  flatDetails: (id: string) => `/flats/${id}`,
} as const;

/** Rotas que exigem usuário autenticado (prefixos). */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [
  ROUTES.minhaConta,
  ROUTES.admin,
  ROUTES.chat,
];

/** Rotas exclusivas para visitantes: usuários logados são redirecionados. */
export const GUEST_ONLY_ROUTES: readonly string[] = [ROUTES.login, ROUTES.cadastro];

/** Rota padrão após login. */
export const DEFAULT_LOGIN_REDIRECT = ROUTES.home;

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.includes(pathname);
}

/**
 * Garante que o redirecionamento pós-login seja um caminho interno
 * (evita open redirect via `?next=https://site-malicioso.com`).
 */
export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return DEFAULT_LOGIN_REDIRECT;
  }
  return path;
}
