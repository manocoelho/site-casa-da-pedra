"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Divider } from "@/components/ui/Divider";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { useAuthSearchParams } from "@/hooks/useAuthSearchParams";
import { DEFAULT_LOGIN_REDIRECT, ROUTES } from "@/lib/routes";

/** Tela de login: compõe OAuth + formulário de e-mail/senha. Usar dentro de `<Suspense>`. */
export function LoginView() {
  const { redirectTo, callbackError } = useAuthSearchParams();
  const cadastroHref =
    redirectTo === DEFAULT_LOGIN_REDIRECT
      ? ROUTES.cadastro
      : `${ROUTES.cadastro}?next=${encodeURIComponent(redirectTo)}`;

  return (
    <AuthCard
      title="Bem-vindo de volta"
      subtitle="Entre para gerenciar suas reservas na Casa da Pedra."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href={cadastroHref} className="font-medium text-stone-900 underline-offset-4 hover:underline dark:text-amber-400">
            Cadastre-se
          </Link>
        </>
      }
    >
      {callbackError && <Alert variant="error">{callbackError}</Alert>}
      <OAuthButtons redirectTo={redirectTo} />
      <Divider label="ou entre com e-mail" />
      <LoginForm redirectTo={redirectTo} />
    </AuthCard>
  );
}
