import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Edit, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GalleryUploader } from "./gallery-uploader";
import { PhotoItem } from "./photo-item";

export default async function EventoDetalhesPage({ params }: { params: Promise<{ id: string, eventId: string }> }) {
  const { id: storeId, eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/lojas");
  const isAdmin = ["admin", "secretary"].includes(membership.role);

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();

  if (!event) redirect(`/lojas/${storeId}/eventos`);

  // Fetch photos
  const { data: photos } = await supabase
    .from("event_photos")
    .select("*")
    .eq("event_id", eventId)
    .eq("store_id", storeId)
    .order("order_index", { ascending: true });

  // Generate signed URLs (1 hour)
  const orderedPhotos = photos || [];
  const { data: signedUrls } = orderedPhotos.length
    ? await supabase.storage.from("store_media").createSignedUrls(orderedPhotos.map((photo) => photo.storage_path), 3600)
    : { data: [] };
  const photosWithUrls = orderedPhotos.map((photo, index) => ({
    ...photo,
    url: signedUrls?.[index]?.signedUrl || "",
  }));

  return (
    <div>
      <Link href={`/lojas/${storeId}/eventos`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Eventos
      </Link>
      
      <div className="card" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>{event.title}</h1>
          {isAdmin && (
            <Link href={`/lojas/${storeId}/eventos/${event.id}/editar`} className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", color: "inherit", border: "1px solid var(--border)" }}>
              <Edit size={16} /> Editar
            </Link>
          )}
        </div>

        <div style={{ display: "flex", gap: 24, color: "var(--subtle)", fontSize: 14, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={16} />
            {format(new Date(`${event.event_date}T12:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          {event.event_time && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={16} />
              {event.event_time.slice(0, 5)}
            </div>
          )}
          {event.location && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={16} />
              {event.location}
            </div>
          )}
          <span className="badge" style={{ 
            background: event.status === 'published' ? 'var(--green-soft)' : 'rgba(0,0,0,0.1)',
            color: event.status === 'published' ? 'var(--green-dark)' : 'inherit'
          }}>
            {event.status === 'published' ? 'Publicado' : event.status === 'draft' ? 'Rascunho' : 'Cancelado'}
          </span>
        </div>

        {event.description && (
          <p style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
            {event.description}
          </p>
        )}
      </div>

      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Galeria de Fotos</h2>
      
      {isAdmin && <GalleryUploader storeId={storeId} eventId={event.id} />}

      {photosWithUrls.length === 0 ? (
        <p className="subtle">Nenhuma foto adicionada ainda.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {photosWithUrls.map((p) => (
            <PhotoItem 
              key={p.id} 
              storeId={storeId} 
              eventId={event.id} 
              photoId={p.id} 
              url={p.url} 
              isAdmin={isAdmin}
              isCover={p.is_cover}
            />
          ))}
        </div>
      )}
    </div>
  );
}
