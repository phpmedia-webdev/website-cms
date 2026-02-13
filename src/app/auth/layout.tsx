/**
 * Auth segment layout. Forces dynamic so /auth/callback and other auth routes
 * are not statically generated at build time (avoids timeouts and cookie errors).
 */
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
