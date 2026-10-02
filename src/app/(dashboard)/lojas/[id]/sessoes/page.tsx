import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SessoesListClient, SessionData } from "./sessoes-client";

export const revalidate = 0;

export default async function SessoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check role
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/lojas");
  const isAdmin = ["admin", "secretary"].includes(membership.role);

  // Fetch sessions with attendance count, documents (Ata) and photo counts
  const { data: sessionsData } = await supabase
    .from("sessions")
    .select(`
      id,
      date,
      session_type,
      description,
      session_attendances(count),
      documents(id),
      session_photos(count)
    `)
    .eq("store_id", storeId)
    .order("date", { ascending: false });

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  type SessionQueryResult = {
    id: string;
    date: string;
    session_type: string;
    description: string | null;
    session_attendances: { count: number }[] | null;
    documents: { id: string }[] | null;
    session_photos: { count: number }[] | null;
  };

  const mappedSessions: SessionData[] = ((sessionsData as unknown as SessionQueryResult[]) || []).map((s) => {
    const attendancesCount = Array.isArray(s.session_attendances)
      ? Number(s.session_attendances[0]?.count || 0)
      : 0;

    const hasAta = Array.isArray(s.documents) && s.documents.length > 0;

    const photosCount = Array.isArray(s.session_photos)
      ? Number(s.session_photos[0]?.count || 0)
      : 0;

    return {
      id: s.id,
      date: s.date,
      session_type: s.session_type,
      description: s.description || null,
      attendances_count: attendancesCount,
      has_ata: hasAta,
      photos_count: photosCount,
    };
  });

  return (
    <SessoesListClient
      storeId={storeId}
      isAdmin={isAdmin}
      sessions={mappedSessions}
      todayStr={todayStr}
    />
  );
}
