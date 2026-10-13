import type { Enums, Tables, TablesInsert, TablesUpdate } from "./database";

/** Entidades de domínio derivadas do schema do banco. */

export type UserRole = Enums<"user_role">;
export type UserProfile = Tables<"users">;
export type UserProfileUpdate = Pick<TablesUpdate<"users">, "nome">;

export type Flat = Tables<"flats">;
export type FlatInsert = TablesInsert<"flats">;
export type FlatUpdate = TablesUpdate<"flats">;

export type FlatPhoto = Tables<"flat_photos">;
export type FlatPhotoInsert = TablesInsert<"flat_photos">;

/** Flat com suas fotos (join flats + flat_photos). */
export type FlatWithPhotos = Flat & { flat_photos: FlatPhoto[] };

export type ReservationStatus = Enums<"reservation_status">;
export type Reservation = Tables<"reservations">;
export type ReservationInsert = TablesInsert<"reservations">;

export type Feedback = Tables<"feedbacks">;
export type FeedbackInsert = TablesInsert<"feedbacks">;

export type Message = Tables<"messages">;
export type MessageInsert = TablesInsert<"messages">;
