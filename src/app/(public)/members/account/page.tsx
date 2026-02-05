/**
 * Member account settings — placeholder for password change, etc.
 * Middleware ensures only auth + type member (or admin) can reach this.
 */
export default function MembersAccountPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Account settings</h1>
      <p className="text-muted-foreground">
        Password change and other account options will be added in a following session.
      </p>
    </main>
  );
}
