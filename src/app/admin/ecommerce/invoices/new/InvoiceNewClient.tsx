"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 280;

function contactDisplayName(c: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}): string {
  const name = c.full_name?.trim() || [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  const email = c.email?.trim() || "";
  if (name && email) return `${name} (${email})`;
  return email || name || "—";
}

type ContactHit = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
};

interface InvoiceNewClientProps {
  /** When starting from a CRM contact (e.g. Transactions tab "+ New invoice"), pre-fill this contact. */
  initialContact?: ContactHit | null;
}

export function InvoiceNewClient({ initialContact }: InvoiceNewClientProps) {
  const router = useRouter();

  const [contact_id, setContact_id] = useState<string | null>(initialContact?.id ?? null);
  const [selectedContactData, setSelectedContactData] = useState<ContactHit | null>(initialContact ?? null);
  const [customer_email, setCustomer_email] = useState(initialContact?.email?.trim() ?? "");
  const [due_date, setDue_date] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ContactHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    fetch(`/api/crm/contacts/search?q=${encodeURIComponent(q.trim())}&limit=20`)
      .then((res) => (res.ok ? res.json() : { contacts: [] }))
      .then((data) => {
        setSearchResults(data.contacts ?? []);
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(() => {
      fetchSearch(searchQuery);
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, fetchSearch]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const handleSelect = (c: ContactHit) => {
    setContact_id(c.id);
    setSelectedContactData(c);
    setCustomer_email(c.email?.trim() ?? "");
    setSearchQuery("");
    setSearchResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    setContact_id(null);
    setSelectedContactData(null);
    setCustomer_email("");
    setSearchQuery("");
    setSearchResults([]);
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const email =
      customer_email.trim() ||
      (selectedContactData?.email?.trim() ?? "") ||
      (searchQuery.includes("@") ? searchQuery.trim() : "");
    if (!email) {
      setError("Select a customer or enter an email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ecommerce/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_email: email,
          contact_id: contact_id || null,
          due_date: due_date.trim() || null,
          currency: "USD",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create invoice");
      }
      if (data.invoice?.id) {
        router.push(`/admin/ecommerce/invoices/${data.invoice.id}`);
      } else {
        setError("Invalid response from server.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const showDropdown = open && (searchQuery.trim() !== "" || searchResults.length > 0);
  const selectedContact = selectedContactData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create draft invoice</CardTitle>
        <CardDescription>
          Search for a customer by name or email, or enter an email manually. Then add line items on the next screen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div ref={containerRef} className="space-y-2">
            <Label htmlFor="customer_picker">Customer *</Label>
            <div className="relative">
              <Input
                id="customer_picker"
                type="text"
                autoComplete="off"
                placeholder={selectedContact ? "" : "Search by name or email..."}
                value={selectedContact ? "" : searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!open) setOpen(true);
                  if (contact_id) {
                    setContact_id(null);
                    setSelectedContactData(null);
                    setCustomer_email("");
                  }
                }}
                onFocus={() => searchQuery.trim() && setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    if (contact_id) setSearchQuery("");
                  }
                }}
                className={cn(selectedContact && "pr-9")}
              />
              {selectedContact && (
                <>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground truncate pointer-events-none max-w-[calc(100%-2.5rem)]">
                    {contactDisplayName(selectedContact)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-2"
                    onClick={handleClear}
                    aria-label="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
              {showDropdown && (
                <ul
                  className="absolute z-50 mt-1 w-full rounded-md border bg-popover py-1 text-popover-foreground shadow-md max-h-56 overflow-auto"
                  role="listbox"
                >
                  {searchLoading ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
                  ) : searchResults.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">
                      No contacts found. You can enter an email below and create the invoice.
                    </li>
                  ) : (
                    searchResults.map((c: ContactHit) => (
                      <li
                        key={c.id}
                        role="option"
                        tabIndex={0}
                        className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(c);
                        }}
                      >
                        <span className="font-medium">{contactDisplayName(c)}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            {selectedContact && (
              <p className="text-xs text-muted-foreground">
                Invoice will be sent to {customer_email || selectedContact.email || "—"}. Clear to pick another or type a new email.
              </p>
            )}
          </div>
          {!selectedContact && (
            <div className="space-y-2">
              <Label htmlFor="customer_email">Or enter email manually</Label>
              <Input
                id="customer_email"
                type="email"
                placeholder="customer@example.com"
                value={customer_email}
                onChange={(e) => setCustomer_email(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="due_date">Due date (optional)</Label>
            <Input
              id="due_date"
              type="date"
              value={due_date}
              onChange={(e) => setDue_date(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create and add line items"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/ecommerce/invoices")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
