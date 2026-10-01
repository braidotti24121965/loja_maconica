import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next");
  const next = requestedNext?.startsWith("/invite/")
    ? requestedNext
    : "/";

  const destination = request.nextUrl.clone();
  destination.pathname = next;
  destination.search = "";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(destination);
  }

  destination.pathname = "/login";
  destination.searchParams.set("erro", "link-invalido");
  return NextResponse.redirect(destination);
}
