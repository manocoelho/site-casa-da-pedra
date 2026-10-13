import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpView } from "@/components/auth/SignUpView";
import { AuthViewSkeleton } from "@/components/auth/AuthViewSkeleton";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default function CadastroPage() {
  return (
    <Suspense fallback={<AuthViewSkeleton />}>
      <SignUpView />
    </Suspense>
  );
}
