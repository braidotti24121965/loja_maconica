"use client";

import { useActionState } from "react";
import { saveEvent } from "./actions";
import Link from "next/link";

export function EventForm({ storeId, event }: { storeId: string, event?: { id: string; title: string; description: string | null; event_date: string; event_time: string | null; location: string | null; status: string; } }) {
  const [state, action, pending] = useActionState(async (_state: { error?: string } | null | undefined, data: FormData) => {
    return await saveEvent(data);
  }, null);

  return (
    <form action={action} className="form">
      {state?.error && <div className="message error">{state.error}</div>}
      
      <input type="hidden" name="store_id" value={storeId} />
      {event?.id && <input type="hidden" name="event_id" value={event.id} />}

      <div className="field">
        <label htmlFor="title">Título do Evento</label>
        <input type="text" id="title" name="title" required defaultValue={event?.title} placeholder="Ex: Banquete Solsticial" />
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="event_date">Data</label>
          <input type="date" id="event_date" name="event_date" required defaultValue={event?.event_date} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="event_time">Horário</label>
          <input type="time" id="event_time" name="event_time" defaultValue={event?.event_time?.slice(0, 5)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="location">Local</label>
        <input type="text" id="location" name="location" defaultValue={event?.location || ""} placeholder="Ex: Salão de Festas da Loja" />
      </div>

      <div className="field">
        <label htmlFor="description">Descrição</label>
        <textarea id="description" name="description" rows={4} defaultValue={event?.description || ""} placeholder="Detalhes adicionais sobre o evento..."></textarea>
      </div>

      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={event?.status || "published"}>
          <option value="draft">Rascunho</option>
          <option value="published">Publicado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <Link href={event?.id ? `/lojas/${storeId}/eventos/${event.id}` : `/lojas/${storeId}/eventos`} className="button" style={{ background: "transparent", color: "inherit", border: "1px solid var(--border)" }}>
          Cancelar
        </Link>
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar Evento"}
        </button>
      </div>
    </form>
  );
}
