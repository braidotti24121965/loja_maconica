import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    .single();

  if (!membership) redirect("/lojas");
  const isAdmin = ["admin", "secretary"].includes(membership.role);

  // Fetch sessions
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("store_id", storeId)
    .order("date", { ascending: false });

  return (
    <div style={{ maxWidth: 800 }}>
      <Link href={`/lojas/${storeId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para o Painel da Loja
      </Link>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Sessões e Atas</h1>
          <p className="subtle">Histórico de sessões ordinárias e magnas da loja.</p>
        </div>
        {isAdmin && (
          <Link href={`/lojas/${storeId}/sessoes/nova`} className="button" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> Nova Sessão
          </Link>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {sessions && sessions.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {sessions.map((session: any, index: number) => (
              <div key={session.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: index < sessions.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div className="icon" style={{ background: "var(--green-soft)", color: "var(--green-dark)", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0" }}>{session.session_type}</h4>
                    <span className="subtle" style={{ fontSize: 13 }}>
                      {format(new Date(session.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                    {session.description && <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "var(--subtle)" }}>{session.description}</p>}
                  </div>
                </div>
                
                <Link href={`/lojas/${storeId}/sessoes/${session.id}/ata`} className="button" style={{ background: "transparent", color: "var(--brand)", border: "1px solid var(--brand)", display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 13 }}>
                  <FileText size={14} /> {isAdmin ? "Anexar Ata" : "Ver Ata"}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: "center" }}>Nenhuma sessão registrada.</div>
        )}
      </div>
    </div>
  );
}
