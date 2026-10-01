import { createClient } from "@supabase/supabase-js";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { headers } from "next/headers";

export const revalidate = 0;

// Rate limiting in-memory fallback (note: ephemeral in serverless, but helps against basic floods)
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  let record = rateLimitMap.get(ip);
  if (!record || record.resetAt < now) {
    record = { count: 1, resetAt: now + windowMs };
    rateLimitMap.set(ip, record);
    return true;
  }
  
  record.count++;
  return record.count <= maxRequests;
}

export default async function ValidarCarteirinhaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  // Basic rate limiting
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  
  if (!checkRateLimit(ip)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
        <div style={{ background: "#fff", padding: 48, borderRadius: 16, textAlign: "center" }}>
          <AlertTriangle size={64} color="var(--subtle)" style={{ margin: "0 auto 24px auto" }} />
          <h1 style={{ fontSize: 24, margin: "0 0 8px 0" }}>Muitas Requisições</h1>
          <p className="subtle">Por favor, aguarde um momento antes de tentar novamente.</p>
        </div>
      </div>
    );
  }

  // Use Admin Client safely because the RPC is revoked for anon.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: card } = await supabaseAdmin.rpc("validate_digital_card", {
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
        
        {isValid && (
          <div style={{ background: "#f8fafc", padding: 24, borderRadius: 12, marginTop: 32, textAlign: "left" }}>
            <div style={{ fontSize: 13, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Nome do Obreiro</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{card.short_name}</div>
            
            <div style={{ fontSize: 13, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Loja</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{card.store_name}</div>
          </div>
        )}

        {!isValid && (
          <p style={{ marginTop: 24, color: "#991b1b", fontSize: 14, lineHeight: 1.5 }}>
            Esta carteirinha foi invalidada e não possui mais validade. Nenhuma informação pessoal será exibida.
          </p>
        )}
      </div>
    </div>
  );
}
