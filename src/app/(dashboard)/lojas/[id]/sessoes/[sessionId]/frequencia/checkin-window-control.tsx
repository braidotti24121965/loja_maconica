"use client";

import { useState, useEffect } from "react";
import { QrCode, Play, Square, ExternalLink, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { openCheckinWindow, closeCheckinWindow } from "./actions";

export function CheckinWindowControl({ 
  sessionId, 
  initialWindow 
}: { 
  sessionId: string;
  initialWindow: { qr_token: string; short_code: string; expires_at: string; status: string } | null;
}) {
  const [activeWindow, setActiveWindow] = useState(initialWindow);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (activeWindow?.status !== "open" || !activeWindow.expires_at) {
      // setTimeLeft("");
      return;
    }
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(activeWindow.expires_at).getTime();
      const diff = expires - now;
      if (diff <= 0) {
        setActiveWindow(null); // Auto-hide when expired
        setTimeLeft("Expirado");
        clearInterval(interval);
      } else {
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}m restantes`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWindow]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.maconaria360.com.br";
  const challengeUrl = activeWindow?.status === "open" ? `${baseUrl}/checkin/qr/${activeWindow.qr_token}` : "";

  const handleOpen = async () => {
    setLoading(true);
    const res = await openCheckinWindow(sessionId, 4);
    if (res.success) {
      setActiveWindow({ qr_token: res.qr_token, short_code: res.short_code, expires_at: res.expires_at, status: "open" });
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  const handleClose = async () => {
    if (!confirm("Tem certeza que deseja encerrar o check-in?")) return;
    setLoading(true);
    const res = await closeCheckinWindow(sessionId);
    if (res.success) {
      setActiveWindow(null);
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="card" style={{ marginBottom: 24, background: activeWindow?.status === "open" ? "#ecfdf5" : "var(--page)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <QrCode size={20} color="var(--brand)" /> 
            {activeWindow?.status === "open" ? "Janela de Check-in Aberta" : "Janela de Check-in Fechada"}
          </h2>
          <p className="subtle" style={{ margin: 0, fontSize: 13 }}>
            {activeWindow?.status === "open" 
              ? "Os irmãos podem escanear este código ou digitar a URL abaixo para confirmar presença." 
              : "Abra a janela para permitir que os irmãos registrem presença via QR Code."}
          </p>
        </div>
        <div>
          {activeWindow?.status === "open" ? (
            <button onClick={handleClose} disabled={loading} className="button" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--danger)", color: "#fff" }}>
              <Square size={16} fill="currentColor" /> {loading ? "Fechando..." : "Encerrar Check-in"}
            </button>
          ) : (
            <button onClick={handleOpen} disabled={loading} className="button" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Play size={16} fill="currentColor" /> {loading ? "Abrindo..." : "Iniciar Check-in Inteligente"}
            </button>
          )}
        </div>
      </div>

      {activeWindow?.status === "open" && (
        <div style={{ display: "flex", gap: 24, alignItems: "center", background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #34d399" }}>
          <div style={{ padding: 16, background: "#fff", border: "1px solid var(--border)", borderRadius: 8 }}>
            <QRCodeSVG value={challengeUrl} size={150} level="H" includeMargin={false} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--subtle)", marginBottom: 4 }}>Código Numérico</div>
            <div style={{ fontSize: 32, fontFamily: "monospace", fontWeight: 700, letterSpacing: 4, color: "var(--text)", marginBottom: 16 }}>
              {activeWindow.short_code}
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <a href={challengeUrl} target="_blank" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--brand)", textDecoration: "none" }}>
                Abrir Link de QR <ExternalLink size={14} />
              </a>
              <span style={{ fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={14} /> Expira em: {timeLeft}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
