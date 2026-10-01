import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CodeCheckinClient from "./code-client";

export default async function SecureCodeCheckinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkin`); // Send to root checkin to retype code after login

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
      <CodeCheckinClient code={code} />
    </div>
  );
}
