import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            My Website
          </Link>
          <nav className="flex gap-4">
            <Link href="/blog" className="text-sm hover:underline">
              Blog
            </Link>
            <Link href="/admin" className="text-xs text-muted-foreground opacity-50 hover:opacity-100">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} My Website. All rights reserved.</p>
          <Link href="/admin" className="text-xs opacity-50 hover:opacity-100 mt-2 inline-block">
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
