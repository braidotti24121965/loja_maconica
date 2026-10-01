"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Home, QrCode } from "lucide-react";
import Link from "next/link";
import { registerPresence } from "./actions";

export default function CheckinClient({ challenge }: { challenge: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    setStatus("loading");
    try {
      const res = await registerPresence(challenge, "qr");
      if (res.success) {
        setStatus("success");
        setMessage(res.message);
      } else {
        setStatus("error");
        setMessage(res.message);
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setStatus("error");
      setMessage(err.message || "Erro de rede ao confirmar presença.");
    }
  };

  if (status === "idle" || status === "loading") {
    return (
      <div style={{ background: "#fff", padding: 48, borderRadius: 16, textAlign: "center", maxWidth: 400, width: "100%", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <QrCode size={64} color="var(--brand)" style={{ margin: "0 auto 24px auto" }} />
        <h1 style={{ fontSize: 24, margin: "0 0 16px 0" }}>Registrar Presença</h1>
        <p className="subtle" style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>
          Você está prestes a registrar sua presença nesta sessão. Confirma?
        </p>
        <button 
          onClick={handleConfirm} 
          disabled={status === "loading"}
          className="button" 
          style={{ width: "100%", padding: 16, fontSize: 16, display: "flex", justifyContent: "center" }}
        >
          {status === "loading" ? "Registrando..." : "Confirmar Presença"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", padding: 48, borderRadius: 16, textAlign: "center", maxWidth: 400, width: "100%", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
      {status === "success" ? (
        <CheckCircle2 size={80} color="var(--brand)" style={{ margin: "0 auto 24px auto" }} />
      ) : (
        <XCircle size={80} color="var(--danger)" style={{ margin: "0 auto 24px auto" }} />
      )}

      <h1 style={{ fontSize: 24, margin: "0 0 16px 0", color: status === "success" ? "var(--brand)" : "var(--danger)" }}>
        {status === "success" ? "Sucesso!" : "Check-in Recusado"}
      </h1>
      
      <p className="subtle" style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>
        {message}
      </p>

      <Link href="/lojas" className="button" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "var(--text)", border: "1px solid var(--border)" }}>
        <Home size={18} /> Voltar para o Início
      </Link>
    </div>
  );
}
