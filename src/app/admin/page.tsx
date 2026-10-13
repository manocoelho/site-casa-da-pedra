import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createFlatsService } from "@/services/flats";
import { createReservationsService } from "@/services/reservations";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const instant = false;

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const flatsService = createFlatsService(supabase);
  const reservationsService = createReservationsService(supabase);

  const [flats, reservations] = await Promise.all([
    flatsService.listWithPhotos(),
    reservationsService.listAllReservations(),
  ]);

  return (
    <AdminDashboard
      initialFlats={flats}
      initialReservations={reservations}
    />
  );
}
