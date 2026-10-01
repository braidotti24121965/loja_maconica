"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Mail, Check, Send } from "lucide-react";

export interface EphemerisItem {
  item_type: string;
  item_id: string;
  title: string;
  description: string | null;
  day: number;
  month: number;
  year: number | null;
  degree: string | null;
  brother_name: string | null;
  category: string;
  is_global: boolean;
}

export interface SessionOption {
  id: string;
  title: string;
  date: string;
  session_type: string;
}

export interface StoreInfo {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  number: string | null;
}

export interface BrotherEmail {
  id: string;
  full_name: string;
  email: string | null;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function isDateInRange(day: number, month: number, startDateStr: string, endDateStr: string): boolean {
  if (!startDateStr || !endDateStr) return true;

  const sParts = startDateStr.split("-").map(Number);
  const eParts = endDateStr.split("-").map(Number);

  if (sParts.length !== 3 || eParts.length !== 3) return true;

  const sDate = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0);
  const eDate = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59, 999);

  // Try item date in start year
  const itemDateCurrent = new Date(sParts[0], month - 1, day, 0, 0, 0, 0);
  if (itemDateCurrent >= sDate && itemDateCurrent <= eDate) return true;

  // Try item date in end year (cross year boundary)
  const itemDateEndYear = new Date(eParts[0], month - 1, day, 0, 0, 0, 0);
  if (itemDateEndYear >= sDate && itemDateEndYear <= eDate) return true;

  return false;
}

