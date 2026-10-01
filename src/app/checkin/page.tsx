"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";

export default function CheckinRootPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) {
      router.push(`/checkin/code/${code.trim().toUpperCase()}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
      <div style={{ background: "#fff", padding: 48, borderRadius: 16, textAlign: "center", maxWidth: 400, width: "100%", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <QrCode size={64} color="var(--brand)" style={{ margin: "0 auto 24px auto" }} />
        <h1 style={{ fontSize: 24, margin: "0 0 16px 0" }}>Código da Sessão</h1>
        <p className="subtle" style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>Digite o código de 6 caracteres fornecido pelo Secretário.</p>
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="Ex: A8F2B1"
            style={{ width: "100%", padding: 16, fontSize: 24, textAlign: "center", letterSpacing: 8, textTransform: "uppercase", border: "2px solid var(--border)", borderRadius: 8, marginBottom: 16 }}
            required
          />
          <button type="submit" className="button" style={{ width: "100%", padding: 16, fontSize: 16 }}>Validar Código</button>
        </form>
      </div>
    </div>
  );
}
