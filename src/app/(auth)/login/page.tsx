import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginView } from "@/components/auth/LoginView";
import { AuthViewSkeleton } from "@/components/auth/AuthViewSkeleton";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthViewSkeleton />}>
      <LoginView />
    </Suspense>
  );
}
