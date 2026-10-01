import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { acceptInviteAction, setupPasswordAction } from "./actions";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Validate the token using service role
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invite } = await supabaseAdmin
    .from("store_invites")
    .select("email, status, stores(name)")
    .eq("token", token)
    .single();

  if (!invite) {
    return (
      <main className="login-page">
        <section className="login-panel" style={{ margin: "auto" }}>
          <div className="login-card" style={{ textAlign: "center" }}>
            <h2>Convite Inválido</h2>
            <p className="subtle">Este convite não existe ou já foi cancelado.</p>
          </div>
        </section>
      </main>
    );
  }

  if (invite.status !== "pending") {
    return (
      <main className="login-page">
        <section className="login-panel" style={{ margin: "auto" }}>
          <div className="login-card" style={{ textAlign: "center" }}>
            <h2>Convite Expirado ou Usado</h2>
            <p className="subtle">Este convite já foi utilizado. Faça login na sua conta.</p>
            <Link href="/login" className="button" style={{ display: "inline-block", marginTop: 16 }}>Fazer Login</Link>
          </div>
        </section>
      </main>
    );
  }

  const storeName = (invite.stores as unknown as { name: string })?.name || "a Loja";

  if (!user) {
    // Check if the user already has an auth account with this email
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = users.some(u => u.email === invite.email);

    if (userExists) {
      return (
        <main className="login-page">
          <section className="login-panel" style={{ margin: "auto" }}>
            <div className="login-card" style={{ textAlign: "center" }}>
              <span className="eyebrow">Você foi convidado!</span>
              <h2>Entrar em {storeName}</h2>
              <p className="subtle" style={{ marginBottom: 24 }}>Sua conta ({invite.email}) já existe. Faça login para aceitar o convite.</p>
              <Link href={`/login?redirect=/invite/${token}`} className="button" style={{ display: "block" }}>Fazer Login</Link>
            </div>
          </section>
        </main>
      );
    }

    // New user flow -> setup password
    return (
      <main className="login-page">
        <section className="login-panel" style={{ margin: "auto" }}>
          <div className="login-card" style={{ textAlign: "center" }}>
            <span className="eyebrow">Bem-vindo(a)!</span>
            <h2>Primeiro Acesso</h2>
            <p className="subtle" style={{ marginBottom: 24 }}>Você foi convidado para a <strong>{storeName}</strong>. Defina uma senha para sua conta <strong>{invite.email}</strong>.</p>
            
            <form action={setupPasswordAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="email" value={invite.email} />
              
              <div className="field" style={{ textAlign: "left" }}>
                <label>Nova Senha</label>
                <input type="password" name="password" required minLength={6} className="input" placeholder="Mínimo 6 caracteres" />
              </div>
              
              <button type="submit" className="button" style={{ width: "100%" }}>Criar Conta e Aceitar Convite</button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  // If logged in, ensure it's the same email (optional but good practice, the RPC already enforces it)
  if (user.email !== invite.email) {
    return (
      <main className="login-page">
        <section className="login-panel" style={{ margin: "auto" }}>
          <div className="login-card" style={{ textAlign: "center" }}>
            <h2>E-mail Divergente</h2>
            <p className="subtle" style={{ marginBottom: 24 }}>Este convite é para <strong>{invite.email}</strong>, mas você está logado como <strong>{user.email}</strong>.</p>
            <form action="/auth/signout" method="post">
              <button type="submit" className="button" style={{ background: "transparent", color: "inherit", border: "1px solid var(--border)" }}>Sair da Conta Atual</button>
            </form>
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
          <p className="subtle" style={{ marginBottom: 24 }}>Deseja ingressar em <strong>{storeName}</strong>?</p>
          
          <form action={acceptInviteAction} style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <input type="hidden" name="token" value={token} />
            <Link href="/" className="button" style={{ background: "transparent", color: "inherit", border: "1px solid var(--border)" }}>Recusar</Link>
            <button type="submit" className="button">Aceitar Convite</button>
          </form>
        </div>
      </section>
    </main>
  );
}
