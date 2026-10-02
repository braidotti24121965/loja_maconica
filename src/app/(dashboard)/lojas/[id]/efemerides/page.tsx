import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Cake, Award, Sparkles, MessageSquare, Heart } from "lucide-react";
import { CreateEphemerisForm } from "./create-ephemeris-form";
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

export default async function EfemeridesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id: storeId } = await params;
  const sParams = searchParams ? await searchParams : {};
  const fromSessoes = sParams.from === "sessoes";

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

  // Fetch upcoming ephemerides and anniversaries from RPC (365 days)
  const { data: items } = await supabase.rpc("get_upcoming_ephemerides", {
    p_store_id: storeId,
    p_days_ahead: 365,
  });

  // Fetch next session date to check if it falls in a subsequent month
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: nextSession } = await supabase
    .from("sessions")
    .select("date")
    .eq("store_id", storeId)
    .gte("date", todayStr)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  let nextSessionDateObj: Date | null = null;
  if (nextSession?.date) {
    const parts = nextSession.date.split("-").map(Number);
    if (parts.length === 3) {
      nextSessionDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }

  const isItemInScope = (item: EphemerisItem): boolean => {
    // 1. Mostrar datas dentro do mês vigente
    if (item.month === currentMonth) return true;

    // 2. Se a próxima sessão for no mês subsequente, mostrar até a data dessa próxima sessão
    if (nextSessionDateObj) {
      const nextSessionMonth = nextSessionDateObj.getMonth() + 1;
      const nextSessionDay = nextSessionDateObj.getDate();

      if (item.month === nextSessionMonth && item.day <= nextSessionDay) {
        return true;
      }
    }

    return false;
  };

  const allItems: EphemerisItem[] = (items as EphemerisItem[]) || [];
  const inScopeItems = allItems.filter(isItemInScope);
  
  // Categorize
  const birthdays = inScopeItems.filter((i: EphemerisItem) => i.item_type === "birthday");
  const dependentBirthdays = inScopeItems.filter((i: EphemerisItem) => i.item_type === "dependent_birthday");
  const masonicAnniversaries = inScopeItems.filter((i: EphemerisItem) => ["initiation", "elevation", "exaltation"].includes(i.item_type));
  const ephemerides = inScopeItems.filter((i: EphemerisItem) => i.item_type === "ephemeris");

  const currentYear = now.getFullYear();

  // Aniversariantes da semana/mês para copiar mensagem WhatsApp
  const whatsappBirthdaysText = birthdays
    .map((b: EphemerisItem) => {
      const age = b.year ? currentYear - b.year : null;
      return `🎉 Ir. ${b.brother_name} (${String(b.day).padStart(2, "0")}/${String(b.month).padStart(2, "0")}${age !== null ? ` - ${age} anos` : ""})`;
    })
    .join("%0A");

  const whatsappDependentsText = dependentBirthdays
    .map((d: EphemerisItem) => {
      const age = d.year ? currentYear - d.year : null;
      return `🌺 ${d.brother_name} (${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}${age !== null ? ` - ${age} anos` : ""})`;
    })
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
      <Link href={fromSessoes ? `/lojas/${storeId}/sessoes` : `/lojas/${storeId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> {fromSessoes ? "Voltar para Sessões e Atas" : "Voltar para a Loja"}
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
            style={{
              backgroundColor: "#0f766e",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              padding: "10px 18px",
              borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(15, 118, 110, 0.3)",
            }}
          >
            <Calendar size={16} color="#ffffff" /> Relatório PDF (Chanceler)
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
                const age = b.year ? currentYear - b.year : null;
                return (
                  <div key={b.item_id + b.title} style={{ padding: 12, borderRadius: 8, background: isToday ? "#ecfdf5" : "var(--page)", border: isToday ? "1px solid #34d399" : "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <strong style={{ flex: "1 1 140px", minWidth: 0, wordBreak: "break-word" }}>{b.brother_name}</strong>
                      <span className="badge" style={{ whiteSpace: "nowrap", flexShrink: 0, background: isToday ? "#10b981" : undefined, color: isToday ? "#fff" : undefined }}>
                        {String(b.day).padStart(2, "0")}/{String(b.month).padStart(2, "0")} {age !== null ? `(${age} anos)` : ""} {isToday && "🎂 HOJE!"}
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
                const age = d.year ? currentYear - d.year : null;
                return (
                  <div key={d.item_id + d.title} style={{ padding: 12, borderRadius: 8, background: isToday ? "#fdf2f8" : "var(--page)", border: isToday ? "1px solid #f472b6" : "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <strong style={{ flex: "1 1 150px", minWidth: 0, wordBreak: "break-word" }}>{d.brother_name}</strong>
                      <span className="badge" style={{ whiteSpace: "nowrap", flexShrink: 0, background: isToday ? "#ec4899" : undefined, color: isToday ? "#fff" : undefined }}>
                        {String(d.day).padStart(2, "0")}/{String(d.month).padStart(2, "0")} {age !== null ? `(${age} anos)` : ""} {isToday && "🎂 HOJE!"}
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
              {masonicAnniversaries.map((m: EphemerisItem) => {
                const isToday = m.day === currentDay && m.month === currentMonth;
                const masonicYears = m.year ? currentYear - m.year : null;
                const milestoneLabel = masonicYears !== null ? `${masonicYears} ${masonicYears === 1 ? "ano" : "anos"}` : "";
                return (
                  <div key={m.item_id + m.item_type} style={{ padding: 12, borderRadius: 8, background: isToday ? "#eff6ff" : "var(--page)", border: isToday ? "1px solid #60a5fa" : "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <strong style={{ flex: "1 1 160px", minWidth: 0, wordBreak: "break-word" }}>{m.title}</strong>
                      <span className="badge" style={{ whiteSpace: "nowrap", flexShrink: 0, background: isToday ? "#2563eb" : undefined, color: isToday ? "#fff" : undefined }}>
                        {String(m.day).padStart(2, "0")}/{String(m.month).padStart(2, "0")} {milestoneLabel ? `(${milestoneLabel})` : ""} {isToday && "🏛️ HOJE!"}
                      </span>
                    </div>
                    <p className="subtle" style={{ margin: "4px 0 0 0", fontSize: 12 }}>
                      {m.description} {m.year ? `(${milestoneLabel ? `${milestoneLabel} - ` : ""}Ano: ${m.year})` : ""}
                    </p>
                  </div>
                );
              })}
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
            {ephemerides.map((e: EphemerisItem) => {
              const isToday = e.day === currentDay && e.month === currentMonth;
              const ephemYears = e.year ? currentYear - e.year : null;
              return (
                <div key={e.item_id} style={{ padding: 16, borderRadius: 8, background: isToday ? "#fffbeb" : e.is_global ? "#f0f9ff" : "var(--page)", border: isToday ? "1px solid #f59e0b" : e.is_global ? "1px solid #7dd3fc" : "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                    <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                      <strong style={{ fontSize: 15, wordBreak: "break-word" }}>{e.title}</strong>
                      {e.is_global && <span className="badge" style={{ marginLeft: 8, background: "#0284c7", color: "#fff" }}>SaaS Geral</span>}
                    </div>
                    <span className="badge" style={{ whiteSpace: "nowrap", flexShrink: 0, background: isToday ? "#d97706" : undefined, color: isToday ? "#fff" : undefined }}>
                      {String(e.day).padStart(2, "0")}/{String(e.month).padStart(2, "0")} {ephemYears !== null ? `(${ephemYears} anos)` : ""} {isToday && "🌟 HOJE!"}
                    </span>
                  </div>
                  {e.description && <p className="subtle" style={{ fontSize: 13, margin: 0 }}>{e.description}</p>}

                  {isAdmin && !e.is_global && (
                    <EphemerisActions storeId={storeId} ephemeris={e} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Formulário de Nova Efeméride Local (Somente Admin/Secretary) */}
      {isAdmin && <CreateEphemerisForm storeId={storeId} />}
    </div>
  );
}
