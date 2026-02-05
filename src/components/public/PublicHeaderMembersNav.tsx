"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const MEMBERS_LINKS = [
  { href: "/members", label: "Dashboard" },
  { href: "/members/profile", label: "Profile" },
  { href: "/members/account", label: "Account" },
] as const;

/**
 * Members Area nav for public header: dropdown with sub-links (Dashboard, Profile, Account).
 * Shown only when user is logged in; layout conditionally renders this.
 */
export function PublicHeaderMembersNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm hover:underline flex items-center gap-0.5"
        aria-expanded={open}
        aria-haspopup="true"
      >
        Members Area
        <span className="ml-0.5 text-muted-foreground" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <ul
          className="absolute top-full left-0 mt-1 min-w-[10rem] rounded-md border bg-background py-1 shadow-md z-50"
          role="menu"
        >
          {MEMBERS_LINKS.map(({ href, label }) => (
            <li key={href} role="none">
              <Link
                href={href}
                role="menuitem"
                className="block px-3 py-2 text-sm hover:bg-muted hover:underline"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
