import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditBrotherForm } from "./edit-form";

export default async function EditarMembroPage({ params }: { params: Promise<{ id: string, brotherId: string }> }) {
  const { id: storeId, brotherId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: myMembership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!myMembership || !["admin", "secretary"].includes(myMembership.role)) {
    redirect(`/lojas/${storeId}/membros`);
  }

  const { data: brother } = await supabase
    .from("brothers")
    .select("*, dependents(*)")
    .eq("id", brotherId)
    .single();

  if (!brother) redirect(`/lojas/${storeId}/membros`);

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href={`/lojas/${storeId}/membros`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Membros
      </Link>
      
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Editar Ficha</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Atualize os dados cadastrais e o cargo do irmão.</p>
      
      <div className="card">
        <EditBrotherForm storeId={storeId} brother={brother} />
      </div>
    </div>
  );
}
