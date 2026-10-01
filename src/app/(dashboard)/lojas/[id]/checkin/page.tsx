import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, XCircle, Home } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/lojas/${storeId}/checkin`);
  }

  // Faz a chamada ao banco
  const { data: response, error } = await supabase.rpc("register_store_checkin", {
    p_store_id: storeId
  });

  const success = !error && response && response.success;
  const message = error ? error.message : (response?.message || "Erro desconhecido ao processar o check-in.");

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "40px auto", textAlign: "center" }}>
      <div style={{ background: "var(--page)", padding: 48, borderRadius: 16, border: "1px solid var(--border)", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
        
        {success ? (
          <CheckCircle2 size={80} color="var(--brand)" style={{ margin: "0 auto 24px auto" }} />
        ) : (
          <XCircle size={80} color="var(--danger)" style={{ margin: "0 auto 24px auto" }} />
        )}

        <h1 style={{ fontSize: 24, margin: "0 0 16px 0", color: success ? "var(--brand)" : "var(--danger)" }}>
          {success ? "Check-in Confirmado" : "Check-in Recusado"}
        </h1>
        
        <p className="subtle" style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>
          {message}
        </p>

        <Link href={`/lojas/${storeId}/meu-espaco`} className="button" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Home size={18} /> Voltar para o Meu Espaço
        </Link>
      </div>
    </div>
  );
}
