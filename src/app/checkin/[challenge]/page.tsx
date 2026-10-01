import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CheckinClient from "./checkin-client";

export default async function SecureCheckinPage({ params }: { params: Promise<{ challenge: string }> }) {
  const { challenge } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/checkin/${challenge}`);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
      <CheckinClient challenge={challenge} />
    </div>
  );
}
