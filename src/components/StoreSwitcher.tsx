"use client";

import { setActiveStore } from "@/lib/context";
import { useTransition } from "react";

type StoreData = { id: string, name: string };

export function StoreSwitcher({ stores, activeId }: { stores: StoreData[], activeId: string | null }) {
  const [isPending, startTransition] = useTransition();

  const activeStore = stores.find(s => s.id === activeId);

  return (
    <div className="tenant-card">
      <small>Contexto atual</small>
      <div style={{ marginTop: 5 }}>
        <select 
          value={activeId || ""}
          disabled={isPending || stores.length === 0}
          onChange={(e) => {
            startTransition(() => {
              setActiveStore(e.target.value);
            });
          }}
          style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "inherit", fontWeight: 700, opacity: isPending ? 0.5 : 1 }}
        >
          <option value="" disabled>Selecione uma loja</option>
          {stores.map(store => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
        {stores.length === 0 && <p className="subtle" style={{ fontSize: 12, marginTop: 4 }}>Sem lojas disponíveis</p>}
      </div>
    </div>
  );
}
