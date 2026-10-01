import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Calendar, UserCircle, Wallet, FileText } from "lucide-react";
import DigitalCardClient from "./digital-card";

export const revalidate = 0;

export default async function MeuEspacoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get Store
  const { data: store } = await supabase.from("stores").select("name").eq("id", storeId).single();
  if (!store) redirect("/lojas");

  // Authentication & Authorization (must be linked to a brother)
  const { data: brother } = await supabase
    .from("brothers")
    .select("*")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!brother) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <h3>Membro não vinculado</h3>
        <p className="subtle">Seu perfil de acesso não está vinculado a uma Ficha de Obreiro nesta loja.</p>
        <Link href={`/lojas/${storeId}`} className="button" style={{ marginTop: 16 }}>Voltar para Loja</Link>
      </div>
    );
  }

  // Get active digital card
  const { data: activeCard } = await supabase
    .from("digital_cards")
    .select("token")
    .eq("brother_id", brother.id)
    .eq("store_id", storeId)
    .eq("status", "active")
    .single();

  // Get some dues overview
  const { data: dues } = await supabase
    .from("monthly_dues")
    .select("amount, status, due_date")
    .eq("store_id", storeId)
    .eq("brother_id", brother.id);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let overdueCount = 0;
  let pendingCount = 0;

  (dues || []).forEach(due => {
    let isOverdue = due.status === 'overdue';
    if (due.status === 'pending') {
      const dueDate = new Date(due.due_date);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) isOverdue = true;
    }
    if (isOverdue) overdueCount++;
    else if (due.status === 'pending') pendingCount++;
  });

  
  // Get events overview (next 3)
  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date")
    .eq("store_id", storeId)
    .gte("event_date", today.toISOString())
    .order("event_date", { ascending: true })
    .limit(3);

  // Calculate Real Frequency
  const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const { count: totalSessions } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId)
    .gte("date", startOfYear)
    .lte("date", todayStr);

  const { count: totalAttendances } = await supabase
    .from("session_attendances")
    .select("sessions!inner(date)", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("brother_id", brother.id)
    .eq("status", "present")
    .gte("sessions.date", startOfYear)
    .lte("sessions.date", todayStr);

  const freqPercent = (totalSessions && totalSessions > 0) 
    ? Math.round(((totalAttendances || 0) / totalSessions) * 100)
    : 100;


  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 8px 0" }}>Meu Espaço</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Portal exclusivo para o obreiro: {brother.full_name}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        
        {/* Coluna 1: Carteirinha e Perfil */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card">
            <h2 style={{ fontSize: 16, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <UserCircle size={18} color="var(--brand)" /> Identidade Maçônica
            </h2>
            <DigitalCardClient 
              storeId={storeId}
              brotherId={brother.id}
              brotherName={brother.full_name}
              brotherCim={brother.cim || ''}
              brotherDegree={brother.degree}
              storeName={store.name}
              token={activeCard?.token}
            />
          </div>

          <div className="card">
            <h2 style={{ fontSize: 16, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <Wallet size={18} color="var(--brand)" /> Resumo Financeiro
            </h2>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--subtle)" }}>Mensalidades em Aberto</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>{pendingCount}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--subtle)" }}>Mensalidades Vencidas</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: overdueCount > 0 ? "var(--danger)" : "var(--green-dark)" }}>{overdueCount}</div>
              </div>
            </div>
            <Link href={`/lojas/${storeId}/meu-extrato`} className="button" style={{ display: "flex", justifyContent: "space-between", background: "transparent", color: "var(--text)", border: "1px solid var(--border)" }}>
              Ver Meu Extrato <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Coluna 2: Frequencia e Eventos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card">
            <h2 style={{ fontSize: 16, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} color="var(--brand)" /> Frequência
            </h2>
            <div style={{ padding: 16, background: "var(--page)", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--brand)" }}>{freqPercent}%</div>
              <div style={{ fontSize: 13, color: "var(--subtle)", marginTop: 4 }}>Presença neste ano civil</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, padding: "0 16px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--subtle)" }}>Sessões Realizadas</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{totalSessions || 0}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--subtle)" }}>Suas Presenças</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{totalAttendances || 0}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, textAlign: "center" }}>
               <Link href="/checkin" className="button" style={{ display: "inline-flex", background: "var(--brand)", color: "#fff", width: "100%", justifyContent: "center" }}>
                 Informar Código de Presença
               </Link>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 16, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={18} color="var(--brand)" /> Próximos Eventos
            </h2>
            {(!events || events.length === 0) ? (
              <p className="subtle" style={{ fontSize: 14 }}>Nenhum evento agendado.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {events.map(ev => (
                  <Link key={ev.id} href={`/lojas/${storeId}/eventos/${ev.id}`} style={{ display: "block", padding: 12, borderRadius: 8, border: "1px solid var(--border)", textDecoration: "none", color: "var(--text)" }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{ev.title}</div>
                    <div style={{ fontSize: 13, color: "var(--subtle)" }}>{new Date(ev.event_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
