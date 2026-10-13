import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createFlatsService } from "@/services/flats";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const instant = false;

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const flatsService = createFlatsService(supabase);
  const flats = await flatsService.listWithPhotos();

  return <AdminDashboard initialFlats={flats} />;
}
