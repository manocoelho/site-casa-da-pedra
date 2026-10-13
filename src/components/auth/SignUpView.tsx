"use client";

import Link from "next/link";
import { Divider } from "@/components/ui/Divider";
import { AuthCard } from "@/components/auth/AuthCard";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useAuthSearchParams } from "@/hooks/useAuthSearchParams";
import { DEFAULT_LOGIN_REDIRECT, ROUTES } from "@/lib/routes";

/** Tela de cadastro: compõe OAuth + formulário de cadastro. Usar dentro de `<Suspense>`. */
export function SignUpView() {
  const { redirectTo } = useAuthSearchParams();
  const loginHref =
    redirectTo === DEFAULT_LOGIN_REDIRECT
      ? ROUTES.login
      : `${ROUTES.login}?next=${encodeURIComponent(redirectTo)}`;

  return (
    <AuthCard
      title="Crie sua conta"
      subtitle="Reserve flats, acompanhe suas estadias e fale com a gente."
      footer={
        <>
          Já tem uma conta?{" "}
          <Link href={loginHref} className="font-medium text-stone-900 underline-offset-4 hover:underline dark:text-amber-400">
            Entrar
          </Link>
        </>
      }
    >
      <OAuthButtons redirectTo={redirectTo} />
      <Divider label="ou cadastre-se com e-mail" />
      <SignUpForm redirectTo={redirectTo} />
    </AuthCard>
  );
}
