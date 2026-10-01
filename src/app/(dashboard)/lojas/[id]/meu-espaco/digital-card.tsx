"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { revokeAndGenerateDigitalCard } from "./actions";
import { ShieldAlert, RefreshCw, CheckCircle2 } from "lucide-react";

export default function DigitalCardClient({
  storeId,
  brotherId,
  brotherName,
  brotherCim,
  brotherDegree,
  storeName,
  token
}: {
  storeId: string;
  brotherId: string;
  brotherName: string;
  brotherCim: string;
  brotherDegree: string;
  storeName: string;
  token?: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRevoke = async () => {
    if (!confirm("Tem certeza que deseja revogar a carteirinha atual e gerar uma nova? O QR Code antigo deixará de funcionar imediatamente.")) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      await revokeAndGenerateDigitalCard(storeId, brotherId);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErrorMsg(err.message || "Erro desconhecido.");
    } finally {
      setIsGenerating(false);
    }
  };

  const validationUrl = typeof window !== "undefined" ? `${window.location.origin}/validar/${token}` : `https://maconaria360.com.br/validar/${token}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {errorMsg && (
        <div className="message message-error">
          <ShieldAlert size={18} /> {errorMsg}
        </div>
      )}

      {!token ? (
        <div style={{ textAlign: "center", padding: "32px 16px", background: "var(--page)", border: "1px dashed var(--border)", borderRadius: 8 }}>
          <p className="subtle" style={{ marginBottom: 16 }}>Você ainda não possui uma Carteirinha Digital ativa.</p>
          <button className="button" onClick={handleRevoke} disabled={isGenerating}>
            {isGenerating ? "Gerando..." : "Gerar Minha Carteirinha"}
          </button>
        </div>
      ) : (
        <div style={{ background: "linear-gradient(135deg, var(--navy) 0%, #1e293b 100%)", borderRadius: 12, padding: 24, color: "#fff", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)", position: "relative", overflow: "hidden" }}>
          
          <div style={{ position: "absolute", top: 0, right: 0, width: 150, height: 150, background: "rgba(255,255,255,0.05)", borderRadius: "50%", transform: "translate(30%, -30%)" }}></div>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, opacity: 0.7, marginBottom: 4 }}>Carteirinha Digital</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{storeName}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500 }}>
              <CheckCircle2 size={12} color="#34d399" /> ATIVA
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "center", position: "relative", zIndex: 1 }}>
            <div style={{ background: "#fff", padding: 8, borderRadius: 8 }}>
              <QRCodeSVG value={validationUrl} size={100} level="M" includeMargin={false} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 20, margin: "0 0 4px 0", lineHeight: 1.2 }}>{brotherName}</h2>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>Grau: {brotherDegree}</div>
              <div style={{ fontSize: 13, fontFamily: "monospace", opacity: 0.7 }}>CIM: {brotherCim || 'Não informado'}</div>
            </div>
          </div>
        </div>
      )}

      {token && (
        <div style={{ textAlign: "right" }}>
          <button onClick={handleRevoke} disabled={isGenerating} style={{ background: "transparent", border: "none", color: "var(--danger)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", textDecoration: "underline" }}>
            <RefreshCw size={12} /> {isGenerating ? "Revogando..." : "Revogar e Gerar Nova"}
          </button>
        </div>
      )}
    </div>
  );
}
