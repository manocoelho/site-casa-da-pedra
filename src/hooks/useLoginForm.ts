"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserAuthService } from "@/services/auth";
import { hasErrors, validateLogin } from "@/lib/validators/auth";
import { useForm } from "@/hooks/useForm";
import type { LoginCredentials } from "@/types/auth";

const INITIAL_VALUES: LoginCredentials = { email: "", senha: "" };

/**
 * Lógica do formulário de login com e-mail/senha.
 * @param redirectTo caminho interno (já sanitizado) para onde ir após o login.
 */
export function useLoginForm(redirectTo: string) {
  const router = useRouter();
  const form = useForm<LoginCredentials>(INITIAL_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const errors = validateLogin(form.values);
    form.setErrors(errors);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    const result = await getBrowserAuthService().signInWithEmail(form.values);

    if (!result.ok) {
      setSubmitError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  return {
    values: form.values,
    errors: form.errors,
    handleChange: form.handleChange,
    handleSubmit,
    isSubmitting,
    submitError,
  };
}
