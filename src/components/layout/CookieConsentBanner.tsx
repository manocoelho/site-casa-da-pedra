"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "casa_da_pedra_lgpd_consent";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        // Exibe o banner após um breve delay para suavidade
        const timer = setTimeout(() => setIsVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Caso localStorage esteja bloqueado (ex: modo anônimo restritivo)
      setIsVisible(true);
    }
  }, []);

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ acceptedAt: new Date().toISOString() }));
    } catch {
      // Silencioso se o storage falhar
    }
    setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Aviso de Privacidade e Cookies"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5 dark:border-stone-800 dark:bg-stone-900/95"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-xs leading-relaxed text-stone-700 sm:text-sm dark:text-stone-300">
          <span className="text-xl select-none" aria-hidden="true">
            🛡️
          </span>
          <div>
            <p className="font-semibold text-stone-900 dark:text-stone-100">
              Sua privacidade é nossa prioridade (LGPD)
            </p>
            <p className="mt-1">
              Utilizamos cookies essenciais para garantir o funcionamento seguro do site, autenticação e
              gestão de reservas conforme a{" "}
              <strong className="text-stone-800 dark:text-stone-200">Lei Geral de Proteção de Dados (Lei 13.709/2018)</strong>.
              Consulte nossa{" "}
              <Link
                href={ROUTES.privacidade}
                className="font-medium text-amber-600 underline underline-offset-2 hover:text-amber-500 dark:text-amber-400"
              >
                Política de Privacidade
              </Link>{" "}
              e{" "}
              <Link
                href={ROUTES.termos}
                className="font-medium text-amber-600 underline underline-offset-2 hover:text-amber-500 dark:text-amber-400"
              >
                Termos de Uso
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:self-center">
          <Button
            type="button"
            variant="primary"
            onClick={handleAccept}
            className="w-full text-xs font-semibold sm:w-auto"
          >
            Entendi e Concordo
          </Button>
        </div>
      </div>
    </aside>
  );
}
