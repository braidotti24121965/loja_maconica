import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EphemeridesReportClient, EphemerisItem, SessionOption, StoreInfo, BrotherEmail } from "./report-client";

export const revalidate = 0;

export default async function EfemeridesRelatorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id: storeId } = await params;
  const sParams = await searchParams;
  const initialSessionId = typeof sParams.sessionId === "string" ? sParams.sessionId : undefined;
  const fromSessoes = sParams.from === "sessoes";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/lojas");

  // Fetch store details
  const { data: store } = await supabase
    .from("stores")
    .select("id, name, city, state, number")
    .eq("id", storeId)
    .single();

  if (!store) redirect("/lojas");

  // Fetch registered sessions
  const { data: rawSessionsData, error: sessionsErr } = await supabase
    .from("sessions")
    .select("id, date, session_type, description")
    .eq("store_id", storeId)
    .order("date", { ascending: true });

  if (sessionsErr) {
    console.error("Erro ao buscar sessões para relatório de efemérides:", sessionsErr);
  }

  // Fetch brothers for email sending
  const { data: brothersData } = await supabase
    .from("brothers")
    .select("id, full_name, email")
    .eq("store_id", storeId)
    .order("full_name", { ascending: true });

  // Fetch ephemerides for the store (365 days)
  const { data: ephemeridesData } = await supabase.rpc("get_upcoming_ephemerides", {
    p_store_id: storeId,
    p_days_ahead: 365,
  });

  const storeInfo: StoreInfo = {
    id: store.id,
    name: store.name,
    city: store.city,
    state: store.state,
    number: store.number || null,
  };

  const ephemeridesList: EphemerisItem[] = (ephemeridesData as EphemerisItem[]) || [];
  const sessionsList: SessionOption[] = (rawSessionsData || []).map((s) => ({
    id: s.id,
    date: s.date,
    session_type: s.session_type,
    description: s.description || null,
    title: s.session_type || s.description || "Sessão",
  }));
  const brothersList: BrotherEmail[] = (brothersData as BrotherEmail[]) || [];

  return (
    <EphemeridesReportClient
      store={storeInfo}
      items={ephemeridesList}
      sessions={sessionsList}
      brotherEmails={brothersList}
      initialSessionId={initialSessionId}
      fromSessoes={fromSessoes}
    />
  );
}
