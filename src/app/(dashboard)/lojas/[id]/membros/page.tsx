import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCircle } from "lucide-react";
import { MemberList } from "./member-list";

export default async function MembrosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verificar permissão
  const { data: myMembership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!myMembership) redirect("/lojas");
  const isAdmin = ["admin", "secretary"].includes(myMembership.role);

  // Buscar todos os membros (acessos) e juntar com profiles
  const { data: memberships } = await supabase
    .from("store_memberships")
    .select(`
      id,
      role,
      user_id,
      profiles:user_id ( full_name, email )
    `)
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  // Buscar o quadro de obreiros
  const { data: brothers } = await supabase
    .from("brothers")
    .select("*")
    .eq("store_id", storeId)
    .order("full_name", { ascending: true });

  return (
    <div style={{ maxWidth: 800 }}>
      <Link href={`/lojas/${storeId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para o Painel da Loja
      </Link>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Quadro de Obreiros</h1>
          <p className="subtle">Ficha cadastral de todos os irmãos da loja.</p>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 12 }}>
            <Link href={`/lojas/${storeId}/convidar`} className="button" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "var(--brand)", border: "1px solid var(--brand)", padding: "8px 16px" }}>
              + Gerar Link de Acesso
            </Link>
            <Link href={`/lojas/${storeId}/membros/novo`} className="button" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 16px" }}>
              + Novo Membro
            </Link>
          </div>
        )}
      </div>

      <h3 style={{ marginBottom: 16 }}>Fichas Cadastrais</h3>
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 32 }}>
        {brothers && brothers.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {brothers.map((b: any, index: number) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: index < brothers.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <UserCircle size={40} color="var(--subtle)" />
                  <div>
                    <h4 style={{ margin: 0 }}>{b.full_name}</h4>
                    {b.cim && <span className="subtle" style={{ fontSize: 13 }}>CIM: {b.cim}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="badge">{b.degree}</span>
                    {b.office && <span className="badge" style={{ background: "var(--brand-soft)", color: "var(--brand-dark)" }}>{b.office}</span>}
                  </div>
                  {isAdmin && (
                    <Link href={`/lojas/${storeId}/membros/${b.id}`} style={{ fontSize: 13, textDecoration: "underline", color: "var(--subtle)" }}>
                      Editar
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: "center" }}>Nenhum irmão cadastrado.</div>
        )}
      </div>

      <h3 style={{ marginBottom: 16 }}>Acessos ao Sistema</h3>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {memberships && memberships.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {memberships.map((m: any, index: number) => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: index < memberships.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <UserCircle size={40} color="var(--subtle)" />
                  <div>
                    <h4 style={{ margin: 0 }}>{(m.profiles as any)?.full_name || "Membro"}</h4>
                    <span className="subtle" style={{ fontSize: 13 }}>{(m.profiles as any)?.email}</span>
                  </div>
                </div>
                
                <MemberList member={m} isAdmin={isAdmin} storeId={storeId} currentUserId={user.id} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: "center" }}>Nenhum acesso encontrado.</div>
        )}
      </div>
    </div>
  );
}
