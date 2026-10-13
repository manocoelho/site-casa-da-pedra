import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUsersService } from "@/services/users";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Painel Administrativo",
  description: "Gerenciamento de flats e fotos da Casa da Pedra",
};

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    redirect(`${ROUTES.login}?next=${encodeURIComponent(ROUTES.admin)}`);
  }

  const usersService = createUsersService(supabase);
  const profile = await usersService.getProfileById(user.id);

  if (profile?.role !== "admin") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col bg-stone-50 dark:bg-stone-950">
        <AccessDenied userEmail={user.email} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col bg-stone-50 dark:bg-stone-950">
      <AdminHeader userEmail={user.email} userName={profile.nome} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
