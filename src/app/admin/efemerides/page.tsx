import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Plus, Trash } from "lucide-react";
import { createGlobalEphemeris, deleteGlobalEphemeris } from "./actions";

interface EphemerisItem {
  id: string;
  title: string;
  description: string | null;
  day: number;
  month: number;
  year: number | null;
  category: string;
}

export default async function AdminEfemeridesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) redirect("/lojas");

  // Fetch global ephemerides (store_id IS NULL)
  const { data: ephemeridesData } = await supabase
    .from("ephemerides")
    .select("id, title, description, day, month, year, category")
    .is("store_id", null)
    .order("month", { ascending: true })
    .order("day", { ascending: true });

  const ephemerides: EphemerisItem[] = ephemeridesData || [];

  const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "#64748b", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para o Painel Admin
      </Link>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8, display: "flex", alignItems: "center", gap: 10, color: "#0f172a" }}>
          <Sparkles color="#0284c7" size={28} /> Efemérides Globais da Plataforma (SaaS)
        </h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Cadastre datas comemorativas históricas da maçonaria visíveis para todas as lojas clientes.
        </p>
      </div>

      {/* Lista de Efemérides Globais */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Efemérides Globais Ativas ({ephemerides.length})</h3>

        {ephemerides.length === 0 ? (
          <p className="subtle" style={{ fontSize: 14 }}>Nenhuma efeméride global cadastrada.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {ephemerides.map((e) => (
              <div key={e.id} style={{ padding: 16, borderRadius: 8, background: "#f0f9ff", border: "1px solid #7dd3fc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <strong style={{ fontSize: 15, color: "#0369a1" }}>{e.title}</strong>
                  <span className="badge" style={{ background: "#0284c7", color: "#fff" }}>
                    {String(e.day).padStart(2, "0")}/{String(e.month).padStart(2, "0")} {e.year ? `(${e.year})` : ""}
                  </span>
                </div>
                {e.description && <p style={{ fontSize: 13, color: "#334155", margin: "0 0 12px 0" }}>{e.description}</p>}

                <form action={async (formData) => { "use server"; await deleteGlobalEphemeris(formData); }}>
                  <input type="hidden" name="ephemeris_id" value={e.id} />
                  <button type="submit" className="button" style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef4444", padding: "4px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Trash size={12} /> Excluir Efeméride Global
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulário de Cadastro de Efeméride Global */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Plus size={18} /> Cadastrar Nova Efeméride Global
        </h3>
        <form action={async (formData) => { "use server"; await createGlobalEphemeris(formData); }} className="form" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          
          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="title">Título da Efeméride</label>
            <input id="title" name="title" type="text" required placeholder="Ex: Dia do Maçom" />
          </div>

          <div className="field">
            <label htmlFor="day">Dia (1-31)</label>
            <input id="day" name="day" type="number" min={1} max={31} required placeholder="Ex: 20" />
          </div>

          <div className="field">
            <label htmlFor="month">Mês (1-12)</label>
            <select id="month" name="month" required defaultValue={8}>
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{idx + 1} - {name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="year">Ano (Opcional)</label>
            <input id="year" name="year" type="number" placeholder="Ex: 1922 (Deixe em branco se anual)" />
          </div>

          <div className="field">
            <label htmlFor="category">Categoria</label>
            <select id="category" name="category" required defaultValue="masonic_history">
              <option value="masonic_history">História Maçônica</option>
              <option value="commemorative">Data Comemorativa</option>
              <option value="other">Outra</option>
            </select>
          </div>

          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="description">Descrição / Significado Histórico (Opcional)</label>
            <textarea id="description" name="description" rows={2} placeholder="Resumo sobre a celebração..." />
          </div>

          <div style={{ gridColumn: "span 2", marginTop: 8 }}>
            <button type="submit" className="button" style={{ background: "#0284c7" }}>Salvar Efeméride Global</button>
          </div>
        </form>
      </div>
    </div>
  );
}
