import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "../../event-form";

export default async function EditarEventoPage({ params }: { params: Promise<{ id: string, eventId: string }> }) {
  const { id: storeId, eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["admin", "secretary"].includes(membership.role)) {
    redirect(`/lojas/${storeId}/eventos`);
  }

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("store_id", storeId)
    .single();

  if (!event) redirect(`/lojas/${storeId}/eventos`);

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href={`/lojas/${storeId}/eventos/${eventId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Evento
      </Link>
      
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Editar Evento</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Atualize as informações do evento.</p>
      
      <div className="card">
        <EventForm storeId={storeId} event={event} />
      </div>
    </div>
  );
}
