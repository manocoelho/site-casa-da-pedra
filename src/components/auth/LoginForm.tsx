"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useLoginForm } from "@/hooks/useLoginForm";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const { values, errors, handleChange, handleSubmit, isSubmitting, submitError } =
    useLoginForm(redirectTo);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {submitError && <Alert variant="error">{submitError}</Alert>}

      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        value={values.email}
        onChange={handleChange}
        error={errors.email}
      />

      <TextField
        label="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={values.senha}
        onChange={handleChange}
        error={errors.senha}
      />

      <Button type="submit" fullWidth isLoading={isSubmitting} className="mt-2">
        Entrar
      </Button>
    </form>
  );
}
