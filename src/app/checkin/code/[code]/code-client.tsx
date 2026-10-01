"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Home, KeyRound } from "lucide-react";
import Link from "next/link";
import { confirmCodePresence } from "./actions";

export default function CodeCheckinClient({ code }: { code: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Automatically submit when page loads for the code
    const run = async () => {
      setStatus("loading");
      try {
        const res = await confirmCodePresence(code);
        setStatus(res.success ? "success" : "error");
        setMessage(res.message);
      } catch {
        setStatus("error");
        setMessage("Erro de rede.");
      }
    };
    run();
  }, [code]);

  return (
    <div style={{ background: "#fff", padding: 48, borderRadius: 16, textAlign: "center", maxWidth: 400, width: "100%", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
      {status === "loading" ? (
        <>
          <KeyRound size={64} color="var(--brand)" style={{ margin: "0 auto 24px auto", animation: "pulse 2s infinite" }} />
          <h1 style={{ fontSize: 24, margin: "0 0 16px 0" }}>Validando...</h1>
        </>
      ) : status === "success" ? (
        <>
          <CheckCircle2 size={80} color="var(--brand)" style={{ margin: "0 auto 24px auto" }} />
          <h1 style={{ fontSize: 24, margin: "0 0 16px 0", color: "var(--brand)" }}>Sucesso!</h1>
          <p className="subtle" style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>{message}</p>
        </>
      ) : (
        <>
          <XCircle size={80} color="var(--danger)" style={{ margin: "0 auto 24px auto" }} />
          <h1 style={{ fontSize: 24, margin: "0 0 16px 0", color: "var(--danger)" }}>Erro ao Validar</h1>
          <p className="subtle" style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>{message}</p>
        </>
      )}
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        {status === "error" && <Link href="/checkin" className="button">Tentar Novamente</Link>}
        <Link href="/lojas" className="button" style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--border)" }}><Home size={18} /> Voltar</Link>
      </div>
    </div>
  );
}
