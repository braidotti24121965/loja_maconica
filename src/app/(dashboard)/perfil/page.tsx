import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Meu Perfil</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Atualize suas informações pessoais.</p>
      
      <div className="card">
        <ProfileForm initialName={profile?.full_name || ""} />
      </div>
    </div>
  );
}
