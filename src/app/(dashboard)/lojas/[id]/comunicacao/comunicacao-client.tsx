"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function ComunicacaoClient({ storeName, type, title, icon, data }: { storeName: string, type: "session" | "event" | "general", title: string, icon: React.ReactNode, data: Record<string, string | number | boolean> | null }) {
  const [copied, setCopied] = useState(false);
  const initialText = type === "session"
    ? (data ? `*CONVOCAÇÃO - ${storeName}*\n\nMeus amados Irmãos, convoco a todos para a nossa próxima Sessão ${data.session_type}, que será realizada no dia *${new Date((data.date as string) + 'T12:00:00').toLocaleDateString('pt-BR')}*.\n\n*Pauta/Ordem do Dia:*\n${data.description || "Conforme liturgia."}\n\nContamos com a presença de todos!` : "Nenhuma sessão agendada no sistema.")
    : type === "event"
      ? (data ? `*CONVITE ESPECIAL - ${storeName}*\n\nMeus Irmãos e Cunhadas, temos a alegria de convidar a todos para o evento: *${data.title}*!\n\n📅 Data: *${new Date(data.event_date as string).toLocaleDateString('pt-BR')}*\n📍 Local: ${data.location || "Na nossa Loja"}\n\n${data.description ? `*Detalhes:*\n${data.description}\n\n` : ''}Não deixem de participar!` : "Nenhum evento agendado no sistema.")
      : `*COMUNICADO - ${storeName}*\n\nMeus Irmãos, ...`;

  const [text, setText] = useState(initialText);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
        {icon} {title}
      </h2>
      <textarea
        className="input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ flex: 1, minHeight: 150, fontFamily: "inherit", lineHeight: 1.5, resize: "vertical", marginBottom: 16 }}
      />
      <button 
        onClick={handleCopy} 
        disabled={!data && type !== "general"}
        className="button" 
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: copied ? "var(--green-dark)" : "var(--navy)", color: "white" }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copiado!" : "Copiar para o WhatsApp"}
      </button>
    </div>
  );
}
