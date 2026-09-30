import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar, MapPin, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function EventosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check store membership
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/lojas");
  const isAdmin = ["admin", "secretary"].includes(membership.role);

  // Fetch events
  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, event_time, location, status")
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("event_date", { ascending: false });

  return (
    <div>
      <Link href={`/lojas/${storeId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Loja
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Eventos da Loja</h1>
          <p className="subtle">Calendário e galeria de fotos de eventos maçônicos.</p>
        </div>
        {isAdmin && (
          <Link href={`/lojas/${storeId}/eventos/novo`} className="button">
            <Plus size={18} style={{ marginRight: 8 }} /> Novo Evento
          </Link>
        )}
      </div>

      {(!events || events.length === 0) ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ background: "rgba(0,0,0,0.05)", display: "inline-block", padding: 16, borderRadius: "50%", marginBottom: 16 }}>
            <Calendar size={32} color="var(--subtle)" />
          </div>
          <h3>Nenhum evento encontrado</h3>
          <p className="subtle">Nenhum evento foi registrado nesta loja ainda.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {events.map((evt) => (
            <Link key={evt.id} href={`/lojas/${storeId}/eventos/${evt.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18 }}>{evt.title}</h3>
                  <span className="badge" style={{ 
                    background: evt.status === 'published' ? 'var(--green-soft)' : 'rgba(0,0,0,0.1)',
                    color: evt.status === 'published' ? 'var(--green-dark)' : 'inherit'
                  }}>
                    {evt.status === 'published' ? 'Publicado' : evt.status === 'draft' ? 'Rascunho' : 'Cancelado'}
                  </span>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--subtle)", fontSize: 14, marginBottom: 8 }}>
                  <Calendar size={14} />
                  <span>
                    {format(new Date(`${evt.event_date}T12:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {evt.event_time && ` às ${evt.event_time.slice(0, 5)}`}
                  </span>
                </div>

                {evt.location && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--subtle)", fontSize: 14 }}>
                    <MapPin size={14} />
                    <span>{evt.location}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
