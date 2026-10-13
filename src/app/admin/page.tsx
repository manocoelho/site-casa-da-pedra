import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createFlatsService } from "@/services/flats";
import { createReservationsService } from "@/services/reservations";
import { createSiteSettingsService } from "@/services/siteSettings";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const instant = false;

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const flatsService = createFlatsService(supabase);
  const reservationsService = createReservationsService(supabase);
  const siteSettingsService = createSiteSettingsService(supabase);

  const [flats, reservations, siteSettings] = await Promise.all([
    flatsService.listWithPhotos(),
    reservationsService.listAllReservations(),
    siteSettingsService.getSettings(),
  ]);

  return (
    <AdminDashboard
      initialFlats={flats}
      initialReservations={reservations}
      initialSiteSettings={siteSettings}
    />
  );
}
