import { createClient } from "@supabase/supabase-js";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function ValidarCarteirinhaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  // We use the admin client because the visitor is not authenticated,
  // and RLS prevents reading digital_cards and brothers for unauthenticated users.
  // We ONLY fetch by the high-entropy token, preventing enumeration.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: card } = await supabaseAdmin
    .from("digital_cards")
    .select("status, brothers(full_name, cim, degree), stores(name)")
    .eq("token", token)
    .single();

  if (!card) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
        <div style={{ background: "#fff", padding: 48, borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", textAlign: "center", maxWidth: 400, width: "100%" }}>
          <AlertTriangle size={64} color="var(--subtle)" style={{ margin: "0 auto 24px auto" }} />
          <h1 style={{ fontSize: 24, margin: "0 0 8px 0" }}>Não Encontrada</h1>
          <p className="subtle" style={{ margin: "0 0 32px 0", lineHeight: 1.5 }}>
            A carteirinha solicitada não existe ou o código QR é inválido.
          </p>
          <Link href="/" className="button" style={{ display: "block" }}>Ir para o Início</Link>
        </div>
      </div>
    );
  }

  const brother = card.brothers as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const store = card.stores as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const isValid = card.status === "active";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: isValid ? "#ecfdf5" : "#fef2f2", padding: 24 }}>
      <div style={{ background: "#fff", padding: 48, borderRadius: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: 400, width: "100%" }}>
        
        {isValid ? (
          <ShieldCheck size={80} color="#10b981" style={{ margin: "0 auto 24px auto" }} />
        ) : (
          <ShieldAlert size={80} color="#ef4444" style={{ margin: "0 auto 24px auto" }} />
        )}

        <h1 style={{ fontSize: 28, margin: "0 0 8px 0", color: isValid ? "#065f46" : "#991b1b" }}>
          {isValid ? "Carteirinha Válida" : "Carteirinha Revogada"}
        </h1>
        
        <div style={{ background: "#f8fafc", padding: 24, borderRadius: 12, marginTop: 32, textAlign: "left" }}>
          <div style={{ fontSize: 13, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Nome do Obreiro</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{brother.full_name}</div>
          
          <div style={{ fontSize: 13, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Loja</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>{store.name}</div>

          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Grau</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{brother.degree}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>CIM</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{brother.cim ? `${brother.cim.substring(0, 3)}***` : 'N/A'}</div>
            </div>
          </div>
        </div>

        {!isValid && (
          <p style={{ marginTop: 24, color: "#991b1b", fontSize: 14, lineHeight: 1.5 }}>
            Esta carteirinha foi invalidada pelo obreiro ou pela administração da loja e não possui mais validade.
          </p>
        )}
      </div>
    </div>
  );
}
