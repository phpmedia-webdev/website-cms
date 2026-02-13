/**
 * Minimal layout for MFA flow — no admin sidebar, just centered content.
 * MFA challenge and success are standalone pages.
 */
export const dynamic = "force-dynamic";

export default function MfaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      {children}
    </div>
  );
}
