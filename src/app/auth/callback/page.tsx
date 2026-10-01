import { AuthCallbackClient } from "./auth-callback-client";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: requestedNext } = await searchParams;
  const next = requestedNext?.startsWith("/invite/")
    ? requestedNext
    : "/";

  return <AuthCallbackClient next={next} />;
}
