"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, Plus, Users, Pencil, Trash, X, Camera } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { updateSession, deleteSession } from "./actions";

export interface SessionData {
  id: string;
  date: string;
  session_type: string;
  description: string | null;
  attendances_count: number;
  has_ata: boolean;
  photos_count: number;
}

export function SessoesListClient({
  storeId,
  isAdmin,
  sessions,
  todayStr,
}: {
  storeId: string;
  isAdmin: boolean;
  sessions: SessionData[];
  todayStr: string;
}) {
  const [editingSession, setEditingSession] = useState<SessionData | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<SessionData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const deleteFormId = `delete-session-${sessionToDelete?.id || "form"}`;

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateSession(formData);

    setIsPending(false);
    if (result?.error) {
      setErrorMessage(result.error);
    } else {
      setEditingSession(null);
    }
  };

  return (
    <div style={{ maxWidth: 850, margin: "0 auto" }}>
      <Link
        href={`/lojas/${storeId}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 24,
          fontSize: 14,
          color: "var(--subtle)",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={16} /> Voltar para o Painel da Loja
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Sessões e Atas</h1>
          <p className="subtle">Histórico e agendamento de sessões ordinárias e magnas da loja.</p>
        </div>
        {isAdmin && (
          <Link href={`/lojas/${storeId}/sessoes/nova`} className="button" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> Nova Sessão
          </Link>
        )}
      </div>

      {errorMessage && (
        <div style={{ background: "#fef2f2", color: "#991b1b", padding: "12px 16px", borderRadius: 8, marginBottom: 24, fontSize: 14 }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Lista de Sessões */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {sessions && sessions.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {sessions.map((session, index) => {
              const isFuture = session.date >= todayStr;
              const hasAttendances = session.attendances_count > 0;
              const canEdit = isAdmin && isFuture;
              const canDelete = isAdmin && isFuture && !hasAttendances;

              return (
                <div
                  key={session.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 24px",
                    borderBottom: index < sessions.length - 1 ? "1px solid var(--border)" : "none",
                    flexWrap: "wrap",
                    gap: 16,
                    background: isFuture ? "#f8fafc" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "1 1 300px" }}>
                    <div
                      className="icon"
                      style={{
                        background: isFuture ? "var(--brand)" : "var(--green-soft)",
                        color: isFuture ? "#ffffff" : "var(--green-dark)",
                        width: 48,
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                        flexShrink: 0,
                      }}
                    >
                      <Calendar size={24} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h4 style={{ margin: 0, fontSize: 16 }}>{session.session_type}</h4>
                        {isFuture ? (
                          <span className="badge" style={{ background: "var(--brand)", color: "#fff", fontSize: 11 }}>
                            Próxima / Agendada
                          </span>
                        ) : (
                          <span className="badge" style={{ background: "var(--page)", color: "var(--subtle)", fontSize: 11 }}>
                            Realizada
                          </span>
                        )}
                      </div>
                      <div className="subtle" style={{ fontSize: 13, marginTop: 4 }}>
                        {format(new Date(`${session.date}T12:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                      {session.description && (
                        <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--subtle)" }}>{session.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Ações e Botões */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Link
                      href={`/lojas/${storeId}/efemerides/relatorio?sessionId=${session.id}`}
                      className="button"
                      style={{ background: "transparent", color: "var(--brand)", border: "1px solid var(--brand)", gap: 6, padding: "6px 12px", fontSize: 13, textDecoration: "none" }}
                    >
                      <Calendar size={14} /> Efemérides
                    </Link>

                    <Link
                      href={`/lojas/${storeId}/sessoes/${session.id}/ata`}
                      className="button"
                      style={{
                        background: session.has_ata ? "#f0fdf4" : "transparent",
                        color: session.has_ata ? "#0f766e" : "var(--navy)",
                        border: session.has_ata ? "1px solid #0f766e" : "1px solid var(--navy)",
                        fontWeight: session.has_ata ? 600 : 400,
                        gap: 6,
                        padding: "6px 12px",
                        fontSize: 13,
                        textDecoration: "none",
                      }}
                    >
                      <FileText size={14} color={session.has_ata ? "#0f766e" : undefined} />
                      {session.has_ata
                        ? "Ata Anexada ✓"
                        : isAdmin
                          ? "Anexar Ata (Sem Ata)"
                          : "Ver Ata (Sem Ata)"}
                    </Link>

                    <Link
                      href={`/lojas/${storeId}/sessoes/${session.id}/fotos`}
                      className="button"
                      style={{
                        background: session.photos_count > 0 ? "#eff6ff" : "transparent",
                        color: session.photos_count > 0 ? "#1d4ed8" : "var(--teal-dark, #0f766e)",
                        border: session.photos_count > 0 ? "1px solid #3b82f6" : "1px solid #0f766e",
                        fontWeight: session.photos_count > 0 ? 600 : 400,
                        gap: 6,
                        padding: "6px 12px",
                        fontSize: 13,
                        textDecoration: "none",
                      }}
                    >
                      <Camera size={14} color={session.photos_count > 0 ? "#1d4ed8" : undefined} />
                      Galeria de Fotos ({session.photos_count})
                    </Link>

                    <Link
                      href={`/lojas/${storeId}/sessoes/${session.id}/frequencia`}
                      className="button"
                      style={{ background: "var(--green)", color: "white", gap: 6, padding: "6px 12px", fontSize: 13, textDecoration: "none" }}
                    >
                      <Users size={14} /> Frequência {hasAttendances && `(${session.attendances_count})`}
                    </Link>

                    {/* Botões de Gestão (Editar / Excluir) */}
                    {isAdmin && (
                      <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => {
                              setErrorMessage(null);
                              setEditingSession(session);
                            }}
                            className="button"
                            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)", padding: "6px 10px" }}
                            title="Editar Sessão"
                          >
                            <Pencil size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--subtle)", padding: "6px 10px", opacity: 0.4, cursor: "not-allowed" }}
                            title="Sessões passadas não podem ser editadas"
                          >
                            <Pencil size={15} />
                          </button>
                        )}

                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => {
                              setErrorMessage(null);
                              setSessionToDelete(session);
                            }}
                            className="button"
                            style={{ background: "transparent", border: "1px solid #fee2e2", color: "var(--danger)", padding: "6px 10px" }}
                            title="Excluir Sessão"
                          >
                            <Trash size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--subtle)", padding: "6px 10px", opacity: 0.4, cursor: "not-allowed" }}
                            title={
                              !isFuture
                                ? "Sessões passadas não podem ser excluídas"
                                : "Sessão com frequência registrada não pode ser excluída"
                            }
                          >
                            <Trash size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: "center" }}>Nenhuma sessão registrada.</div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <form
        id={deleteFormId}
        action={async (formData) => {
          setErrorMessage(null);
          const result = await deleteSession(formData);
          if (result?.error) {
            setErrorMessage(result.error);
          }
          setSessionToDelete(null);
        }}
      >
        <input type="hidden" name="store_id" value={storeId} />
        <input type="hidden" name="session_id" value={sessionToDelete?.id || ""} />
      </form>

      <ConfirmDialog
        open={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        title="Excluir Sessão Futura?"
        description={`A sessão "${sessionToDelete?.session_type}" do dia ${sessionToDelete?.date ? formatDateBR(sessionToDelete.date) : ""} será excluída permanentemente.`}
        confirmLabel="Excluir Sessão"
        formId={deleteFormId}
      />

      {/* Modal de Edição de Sessão */}
      {editingSession && (
        <div
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <Pencil color="var(--brand)" size={18} /> Editar Sessão Futura
              </h3>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--subtle)" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="form">
              <input type="hidden" name="store_id" value={storeId} />
              <input type="hidden" name="session_id" value={editingSession.id} />

              <div className="field" style={{ marginBottom: 16 }}>
                <label htmlFor="edit_session_type">Tipo de Sessão</label>
                <select
                  id="edit_session_type"
                  name="session_type"
                  defaultValue={editingSession.session_type}
                  required
                  style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border)", background: "#fff" }}
                >
                  <option value="Sessão Ordinária">Sessão Ordinária</option>
                  <option value="Sessão Magna de Iniciação">Sessão Magna de Iniciação</option>
                  <option value="Sessão Magna de Elevação">Sessão Magna de Elevação</option>
                  <option value="Sessão Magna de Exaltação">Sessão Magna de Exaltação</option>
                  <option value="Sessão Magna de Posse">Sessão Magna de Posse</option>
                  <option value="Sessão Extraordinária">Sessão Extraordinária</option>
                  <option value="Sessão de Instalação">Sessão de Instalação</option>
                  <option value="Outra">Outra</option>
                </select>
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <label htmlFor="edit_date">Data da Sessão</label>
                <input
                  id="edit_date"
                  name="date"
                  type="date"
                  required
                  defaultValue={editingSession.date}
                  min={todayStr}
                  style={{ height: 38 }}
                />
              </div>

              <div className="field" style={{ marginBottom: 24 }}>
                <label htmlFor="edit_description">Descrição / Observações (Opcional)</label>
                <textarea
                  id="edit_description"
                  name="description"
                  rows={3}
                  defaultValue={editingSession.description || ""}
                  placeholder="Instruções ou pauta da reunião..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="subtle"
                  style={{ background: "transparent", border: "1px solid var(--border)", padding: "8px 16px" }}
                >
                  Cancelar
                </button>
                <button type="submit" className="button" disabled={isPending}>
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
