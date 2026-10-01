import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Cake, Award, Sparkles, MessageSquare, Heart } from "lucide-react";
import { createEphemeris } from "./actions";
import { EphemerisActions } from "./ephemeris-actions";

interface EphemerisItem {
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

export default async function EfemeridesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/lojas");

  const isAdmin = ["admin", "secretary"].includes(membership.role);

  // Fetch upcoming ephemerides and anniversaries from RPC
  const { data: items } = await supabase.rpc("get_upcoming_ephemerides", {
    p_store_id: storeId,
    p_days_ahead: 60,
  });

  const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const allItems: EphemerisItem[] = (items as EphemerisItem[]) || [];
  
  // Categorize
  const birthdays = allItems.filter((i: EphemerisItem) => i.item_type === "birthday");
  const dependentBirthdays = allItems.filter((i: EphemerisItem) => i.item_type === "dependent_birthday");
  const masonicAnniversaries = allItems.filter((i: EphemerisItem) => ["initiation", "elevation", "exaltation"].includes(i.item_type));
  const ephemerides = allItems.filter((i: EphemerisItem) => i.item_type === "ephemeris");

  // Aniversariantes da semana/mês para copiar mensagem WhatsApp
  const whatsappBirthdaysText = birthdays
    .map((b: EphemerisItem) => `🎉 Ir. ${b.brother_name} (${String(b.day).padStart(2, "0")}/${String(b.month).padStart(2, "0")})`)
    .join("%0A");

  const whatsappDependentsText = dependentBirthdays
    .map((d: EphemerisItem) => `🌺 ${d.brother_name} (${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")})`)
    .join("%0A");

  const whatsappSections: string[] = [];
  if (birthdays.length > 0) {
    whatsappSections.push(`🏛️ *IRMÃOS ANIVERSARIANTES DO MÊS*%0A${whatsappBirthdaysText}`);
  }
  if (dependentBirthdays.length > 0) {
    whatsappSections.push(`🌺 *DEPENDENTES & FAMILIARES ANIVERSARIANTES*%0A${whatsappDependentsText}`);
  }

  const whatsappText = `✨ *ANIVERSARIANTES DO MÊS - A.R.L.S.* ✨%0A%0A${whatsappSections.join("%0A%0A") || "Nenhum aniversariante no mês."}%0A%0ADesejamos a todos muita saúde, paz e fraternidade! 🤝🏛️`;

