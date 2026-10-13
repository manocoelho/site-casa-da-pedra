"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useSignUpForm } from "@/hooks/useSignUpForm";
import { MIN_PASSWORD_LENGTH } from "@/lib/validators/auth";

export function SignUpForm({ redirectTo }: { redirectTo: string }) {
  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    submitError,
    confirmationSentTo,
  } = useSignUpForm(redirectTo);

  if (confirmationSentTo) {
    return (
      <Alert variant="success">
        <p className="font-medium">Quase lá! Confirme seu e-mail.</p>
        <p className="mt-1">
          Enviamos um link de confirmação para <strong>{confirmationSentTo}</strong>. Clique nele
          para ativar sua conta.
        </p>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {submitError && <Alert variant="error">{submitError}</Alert>}

      <TextField
        label="Nome completo"
        name="nome"
        autoComplete="name"
        placeholder="Maria Silva"
        value={values.nome}
        onChange={handleChange}
        error={errors.nome}
      />

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
        autoComplete="new-password"
        placeholder="••••••••"
        hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres, com letras e números.`}
        value={values.senha}
        onChange={handleChange}
        error={errors.senha}
      />

      <TextField
        label="Confirmar senha"
        name="confirmarSenha"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={values.confirmarSenha}
        onChange={handleChange}
        error={errors.confirmarSenha}
      />

      <Button type="submit" fullWidth isLoading={isSubmitting} className="mt-2">
        Criar conta
      </Button>
    </form>
  );
}
