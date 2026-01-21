// Root page - redirect to public homepage
import { redirect } from "next/navigation";

export default function Home() {
  // The public homepage is in (public)/page.tsx
  // For now, we'll show a simple welcome page
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome</h1>
        <p className="text-lg text-muted-foreground">
          This is the public homepage. Content will be added here.
        </p>
        <div className="pt-4">
          <a 
            href="/admin/login" 
            className="text-primary hover:underline"
          >
            Admin Login
          </a>
        </div>
      </div>
    </div>
  );
}
