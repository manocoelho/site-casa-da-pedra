"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FacebookIcon, GoogleIcon } from "@/components/auth/SocialIcons";
import { useOAuthSignIn } from "@/hooks/useOAuthSignIn";
import type { OAuthProvider } from "@/types/auth";

const PROVIDERS: { id: OAuthProvider; label: string; Icon: typeof GoogleIcon }[] = [
  { id: "google", label: "Continuar com Google", Icon: GoogleIcon },
  { id: "facebook", label: "Continuar com Facebook", Icon: FacebookIcon },
];

export function OAuthButtons({ redirectTo }: { redirectTo: string }) {
  const { signIn, pendingProvider, error } = useOAuthSignIn(redirectTo);

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert variant="error">{error}</Alert>}
      {PROVIDERS.map(({ id, label, Icon }) => (
        <Button
          key={id}
          variant="outline"
          fullWidth
          isLoading={pendingProvider === id}
          disabled={pendingProvider !== null}
          leftIcon={<Icon />}
          onClick={() => signIn(id)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