export function EphemeridesReportClient({
  store,
  items,
  sessions,
  brotherEmails,
  initialSessionId,
}: {
  store: StoreInfo;
  items: EphemerisItem[];
  sessions: SessionOption[];
  brotherEmails: BrotherEmail[];
  initialSessionId?: string;
}) {
  // Set default initial dates based on selected session or today
  const defaultStartDate = new Date().toISOString().split("T")[0];
  const defaultEndDateObj = new Date();
  defaultEndDateObj.setDate(defaultEndDateObj.getDate() + 13);
  const defaultEndDate = defaultEndDateObj.toISOString().split("T")[0];

  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId || "");
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState<string>("");
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // Handle session change
  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    if (!sessionId) return;

    const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    const idx = sortedSessions.findIndex((s) => s.id === sessionId);

    if (idx !== -1) {
      const currSessionDate = sortedSessions[idx].date;
      setStartDate(currSessionDate);

      // Next session date minus 1 day, or +13 days if no next session
      if (idx < sortedSessions.length - 1) {
        const nextDate = new Date(sortedSessions[idx + 1].date);
        nextDate.setDate(nextDate.getDate() - 1);
        setEndDate(nextDate.toISOString().split("T")[0]);
      } else {
        const currDate = new Date(currSessionDate);
        currDate.setDate(currDate.getDate() + 13);
        setEndDate(currDate.toISOString().split("T")[0]);
      }
    }
  };

  // Set quick ranges
  const setQuickRange = (days: number) => {
    const sDateObj = startDate ? new Date(startDate) : new Date();
    const eDateObj = new Date(sDateObj);
    eDateObj.setDate(eDateObj.getDate() + (days - 1));
    setStartDate(sDateObj.toISOString().split("T")[0]);
    setEndDate(eDateObj.toISOString().split("T")[0]);
  };

  // Filter items in date range
  const filteredItems = items.filter((item) => isDateInRange(item.day, item.month, startDate, endDate));

  const birthdays = filteredItems.filter((i) => i.item_type === "birthday");
  const dependentBirthdays = filteredItems.filter((i) => i.item_type === "dependent_birthday");
  const masonicAnniversaries = filteredItems.filter((i) =>
    ["initiation", "elevation", "exaltation"].includes(i.item_type)
  );
  const ephemerides = filteredItems.filter((i) => i.item_type === "ephemeris");

  // Construct Email Text
  const emailSubject = `Prancha de Efemérides - A.R.L.S. ${store.name} (${formatDateBR(startDate)} a ${formatDateBR(endDate)})`;
  
  const formattedSections: string[] = [];
  if (birthdays.length > 0) {
    formattedSections.push(
      `🏛️ IRMÃOS ANIVERSARIANTES:\n` +
      birthdays.map((b) => `- ${String(b.day).padStart(2, "0")}/${String(b.month).padStart(2, "0")}: Ir. ${b.brother_name} (${b.degree})`).join("\n")
    );
  }
  if (dependentBirthdays.length > 0) {
    formattedSections.push(
      `🌺 DEPENDENTES & FAMILIARES ANIVERSARIANTES:\n` +
      dependentBirthdays.map((d) => `- ${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}: ${d.brother_name}`).join("\n")
    );
  }
  if (masonicAnniversaries.length > 0) {
    formattedSections.push(
      `📜 DATAS MAÇÔNICAS DOS IRMÃOS:\n` +
      masonicAnniversaries.map((m) => `- ${String(m.day).padStart(2, "0")}/${String(m.month).padStart(2, "0")}: ${m.title}`).join("\n")
    );
  }
  if (ephemerides.length > 0) {
    formattedSections.push(
      `⭐ EFEMÉRIDES HISTÓRICAS E COMEMORATIVAS:\n` +
      ephemerides.map((e) => `- ${String(e.day).padStart(2, "0")}/${String(e.month).padStart(2, "0")}: ${e.title}`).join("\n")
    );
  }

  const emailBodyText =
    `A.R.L.S. ${store.name.toUpperCase()}\n` +
    `PRANCHA DE EFEMÉRIDES E COMEMORAÇÕES\n` +
    `Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}\n\n` +
    (formattedSections.join("\n\n") || "Nenhuma efeméride registrada para este período.") +
    `\n\nFraternalmente,\nChanceler da A.R.L.S. ${store.name}`;

  const mailtoLink = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyText)}`;

  const handlePrint = () => {
    window.print();
  };

  const validEmailsList = brotherEmails
    .map((b) => b.email?.trim())
    .filter((e): e is string => Boolean(e && e.includes("@")));

  return (
    <div>
      {/* Controles do Relatório (Ocultos na Impressão) */}
      <div className="no-print" style={{ marginBottom: 24 }}>
        <Link
          href={`/lojas/${store.id}/efemerides`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 20,
            fontSize: 14,
            color: "var(--subtle)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} /> Voltar para Efemérides
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, margin: "0 0 6px 0" }}>Prancha de Efemérides da Sessão</h1>
            <p className="subtle" style={{ margin: 0 }}>
              Relatório oficial do Chanceler para leitura em sessão e expedição em PDF ou e-mail.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handlePrint}
              className="button"
              style={{ background: "var(--brand)", color: "#fff", gap: 8 }}
            >
              <Printer size={16} /> Imprimir / Baixar PDF
            </button>
            <button
              onClick={() => setEmailModalOpen(true)}
              className="button"
              style={{ background: "#2563eb", color: "#fff", gap: 8 }}
            >
              <Mail size={16} /> Enviar por E-mail
            </button>
          </div>
        </div>

        {/* Card de Filtro e Seleção do Período */}
        <div className="card" style={{ padding: 20, marginBottom: 24, background: "#f8fafc", border: "1px solid var(--border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, alignItems: "flex-end" }}>
            
            {/* Seleção de Sessão Registrada */}
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="session_select" style={{ fontSize: 13, fontWeight: 600 }}>
                Vincular a uma Sessão da Loja
              </label>
              <select
                id="session_select"
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border)", background: "#fff" }}
              >
                <option value="">-- Seleção Livre por Data --</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDateBR(s.date)} - {s.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Inicial */}
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="start_date" style={{ fontSize: 13, fontWeight: 600 }}>
                Data da Sessão (Início)
              </label>
              <input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setSelectedSessionId("");
                  setStartDate(e.target.value);
                }}
                style={{ height: 38 }}
              />
            </div>

            {/* Data Final */}
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="end_date" style={{ fontSize: 13, fontWeight: 600 }}>
                Até 1 dia antes da Próxima Sessão
              </label>
              <input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setSelectedSessionId("");
                  setEndDate(e.target.value);
                }}
                style={{ height: 38 }}
              />
            </div>

            {/* Atalhos Rápidos */}
            <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
              <button
                type="button"
                onClick={() => setQuickRange(7)}
                className="subtle"
                style={{ padding: "8px 12px", fontSize: 12, border: "1px solid var(--border)", background: "#fff", borderRadius: 6, cursor: "pointer" }}
              >
                7 Dias
              </button>
              <button
                type="button"
                onClick={() => setQuickRange(14)}
                className="subtle"
                style={{ padding: "8px 12px", fontSize: 12, border: "1px solid var(--border)", background: "#fff", borderRadius: 6, cursor: "pointer" }}
              >
                14 Dias (Quinzenal)
              </button>
              <button
                type="button"
                onClick={() => setQuickRange(30)}
                className="subtle"
                style={{ padding: "8px 12px", fontSize: 12, border: "1px solid var(--border)", background: "#fff", borderRadius: 6, cursor: "pointer" }}
              >
                30 Dias (Mensal)
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Modal de Envio por E-mail (Oculto na Impressão) */}
      {emailModalOpen && (
        <div
          className="no-print"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 500, width: "100%", background: "#fff", borderRadius: 8, padding: 24 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <Mail color="var(--brand)" size={20} /> Enviar Prancha de Efemérides por E-mail
            </h3>
            <p className="subtle" style={{ fontSize: 13, marginBottom: 20 }}>
              Você pode abrir diretamente seu leitor de e-mail padronizado com o texto do boletim ou especificar o destinatário.
            </p>

            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="target_email" style={{ fontSize: 13, fontWeight: 600 }}>
                E-mail do Destinatário (Opcional)
              </label>
              <input
                id="target_email"
                type="email"
                placeholder="ex: secretario@loja.org.br ou deixe em branco"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
              />
            </div>

            {validEmailsList.length > 0 && (
              <div style={{ marginBottom: 20, fontSize: 12, color: "var(--subtle)" }}>
                💡 <strong>Dica:</strong> A loja possui {validEmailsList.length} e-mails de irmãos cadastrados.
              </div>
            )}

            {emailSentSuccess && (
              <div style={{ background: "#ecfdf5", color: "#065f46", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <Check size={16} /> Leitor de e-mail iniciado com o boletim formatado!
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => {
                  setEmailModalOpen(false);
                  setEmailSentSuccess(false);
                }}
                className="subtle"
                style={{ background: "transparent", border: "1px solid var(--border)", padding: "8px 16px" }}
              >
                Fechar
              </button>

              <a
                href={mailtoLink}
                onClick={() => setEmailSentSuccess(true)}
                className="button"
                style={{ background: "var(--brand)", color: "#fff", gap: 6, textDecoration: "none" }}
              >
                <Send size={15} /> Abrir no E-mail
              </a>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTO DO RELATÓRIO / PRANCHA DE EFEMÉRIDES (Formatado para PDF e Impressão) */}
      <div
        className="ephemeris-pdf-document"
        style={{
          background: "#ffffff",
          color: "#0f172a",
          padding: "48px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          maxWidth: "850px",
          margin: "0 auto",
          fontFamily: "'Times New Roman', Times, serif",
          lineHeight: 1.6,
        }}
      >
        {/* Cabeçalho Maçônico Oficial */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, color: "#475569" }}>
            A. R. L. S.
          </div>
          <h1 style={{ fontSize: 26, margin: "6px 0 4px 0", letterSpacing: 1, textTransform: "uppercase", color: "#0f172a", fontWeight: 700 }}>
            {store.name} {store.number ? `Nº ${store.number}` : ""}
          </h1>
          <div style={{ fontSize: 14, fontStyle: "italic", color: "#334155" }}>
            Or. de {store.city || "Salto"}{store.state ? ` - ${store.state}` : ""}
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #cbd5e1", fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            PRANCHA DE EFEMÉRIDES E COMEMORAÇÕES DA SESSÃO
          </div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
            Período de <strong>{formatDateBR(startDate)}</strong> a <strong>{formatDateBR(endDate)}</strong>
          </div>
        </div>

        {/* 1. Irmãos Aniversariantes Natalícios */}
        <div style={{ marginBottom: 28 }}>
          <h3
            style={{
              fontSize: 16,
              textTransform: "uppercase",
              borderBottom: "1px solid #94a3b8",
              paddingBottom: 4,
              marginBottom: 12,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🎂</span> 1. Irmãos Aniversariantes Natalícios
          </h3>

          {birthdays.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#64748b", fontSize: 14, margin: "8px 0" }}>
              Nenhum aniversário natalício de irmão cadastrado neste período.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", background: "#f8fafc" }}>
                  <th style={{ padding: "6px 12px", width: "80px" }}>Data</th>
                  <th style={{ padding: "6px 12px" }}>Nome do Irmão</th>
                  <th style={{ padding: "6px 12px" }}>Grau Maçônico</th>
                </tr>
              </thead>
              <tbody>
                {birthdays.map((b) => (
                  <tr key={b.item_id + b.title} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 700 }}>
                      {String(b.day).padStart(2, "0")}/{String(b.month).padStart(2, "0")}
                    </td>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{b.brother_name}</td>
                    <td style={{ padding: "8px 12px", color: "#475569" }}>{b.degree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 2. Aniversariantes Dependentes e Familiares */}
        <div style={{ marginBottom: 28 }}>
          <h3
            style={{
              fontSize: 16,
              textTransform: "uppercase",
              borderBottom: "1px solid #94a3b8",
              paddingBottom: 4,
              marginBottom: 12,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🌺</span> 2. Aniversariantes Dependentes & Familiares
          </h3>

          {dependentBirthdays.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#64748b", fontSize: 14, margin: "8px 0" }}>
              Nenhum aniversário de dependente ou familiar cadastrado neste período.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", background: "#f8fafc" }}>
                  <th style={{ padding: "6px 12px", width: "80px" }}>Data</th>
                  <th style={{ padding: "6px 12px" }}>Familiar / Dependente</th>
                  <th style={{ padding: "6px 12px" }}>Vínculo de Parentesco</th>
                </tr>
              </thead>
              <tbody>
                {dependentBirthdays.map((d) => (
                  <tr key={d.item_id + d.title} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 700 }}>
                      {String(d.day).padStart(2, "0")}/{String(d.month).padStart(2, "0")}
                    </td>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{d.brother_name}</td>
                    <td style={{ padding: "8px 12px", color: "#475569" }}>{d.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 3. Datas e Aniversários Maçônicos */}
        <div style={{ marginBottom: 28 }}>
          <h3
            style={{
              fontSize: 16,
              textTransform: "uppercase",
              borderBottom: "1px solid #94a3b8",
              paddingBottom: 4,
              marginBottom: 12,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>📜</span> 3. Datas Maçônicas dos Irmãos
          </h3>

          {masonicAnniversaries.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#64748b", fontSize: 14, margin: "8px 0" }}>
              Nenhuma data de Iniciação, Elevação ou Exaltação registrada neste período.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", background: "#f8fafc" }}>
                  <th style={{ padding: "6px 12px", width: "80px" }}>Data</th>
                  <th style={{ padding: "6px 12px" }}>Acontecimento Maçônico</th>
                  <th style={{ padding: "6px 12px" }}>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {masonicAnniversaries.map((m) => (
                  <tr key={m.item_id + m.item_type} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 700 }}>
                      {String(m.day).padStart(2, "0")}/{String(m.month).padStart(2, "0")}
                    </td>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{m.title}</td>
                    <td style={{ padding: "8px 12px", color: "#475569" }}>{m.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. Efemérides Históricas & Comemorativas */}
        <div style={{ marginBottom: 36 }}>
          <h3
            style={{
              fontSize: 16,
              textTransform: "uppercase",
              borderBottom: "1px solid #94a3b8",
              paddingBottom: 4,
              marginBottom: 12,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⭐</span> 4. Efemérides Históricas & Comemorativas
          </h3>

          {ephemerides.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#64748b", fontSize: 14, margin: "8px 0" }}>
              Nenhuma efeméride histórica ou comemorativa registrada para este período.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {ephemerides.map((e) => (
                <li key={e.item_id} style={{ padding: "8px 0", borderBottom: "1px dashed #e2e8f0" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <strong style={{ minWidth: 60, fontSize: 14 }}>
                      {String(e.day).padStart(2, "0")}/{String(e.month).padStart(2, "0")}
                    </strong>
                    <div>
                      <strong style={{ fontSize: 15 }}>{e.title}</strong>
                      {e.description && <p style={{ margin: "2px 0 0 0", fontSize: 13, color: "#475569" }}>{e.description}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rodapé Maçônico com Campo de Assinatura */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 13, color: "#475569", fontStyle: "italic" }}>
            Dado e traçado no Or. de {store.city || "Salto"}{store.state ? ` - ${store.state}` : ""}, em {formatDateBR(startDate)}.
          </div>

          <div style={{ textAlign: "center", minWidth: 260 }}>
            <div style={{ borderBottom: "1px solid #0f172a", width: "100%", marginBottom: 6 }}></div>
            <div style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>Ir. Chanceler</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{store.name}</div>
          </div>
        </div>
      </div>

      {/* Estilos globais para impressão PDF */}
      <style jsx global>{`
        @media print {
          html, body, .shell, .main, .content {
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            float: none !important;
          }
          .no-print,
          .sidebar,
          .topbar,
          header,
          nav,
          aside {
            display: none !important;
          }
          .ephemeris-pdf-document {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .ephemeris-pdf-document h1,
          .ephemeris-pdf-document h2,
          .ephemeris-pdf-document h3,
          .ephemeris-pdf-document div,
          .ephemeris-pdf-document p,
          .ephemeris-pdf-document table {
            width: 100% !important;
            box-sizing: border-box !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
        }
      `}</style>
    </div>
  );
}
