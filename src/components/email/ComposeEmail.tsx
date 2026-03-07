"use client";

import { useState, useCallback, useRef, cloneElement, isValidElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip, X } from "lucide-react";

const DEFAULT_MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_ATTACHMENTS = 5;

export interface ComposeEmailAttachment {
  filename: string;
  content: string; // base64
}

export interface ComposeEmailPayload {
  subject: string;
  body: string;
  attachments?: ComposeEmailAttachment[];
}

export interface ComposeEmailProps {
  /** Recipient(s) - shown in To field. */
  to: string | string[];
  /** Optional label for To (e.g. display name). */
  toLabel?: string | null;
  /** Default subject when opening. */
  defaultSubject?: string;
  /** Default body when opening. */
  defaultBody?: string;
  /** Called when user sends. Parent should call API then call onSent on success. */
  onSubmit: (payload: ComposeEmailPayload) => Promise<void>;
  /** Optional callback after successful send (e.g. refresh data). */
  onSent?: () => void;
  /** Trigger element (e.g. Button). Opens the compose modal on click. */
  children: React.ReactNode;
  /** Allow file attachments. Default true. */
  allowAttachments?: boolean;
  /** Max size per file in bytes. Default 5MB. */
  maxAttachmentSize?: number;
  /** Max number of attachments. Default 5. */
  maxAttachments?: number;
  /** Disable the trigger (e.g. when contact has no email). */
  disabled?: boolean;
  /** Dialog title. */
  title?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ComposeEmail({
  to,
  toLabel,
  defaultSubject = "",
  defaultBody = "",
  onSubmit,
  onSent,
  children,
  allowAttachments = true,
  maxAttachmentSize = DEFAULT_MAX_ATTACHMENT_SIZE,
  maxAttachments = DEFAULT_MAX_ATTACHMENTS,
  disabled = false,
  title = "Compose email",
}: ComposeEmailProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toDisplay = Array.isArray(to) ? to.join(", ") : to;
  const canSend = toDisplay.trim().length > 0;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setError(null);
      if (next) {
        setSubject(defaultSubject);
        setBody(defaultBody);
        setFiles([]);
        setError(null);
      }
      setOpen(next);
    },
    [defaultSubject, defaultBody]
  );

  const handleAddFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      e.target.value = "";
      setFiles((prev) => {
        const combined = [...prev];
        for (const file of selected) {
          if (combined.length >= maxAttachments) break;
          if (file.size > maxAttachmentSize) continue;
          combined.push(file);
        }
        return combined.slice(0, maxAttachments);
      });
    },
    [maxAttachments, maxAttachmentSize]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const attachments: ComposeEmailAttachment[] = allowAttachments
        ? await Promise.all(
            files.map(async (f) => ({
              filename: f.name,
              content: await fileToBase64(f),
            }))
          )
        : [];
      await onSubmit({
        subject: subject.trim(),
        body: body.trim(),
        ...(attachments.length ? { attachments } : {}),
      });
      handleOpenChange(false);
      onSent?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }, [canSend, subject, body, files, allowAttachments, onSubmit, onSent, handleOpenChange]);

  const trigger =
    isValidElement(children) && !disabled
      ? cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void; disabled?: boolean }>, {
          onClick: (e: React.MouseEvent) => {
            (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props?.onClick?.(e);
            handleOpenChange(true);
          },
        })
      : isValidElement(children)
        ? cloneElement(children as React.ReactElement<{ disabled?: boolean }>, { disabled })
        : children;

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              To: {toDisplay}
              {toLabel && (
                <span className="text-muted-foreground"> ({toLabel})</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="compose-subject">Subject</Label>
              <Input
                id="compose-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compose-body">Message</Label>
              <textarea
                id="compose-body"
                className="flex min-h-[180px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your message..."
              />
            </div>

            {allowAttachments && (
              <div className="space-y-2">
                <Label>Attachments</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAddFiles}
                  accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={files.length >= maxAttachments}
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                    Add file
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Max {maxAttachments} files, {(maxAttachmentSize / 1024 / 1024).toFixed(0)}MB each
                  </span>
                </div>
                {files.length > 0 && (
                  <ul className="space-y-1">
                    {files.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between rounded border bg-muted/30 px-2 py-1.5 text-sm"
                      >
                        <span className="truncate">{f.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => removeFile(i)}
                          aria-label={`Remove ${f.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={sending || !canSend}>
              {sending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
