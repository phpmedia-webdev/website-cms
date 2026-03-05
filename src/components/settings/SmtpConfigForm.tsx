"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

const SMTP_API = "/api/settings/notifications/smtp";
const SMTP_TEST_API = "/api/settings/notifications/smtp/test";

export type SmtpFormState = {
  host: string;
  port: number;
  user: string;
  from_email: string;
  from_name: string;
  secure: boolean;
  password_set: boolean;
  notification_recipients: string;
};

interface SmtpConfigFormProps {
  /** Optional prefix for input ids to avoid collisions when multiple forms on page. */
  idPrefix?: string;
  /** Button label. */
  saveLabel?: string;
}

/**
 * Reusable SMTP configuration form. Same block for Admin (Notifications page) and Superadmin (Site Settings → General).
 * Writes to current tenant settings via /api/settings/notifications/smtp.
 */
export function SmtpConfigForm({
  idPrefix = "smtp",
  saveLabel = "Save SMTP settings",
}: SmtpConfigFormProps) {
  const [smtp, setSmtp] = useState<SmtpFormState | null>(null);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(SMTP_API);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load SMTP config");
      }
      const data = await res.json();
      setSmtp({
        host: data.host ?? "",
        port: data.port ?? 587,
        user: data.user ?? "",
        from_email: data.from_email ?? "",
        from_name: data.from_name ?? "",
        secure: data.secure ?? false,
        password_set: !!data.password_set,
        notification_recipients: data.notification_recipients ?? "",
      });
      setSmtpPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setSmtp(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    if (!smtp) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        host: smtp.host.trim(),
        port: smtp.port,
        user: smtp.user.trim(),
        from_email: smtp.from_email.trim(),
        from_name: smtp.from_name.trim() || undefined,
        secure: smtp.secure,
        notification_recipients: smtp.notification_recipients.trim(),
      };
      if (smtpPassword.trim() !== "") {
        body.password = smtpPassword.trim();
      }
      const res = await fetch(SMTP_API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      const data = await res.json();
      setSmtp({
        host: data.host ?? "",
        port: data.port ?? 587,
        user: data.user ?? "",
        from_email: data.from_email ?? "",
        from_name: data.from_name ?? "",
        secure: data.secure ?? false,
        password_set: !!data.password_set,
        notification_recipients: data.notification_recipients ?? "",
      });
      setSmtpPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [smtp, smtpPassword]);

  const sendTest = useCallback(async () => {
    if (!smtp) return;
    const emails = smtp.notification_recipients
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      setTestMessage({ type: "error", text: "Enter at least one recipient (comma-separated)." });
      return;
    }
    setTesting(true);
    setTestMessage(null);
    try {
      const res = await fetch(SMTP_TEST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: emails }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestMessage({ type: "error", text: data.error ?? "Failed to send test email." });
        return;
      }
      setTestMessage({ type: "success", text: "Test email sent." });
    } catch (e) {
      setTestMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to send test email.",
      });
    } finally {
      setTesting(false);
    }
  }, [smtp]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </p>
    );
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!smtp) return null;

  const p = (name: string) => (idPrefix ? `${idPrefix}-${name}` : name);

  return (
    <div className="space-y-4 max-w-xl">
      <div className="grid gap-2">
        <Label htmlFor={p("host")}>Host</Label>
        <Input
          id={p("host")}
          value={smtp.host}
          onChange={(e) => setSmtp((prev) => (prev ? { ...prev, host: e.target.value } : prev))}
          placeholder="smtp.example.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={p("port")}>Port</Label>
        <Input
          id={p("port")}
          type="number"
          min={1}
          max={65535}
          value={smtp.port}
          onChange={(e) =>
            setSmtp((prev) => (prev ? { ...prev, port: parseInt(e.target.value, 10) || 587 } : prev))
          }
        />
        <p className="text-xs text-muted-foreground">
          Common: 587 (STARTTLS), 465 (TLS). Use 465 with &quot;Use TLS / secure connection&quot; on.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={p("user")}>Username</Label>
        <Input
          id={p("user")}
          value={smtp.user}
          onChange={(e) => setSmtp((prev) => (prev ? { ...prev, user: e.target.value } : prev))}
          placeholder="SMTP username"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={p("password")}>Password</Label>
        <Input
          id={p("password")}
          type="password"
          value={smtpPassword}
          onChange={(e) => setSmtpPassword(e.target.value)}
          placeholder={
            smtp.password_set ? "•••••• Leave blank to keep current" : "SMTP password"
          }
          autoComplete="new-password"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={p("from-email")}>From email</Label>
        <Input
          id={p("from-email")}
          type="email"
          value={smtp.from_email}
          onChange={(e) =>
            setSmtp((prev) => (prev ? { ...prev, from_email: e.target.value } : prev))
          }
          placeholder="noreply@example.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={p("from-name")}>From name (optional)</Label>
        <Input
          id={p("from-name")}
          value={smtp.from_name}
          onChange={(e) =>
            setSmtp((prev) => (prev ? { ...prev, from_name: e.target.value } : prev))
          }
          placeholder="Site Name"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={p("secure")}
          checked={smtp.secure}
          onCheckedChange={(checked) =>
            setSmtp((prev) => (prev ? { ...prev, secure: checked } : prev))
          }
        />
        <Label htmlFor={p("secure")} className="text-sm font-normal">
          Use TLS / secure connection
        </Label>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={p("notification-recipients")}>
          Notification recipients (comma-separated emails)
        </Label>
        <Input
          id={p("notification-recipients")}
          type="text"
          value={smtp.notification_recipients}
          onChange={(e) =>
            setSmtp((prev) =>
              prev ? { ...prev, notification_recipients: e.target.value } : prev
            )
          }
          placeholder="admin@example.com, team@example.com"
        />
        <p className="text-xs text-muted-foreground">
          These addresses receive notification emails (e.g. new form submission). Used for test email.
        </p>
      </div>
      {testMessage && (
        <p
          className={
            testMessage.type === "success"
              ? "text-sm text-green-600 dark:text-green-400"
              : "text-sm text-destructive"
          }
        >
          {testMessage.text}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Saving…
          </>
        ) : (
          saveLabel
        )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={sendTest}
          disabled={testing || saving}
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending…
            </>
          ) : (
            "Send test email"
          )}
        </Button>
      </div>
    </div>
  );
}
