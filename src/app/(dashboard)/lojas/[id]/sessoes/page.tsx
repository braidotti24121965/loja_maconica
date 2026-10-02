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

  // Fetch sessions
  const { data: rawSessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, date, session_type, description")
    .eq("store_id", storeId)
    .order("date", { ascending: false });

  if (sessionsError) {
    console.error("Erro ao carregar sessões:", sessionsError);
  }

  const sessions = rawSessions || [];
  const sessionIds = sessions.map((s) => s.id);

  // Fetch associated metadata (attendances, documents/atas, and photos) in parallel
  const [attendancesRes, docsRes, photosRes] = await Promise.all([
    sessionIds.length > 0
      ? supabase
          .from("session_attendances")
          .select("session_id")
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? supabase
          .from("documents")
          .select("session_id")
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? supabase
          .from("session_photos")
          .select("session_id")
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Aggregate attendance counts
  const attendanceCountsMap = new Map<string, number>();
  attendancesRes.data?.forEach((item) => {
    if (item.session_id) {
      attendanceCountsMap.set(item.session_id, (attendanceCountsMap.get(item.session_id) || 0) + 1);
    }
  });

  // Aggregate ata presence
  const ataSet = new Set<string>();
  docsRes.data?.forEach((item) => {
    if (item.session_id) {
      ataSet.add(item.session_id);
    }
  });

  // Aggregate photo counts
  const photoCountsMap = new Map<string, number>();
  photosRes.data?.forEach((item) => {
    if (item.session_id) {
      photoCountsMap.set(item.session_id, (photoCountsMap.get(item.session_id) || 0) + 1);
    }
  });

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  const mappedSessions: SessionData[] = sessions.map((s) => ({
    id: s.id,
    date: s.date,
    session_type: s.session_type,
    description: s.description || null,
    attendances_count: attendanceCountsMap.get(s.id) || 0,
    has_ata: ataSet.has(s.id),
    photos_count: photoCountsMap.get(s.id) || 0,
  }));

  return (
    <SessoesListClient
      storeId={storeId}
      isAdmin={isAdmin}
      sessions={mappedSessions}
      todayStr={todayStr}
    />
  );
}
