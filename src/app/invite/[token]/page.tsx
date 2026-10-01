import { createClient } from "@/lib/supabase/server";
import { setupPasswordAction } from "./actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  // We can safely read store_invites using the RPC validation or by trying to accept it
  // But wait, to show the store name we need to get it.
  // Actually, let's just show a generic "Accept Invite" button. If it's valid, it works.
  // The user requested NOT to use service role key in the client invite page, so we cannot safely query the invite details before accepting unless we create a SECURITY DEFINER function.
  // Wait, we DO have a security definer function? Let's check `accept_invite`.

  return (
    <main className="login-page">
      <section className="login-panel" style={{ margin: "auto" }}>
        <div className="login-card" style={{ textAlign: "center" }}>
          <span className="eyebrow">Quase lá!</span>
          <h2>Definir Senha e Aceitar Convite</h2>
          <p className="subtle" style={{ marginBottom: 24 }}>Você entrou como <strong>{user.email}</strong>. Crie uma senha para acessar sua conta no futuro e aceitar o convite da Loja.</p>
          
          <form action={setupPasswordAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input type="hidden" name="token" value={token} />
            
            <div className="field" style={{ textAlign: "left" }}>
              <label>Defina uma Senha Segura</label>
              <input type="password" name="password" required minLength={6} className="input" placeholder="Mínimo 6 caracteres" />
            </div>
            
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
              <Link href="/" className="button" style={{ background: "transparent", color: "inherit", border: "1px solid var(--border)", flex: 1 }}>Cancelar</Link>
              <button type="submit" className="button" style={{ flex: 1 }}>Concluir</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
