import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Upload, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UploadAtaForm } from "./upload-form";

export default async function AtaPage({ params }: { params: Promise<{ id: string, sessionId: string }> }) {
  const { id: storeId, sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check role
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/lojas");
  const isAdmin = ["admin", "secretary"].includes(membership.role);

  // Fetch session
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) redirect(`/lojas/${storeId}/sessoes`);

  // Fetch document (if exists)
  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  // Get public URL if document exists (since bucket is private, we need a signed URL, wait, actually we can just use createSignedUrl)
  let fileUrl = null;
  if (document) {
    const { data: signedUrl } = await supabase.storage
      .from("store_documents")
      .createSignedUrl(document.file_path, 60 * 60); // 1 hour
    fileUrl = signedUrl?.signedUrl;
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href={`/lojas/${storeId}/sessoes`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Sessões
      </Link>
      
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Ata da Sessão</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>
        {session.session_type} • {format(new Date(session.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </p>

      <div className="card">
        {document && fileUrl ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <div style={{ background: "var(--green-soft)", display: "inline-block", padding: 16, borderRadius: "50%", marginBottom: 16 }}>
              <FileText size={32} color="var(--green-dark)" />
            </div>
            <h3 style={{ marginBottom: 8 }}>{document.title}</h3>
            <p className="subtle" style={{ marginBottom: 24, fontSize: 14 }}>Anexada em {format(new Date(document.created_at), "dd/MM/yyyy")}</p>
            
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Download size={16} /> Baixar Ata PDF
            </a>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 24, textAlign: "center" }}>
              <div style={{ background: "rgba(0,0,0,0.05)", display: "inline-block", padding: 16, borderRadius: "50%", marginBottom: 16 }}>
                <Upload size={32} color="var(--subtle)" />
              </div>
              <h3>Nenhuma Ata Anexada</h3>
              <p className="subtle" style={{ fontSize: 14 }}>Esta sessão ainda não possui documento de ata oficial.</p>
            </div>
            
            {isAdmin && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24 }}>
                <UploadAtaForm storeId={storeId} sessionId={sessionId} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// Note: forgot to import FileText. I'll add it in the next call if it breaks.