  return (
    <div>
      <Link href={`/lojas/${storeId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para a Loja
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <Calendar color="var(--brand)" size={28} /> Efemérides e Datas Maçônicas
          </h1>
          <p className="subtle">Calendário de comemorações, aniversariantes natalícios e efemérides da loja.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href={`/lojas/${storeId}/efemerides/relatorio`}
            className="button"
            style={{ background: "#0f766e", color: "#ffffff", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 700, padding: "10px 18px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(15, 118, 110, 0.25)" }}
          >
            <Calendar size={16} /> Relatório PDF (Chanceler)
          </Link>

          {(birthdays.length > 0 || dependentBirthdays.length > 0) && (
            <a
              href={`https://api.whatsapp.com/send?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="button"
              style={{ background: "#25D366", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
            >
              <MessageSquare size={16} /> Mensagem para WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Grid de Seções */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 32 }}>
        
        {/* Aniversariantes Natalícios dos Irmãos */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--brand)" }}>
            <Cake size={18} /> Aniversariantes Irmãos
          </h3>
          {birthdays.length === 0 ? (
            <p className="subtle" style={{ fontSize: 14 }}>Nenhum aniversário de irmão neste período.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {birthdays.map((b: EphemerisItem) => {
                const isToday = b.day === currentDay && b.month === currentMonth;
                return (
                  <div key={b.item_id + b.title} style={{ padding: 12, borderRadius: 8, background: isToday ? "#ecfdf5" : "var(--page)", border: isToday ? "1px solid #34d399" : "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{b.brother_name}</strong>
                      <span className="badge" style={{ background: isToday ? "#10b981" : undefined, color: isToday ? "#fff" : undefined }}>
                        {String(b.day).padStart(2, "0")}/{String(b.month).padStart(2, "0")} {isToday && "🎂 HOJE!"}
                      </span>
                    </div>
                    <span className="subtle" style={{ fontSize: 12 }}>{b.degree}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aniversariantes Dependentes e Familiares */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--brand)" }}>
            <Heart size={18} /> Aniversariantes Familiares
          </h3>
          {dependentBirthdays.length === 0 ? (
            <p className="subtle" style={{ fontSize: 14 }}>Nenhum aniversário de familiar neste período.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dependentBirthdays.map((d: EphemerisItem) => {
                const isToday = d.day === currentDay && d.month === currentMonth;
                return (
                  <div key={d.item_id + d.title} style={{ padding: 12, borderRadius: 8, background: isToday ? "#fdf2f8" : "var(--page)", border: isToday ? "1px solid #f472b6" : "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{d.brother_name}</strong>
                      <span className="badge" style={{ background: isToday ? "#ec4899" : undefined, color: isToday ? "#fff" : undefined }}>
                        {String(d.day).padStart(2, "0")}/{String(d.month).padStart(2, "0")} {d.year ? `(${d.year})` : ""} {isToday && "🎂 HOJE!"}
                      </span>
                    </div>
                    <p className="subtle" style={{ margin: "4px 0 0 0", fontSize: 12 }}>{d.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aniversários Maçônicos */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--brand)" }}>
            <Award size={18} /> Datas Maçônicas dos Irmãos
          </h3>
          {masonicAnniversaries.length === 0 ? (
            <p className="subtle" style={{ fontSize: 14 }}>Nenhuma data maçônica neste período.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {masonicAnniversaries.map((m: EphemerisItem) => (
                <div key={m.item_id + m.item_type} style={{ padding: 12, borderRadius: 8, background: "var(--page)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{m.title}</strong>
                    <span className="badge">
                      {String(m.day).padStart(2, "0")}/{String(m.month).padStart(2, "0")} {m.year ? `(${m.year})` : ""}
                    </span>
                  </div>
                  <p className="subtle" style={{ margin: "4px 0 0 0", fontSize: 12 }}>{m.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Efemérides Históricas & Locais */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, margin: 0, display: "flex", alignItems: "center", gap: 8, color: "var(--brand)" }}>
            <Sparkles size={18} /> Efemérides Históricas & Comemorativas
          </h3>
        </div>

        {ephemerides.length === 0 ? (
          <p className="subtle" style={{ fontSize: 14 }}>Nenhuma efeméride histórica cadastrada.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {ephemerides.map((e: EphemerisItem) => (
              <div key={e.item_id} style={{ padding: 16, borderRadius: 8, background: e.is_global ? "#f0f9ff" : "var(--page)", border: e.is_global ? "1px solid #7dd3fc" : "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{e.title}</strong>
                    {e.is_global && <span className="badge" style={{ marginLeft: 8, background: "#0284c7", color: "#fff" }}>SaaS Geral</span>}
                  </div>
                  <span className="badge">
                    {String(e.day).padStart(2, "0")}/{String(e.month).padStart(2, "0")} {e.year ? `(${e.year})` : ""}
                  </span>
                </div>
                {e.description && <p className="subtle" style={{ fontSize: 13, margin: 0 }}>{e.description}</p>}

                {isAdmin && !e.is_global && (
                  <EphemerisActions storeId={storeId} ephemeris={e} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulário de Nova Efeméride Local (Somente Admin/Secretary) */}
      {isAdmin && (
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Cadastrar Nova Efeméride da Loja</h3>
          <form action={async (formData) => { "use server"; await createEphemeris(formData); }} className="form" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <input type="hidden" name="store_id" value={storeId} />

            <div className="field" style={{ gridColumn: "span 2" }}>
              <label htmlFor="title">Título da Efeméride</label>
              <input id="title" name="title" type="text" required placeholder="Ex: Aniversário de Fundação da Loja" />
            </div>

            <div className="field">
              <label htmlFor="day">Dia (1-31)</label>
              <input id="day" name="day" type="number" min={1} max={31} required placeholder="Ex: 14" />
            </div>

            <div className="field">
              <label htmlFor="month">Mês (1-12)</label>
              <select id="month" name="month" required>
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{idx + 1} - {name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="year">Ano (Opcional se for recorrente)</label>
              <input id="year" name="year" type="number" placeholder="Ex: 1980 (Deixe em branco para anual)" />
            </div>

            <div className="field">
              <label htmlFor="category">Categoria</label>
              <select id="category" name="category" required defaultValue="store_anniversary">
                <option value="store_anniversary">Fundação / Aniversário da Loja</option>
                <option value="masonic_history">História Maçônica</option>
                <option value="commemorative">Comemorativa</option>
                <option value="other">Outra</option>
              </select>
            </div>

            <div className="field" style={{ gridColumn: "span 2" }}>
              <label htmlFor="description">Descrição / História (Opcional)</label>
              <textarea id="description" name="description" rows={2} placeholder="Breve resumo sobre esta data..." />
            </div>

            <div style={{ gridColumn: "span 2", marginTop: 8 }}>
              <button type="submit" className="button">Salvar Efeméride</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
