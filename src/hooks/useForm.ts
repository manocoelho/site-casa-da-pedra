"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import type { FieldErrors } from "@/types/auth";

/**
 * Estado genérico de formulário: valores, erros por campo e handlers.
 * Ao editar um campo, o erro daquele campo é limpo.
 */
export function useForm<T extends { [K in keyof T]: string }>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<T>>({});

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name as keyof T] ? { ...prev, [name]: undefined } : prev));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return { values, errors, setErrors, handleChange, reset };
}
