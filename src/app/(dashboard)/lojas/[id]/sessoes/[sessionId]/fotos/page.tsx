import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SessionGalleryUploader } from "./session-gallery-uploader";
import { SessionPhotoItem } from "./session-photo-item";

export default async function SessionPhotosPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id: storeId, sessionId } = await params;
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

  // Busca detalhes da sessão
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!session) redirect(`/lojas/${storeId}/sessoes`);

  // Busca fotos salvas da sessão
  const { data: photos } = await supabase
    .from("session_photos")
    .select("id, storage_path, created_at")
    .eq("session_id", sessionId)
    .eq("store_id", storeId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  const rawPhotos = photos || [];

  // Gera URLs assinadas para acesso às imagens no Supabase Storage
  let photosWithUrls: { id: string; storage_path: string; url: string }[] = [];
  if (rawPhotos.length > 0) {
    const paths = rawPhotos.map((p) => p.storage_path);
    const { data: signedData } = await supabase.storage
      .from("store_media")
      .createSignedUrls(paths, 3600);

    const signedMap = new Map<string, string>();
    signedData?.forEach((item) => {
      if (item.path && item.signedUrl) {
        signedMap.set(item.path, item.signedUrl);
      }
    });

    photosWithUrls = rawPhotos
      .map((p) => ({
        id: p.id,
        storage_path: p.storage_path,
        url: signedMap.get(p.storage_path) || "",
      }))
      .filter((p) => Boolean(p.url));
  }

  const sessionDateFormatted = format(new Date(`${session.date}T12:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Link
        href={`/lojas/${storeId}/sessoes`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 24,
          fontSize: 14,
          color: "var(--subtle)",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={16} /> Voltar para Sessões
      </Link>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <Camera color="var(--brand)" size={28} /> Galeria da Sessão: {session.session_type}
        </h1>
        <p className="subtle" style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
          <Calendar size={14} /> Realizada em {sessionDateFormatted}
        </p>
      </div>

      {/* Uploader com compactação automática */}
      {isAdmin && <SessionGalleryUploader storeId={storeId} sessionId={sessionId} />}

      {/* Grid de Fotos */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Fotos Registradas ({photosWithUrls.length})</h3>

        {photosWithUrls.length === 0 ? (
          <p className="subtle" style={{ fontSize: 14, margin: 0, textAlign: "center", padding: "24px 0" }}>
            Nenhuma foto foi adicionada a esta sessão ainda.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {photosWithUrls.map((photo) => (
              <SessionPhotoItem
                key={photo.id}
                photo={photo}
                storeId={storeId}
                sessionId={sessionId}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
