import Link from "next/link";
import Script from "next/script";
import { getIntegrations } from "@/lib/supabase/integrations";
import { PublicPageTracker } from "@/components/public/PublicPageTracker";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Load integration settings for script injection
  let integrations: Awaited<ReturnType<typeof getIntegrations>> = [];
  try {
    integrations = await getIntegrations();
  } catch (error) {
    // Silently fail if integrations fail to load - don't break the app
  }

  // Get active integrations
  const googleAnalytics = integrations.find((i) => i.name === "google_analytics");
  const visitorTracking = integrations.find((i) => i.name === "visitor_tracking");
  const simpleCommenter = integrations.find((i) => i.name === "simple_commenter");

  const gaActive = googleAnalytics?.enabled && googleAnalytics?.config?.measurement_id;
  const vtActive = visitorTracking?.enabled && visitorTracking?.config?.websiteId;
  const scActive = simpleCommenter?.enabled && simpleCommenter?.config?.domain;

  return (
    <>
      {/* Third-party integration scripts - only load on public pages */}
      {gaActive && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalytics.config.measurement_id}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalytics.config.measurement_id}');
            `}
          </Script>
        </>
      )}

      {vtActive && (
        <>
          <Script
            src="https://app.visitortracking.com/assets/js/tracer.js"
            strategy="afterInteractive"
            async
            defer
          />
          <Script id="visitor-tracking-init" strategy="afterInteractive">
            {`
              function init_tracer() { 
                var tracer = new Tracer({  
                  websiteId : "${visitorTracking.config.websiteId}",  
                  async : true, 
                  debug : false 
                }); 
              }
              // Initialize when script loads
              if (typeof Tracer !== 'undefined') {
                init_tracer();
              } else {
                window.addEventListener('load', init_tracer);
              }
            `}
          </Script>
        </>
      )}

      {/* SimpleCommenter: dev/staging client feedback tool (pinpoint annotations). Disable in production. Not blog comments. */}
      {scActive && (
        <Script
          src={`https://simplecommenter.com/js/comments.min.js?domain=${simpleCommenter.config.domain}`}
          strategy="lazyOnload"
          defer
        />
      )}

      <PublicPageTracker />
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
    </>
  );
}
