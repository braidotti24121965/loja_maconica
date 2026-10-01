import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function ValidarCarteirinhaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  // Create regular client (will run as anon since there is no session on public device)
  const supabase = await createClient();

  // Call the public RPC function
  const { data: card } = await supabase.rpc("validate_digital_card", {
    p_token: token
  });

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
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{card.full_name}</div>
          
          <div style={{ fontSize: 13, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Loja</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>{card.store_name}</div>

          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Grau</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{card.degree}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>CIM</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{card.cim_masked}</div>
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
