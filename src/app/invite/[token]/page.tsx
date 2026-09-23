import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { acceptInviteAction } from "./actions";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Validate the token exists and is valid
  // Since we are checking before calling accept_invite, we have to do it as admin service_role, OR we just let the RPC fail if invalid.
  // Actually, without service_role, a non-admin can't read the store_invites table directly to get details before accepting, because RLS blocks it.
  // We can just try to execute the accept_invite RPC if the user is logged in.
  
  if (!user) {
    // Need to login or signup first.
    return (
      <main className="login-page">
        <section className="login-panel" style={{ margin: "auto" }}>
          <div className="login-card" style={{ textAlign: "center" }}>
            <span className="eyebrow">Você foi convidado!</span>
            <h2>Aceitar Convite</h2>
            <p className="subtle" style={{ marginBottom: 24 }}>Para entrar na Loja, você precisa se autenticar primeiro.</p>
            <Link href={`/login?redirect=/invite/${token}`} className="button" style={{ display: "block" }}>Fazer Login ou Cadastro</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-panel" style={{ margin: "auto" }}>
        <div className="login-card" style={{ textAlign: "center" }}>
          <span className="eyebrow">Convite Pendente</span>
          <h2>Você foi convidado</h2>
          <p className="subtle" style={{ marginBottom: 24 }}>Você está autenticado como <strong>{user.email}</strong>. Deseja aceitar este convite e ingressar na Loja?</p>
          
          <form action={acceptInviteAction} style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <input type="hidden" name="token" value={token} />
            <Link href="/" className="button" style={{ background: "transparent", color: "inherit", border: "1px solid var(--border)" }}>Cancelar</Link>
            <button type="submit" className="button">Aceitar Convite</button>
          </form>
        </div>
      </section>
    </main>
  );
}
