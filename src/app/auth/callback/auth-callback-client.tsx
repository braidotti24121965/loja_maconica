"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthCallbackClient({ next }: { next: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const establishSession = async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const authError = hash.get("error_description");

      if (authError) {
        setError("Este convite expirou, já foi utilizado ou não é mais válido.");
        return;
      }

      if (!accessToken || !refreshToken) {
        setError("Não foi possível validar este convite. Solicite um novo link à administração da Loja.");
        return;
      }

      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError("Não foi possível iniciar sua sessão. Solicite um novo convite.");
        return;
      }

      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      router.replace(next);
      router.refresh();
    };

    void establishSession();
  }, [next, router]);

  return (
    <main className="login-page">
      <section className="login-art">
        <span className="eyebrow" style={{ color: "#9dd8cf" }}>Convite seguro</span>
        <h1>Preparando seu acesso</h1>
        <p>Estamos validando o convite e conectando sua conta à Loja correta.</p>
      </section>
      <section className="login-panel">
        <div className="login-card">
          {error ? (
            <>
              <h2>Não foi possível validar</h2>
              <div className="message error" style={{ marginTop: 16 }}>{error}</div>
              <Link href="/login" className="button" style={{ marginTop: 20 }}>
                Ir para o login
              </Link>
            </>
          ) : (
            <>
              <h2>Validando convite...</h2>
              <p className="subtle">Isso deve levar apenas alguns segundos.</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
