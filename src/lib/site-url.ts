import { env } from "@/lib/env";
import { ROUTES, sanitizeRedirectPath } from "@/lib/routes";

/**
 * Origem pública do site. No browser usa a origem atual (funciona em previews do
 * Vercel); fora dele, cai para NEXT_PUBLIC_SITE_URL.
 */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return env.siteUrl ?? "http://localhost:3000";
}

/** URL de retorno do OAuth / confirmação de e-mail. */
export function buildAuthCallbackUrl(next?: string | null): string {
  const url = new URL(ROUTES.authCallback, getSiteOrigin());
  url.searchParams.set("next", sanitizeRedirectPath(next));
  return url.toString();
}
