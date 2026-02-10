import { AnychatAdminEmbed } from "@/components/crm/AnychatAdminEmbed";

/**
 * OmniChat — Original Anychat admin live chat embed (protected under /admin).
 */
export default function OmniChatPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">OmniChat</h1>
      <p className="text-muted-foreground text-sm mb-4">
        The admin chat widget loads below. Use it as on the full Anychat app.
      </p>
      <AnychatAdminEmbed />
    </div>
  );
}
