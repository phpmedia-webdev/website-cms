/**
 * Quick Support — Consolto expert chat embed.
 */
const CONSOLTO_EMBED_URL = "https://client.consolto.com/expert/ray.marsh";

export default function QuickSupportPage() {
  return (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-2xl font-semibold mb-2">Quick Support</h1>
      <p className="text-muted-foreground text-sm mb-4">
        Connect with support via the chat below.
      </p>
      <iframe
        src={CONSOLTO_EMBED_URL}
        title="Consolto Quick Support"
        className="w-full flex-1 min-h-[600px] rounded-md border bg-muted/30"
        allow="microphone; camera"
        allowFullScreen
      />
    </div>
  );
}
