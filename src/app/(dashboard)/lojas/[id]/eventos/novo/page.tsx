import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "../event-form";

export default async function NovoEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
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

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href={`/lojas/${storeId}/eventos`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Eventos
      </Link>
      
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Novo Evento</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Preencha os dados básicos do evento para registrá-lo no calendário da Loja.</p>
      
      <div className="card">
        <EventForm storeId={storeId} />
      </div>
    </div>
  );
}
