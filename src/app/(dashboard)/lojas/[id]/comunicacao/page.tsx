import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessageSquare, Calendar, Bell } from "lucide-react";
import ComunicacaoClient from "./comunicacao-client";

export default async function ComunicacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Authentication & Authorization
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["admin", "secretary"].includes(membership.role)) {
    redirect(`/lojas/${storeId}/meu-espaco`);
  }

  const { data: store } = await supabase.from("stores").select("name").eq("id", storeId).single();

  // Buscar Próxima Sessão
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: nextSession } = await supabase
    .from("sessions")
    .select("*")
    .eq("store_id", storeId)
    .gte("date", today.toISOString().split('T')[0])
    .order("date", { ascending: true })
    .limit(1)
    .single();

  // Buscar Próximo Evento
  const { data: nextEvent } = await supabase
    .from("events")
    .select("*")
    .eq("store_id", storeId)
    .gte("event_date", today.toISOString())
    .order("event_date", { ascending: true })
    .limit(1)
    .single();

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, margin: "0 0 8px 0" }}>Comunicados da Loja</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Gere textos padronizados para enviar nos grupos de WhatsApp da Loja.</p>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <ComunicacaoClient 
          storeName={store?.name || "Loja"}
          type="session"
          title="Convocar para Sessão"
          icon={<MessageSquare size={20} color="var(--brand)" />}
          data={nextSession}
        />
        <ComunicacaoClient 
          storeName={store?.name || "Loja"}
          type="event"
          title="Convidar para Evento"
          icon={<Calendar size={20} color="var(--brand)" />}
          data={nextEvent}
        />
        <div style={{ gridColumn: "1 / -1" }}>
          <ComunicacaoClient 
            storeName={store?.name || "Loja"}
            type="general"
            title="Aviso Geral (Livre)"
            icon={<Bell size={20} color="var(--brand)" />}
            data={null}
          />
        </div>
      </div>
    </div>
  );
}
