"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserAuthService } from "@/services/auth";
import { hasErrors, validateSignUp } from "@/lib/validators/auth";
import { buildAuthCallbackUrl } from "@/lib/site-url";
import { useForm } from "@/hooks/useForm";
import type { SignUpFormValues } from "@/types/auth";

const INITIAL_VALUES: SignUpFormValues = {
  nome: "",
  email: "",
  senha: "",
  confirmarSenha: "",
};

/**
 * Lógica do formulário de cadastro com e-mail/senha.
 * @param redirectTo caminho interno (já sanitizado) para onde ir após o cadastro.
 */
export function useSignUpForm(redirectTo: string) {
  const router = useRouter();
  const form = useForm<SignUpFormValues>(INITIAL_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const errors = validateSignUp(form.values);
    form.setErrors(errors);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    const { nome, email, senha } = form.values;
    const result = await getBrowserAuthService().signUpWithEmail(
      { nome, email, senha },
      { emailRedirectTo: buildAuthCallbackUrl(redirectTo) },
    );
    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    if (result.data.needsEmailConfirmation) {
      setConfirmationSentTo(email.trim());
      form.reset();
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
    confirmationSentTo,
  };
}
