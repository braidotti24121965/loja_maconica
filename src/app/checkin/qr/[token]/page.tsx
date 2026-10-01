import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QrCheckinClient from "./qr-client";

export default async function SecureQrCheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkin/qr/${token}`);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
      <QrCheckinClient token={token} />
    </div>
  );
}
