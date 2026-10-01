import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FrequenciaList } from "./frequencia-list";
import { CheckinWindowControl } from "./checkin-window-control";

export default async function FrequenciaPage({ params }: { params: Promise<{ id: string, sessionId: string }> }) {
  const { id: storeId, sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check role
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/lojas");
  const isAdmin = ["admin", "secretary"].includes(membership.role);

  // Fetch session
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .single();

  if (!session) redirect(`/lojas/${storeId}/sessoes`);

  // Fetch brothers
  const { data: brothers } = await supabase
    .from("brothers")
    .select("id, full_name, degree")
    .eq("store_id", storeId)
    .order("full_name");


  // Fetch active checkin window
  const { data: windowData } = await supabase
    .from("session_checkin_windows")
    .select("qr_token, short_code, expires_at, status")
    .eq("session_id", sessionId)
    .eq("status", "open")
    .single();


  // Fetch existing attendance
  const { data: attendances } = await supabase
    .from("session_attendances")
    .select("*")
    .eq("session_id", sessionId);

  return (
    <div style={{ maxWidth: 800 }}>
      <Link href={`/lojas/${storeId}/sessoes`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Sessões
      </Link>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={24} /> Lista de Presença
          </h1>
          <p className="subtle">
            {session.session_type} • {format(new Date(`${session.date}T12:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>


      {isAdmin && (
        <CheckinWindowControl sessionId={sessionId} storeId={storeId} initialWindow={windowData || null} />
      )}

      <div className="card">
        {brothers && brothers.length > 0 ? (
          <FrequenciaList storeId={storeId} 
            
            sessionId={sessionId} 
            brothers={brothers} 
            initialAttendances={attendances || []} 
            readOnly={!isAdmin}
            autoRefresh={Boolean(windowData)}
          />
        ) : (
          <div style={{ textAlign: "center", padding: 24 }}>
            <p className="subtle">O quadro de obreiros desta loja está vazio. Cadastre membros primeiro.</p>
          </div>
        )}
      </div>
    </div>
  );
}
