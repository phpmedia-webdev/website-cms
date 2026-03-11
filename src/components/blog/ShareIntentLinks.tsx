"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ShareIntentLinksProps {
  /** Canonical URL of the page/post to share. */
  url: string;
  /** Title for the shared item (e.g. post title). */
  title: string;
  /** Optional short description (used in some platforms). */
  description?: string;
  /** Optional image URL (e.g. OG image; used by Pinterest, some others). */
  imageUrl?: string;
  /** Optional label above the links (default: "Share this post"). */
  label?: string;
  /** Optional class for the wrapper. */
  className?: string;
}

function encodeParam(value: string): string {
  return encodeURIComponent(value);
}

/** Max length for Twitter tweet text (URL is shortened by Twitter; leave room for title + optional description). */
const TWITTER_TEXT_MAX = 250;

/**
 * Builds share-intent URLs for major platforms. Opens in new tab; no API keys.
 * Used on blog posts and pages. Each platform has a fixed intent URL;
 * we pass our url/title/description as query params.
 */
export function ShareIntentLinks({
  url,
  title,
  description = "",
  imageUrl,
  label = "Share this post",
  className = "",
}: ShareIntentLinksProps) {
  const encodedUrl = encodeParam(url);
  const descLen = Math.max(0, TWITTER_TEXT_MAX - title.length - 2);
  const twitterText =
    title.length > TWITTER_TEXT_MAX
      ? title.slice(0, TWITTER_TEXT_MAX - 3) + "..."
      : description && descLen > 0
        ? `${title} ${description.slice(0, descLen)}${description.length > descLen ? "…" : ""}`.trim()
        : title;
  const encodedTwitterText = encodeParam(twitterText);

  const links: { href: string; label: string }[] = [
    {
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTwitterText}`,
      label: "X (Twitter)",
    },
    {
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      label: "Facebook",
    },
    {
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      label: "LinkedIn",
    },
    {
      href: `mailto:?subject=${encodeParam(title)}&body=${encodeParam(`${url}${description ? `\n\n${description}` : ""}`)}`,
      label: "Email",
    },
  ];

  if (imageUrl) {
    links.splice(3, 0, {
      href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeParam(imageUrl)}&description=${encodeParam(title)}`,
      label: "Pinterest",
    });
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground shrink-0">
        <Share2 className="h-4 w-4" aria-hidden />
        {label}
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        {links.map(({ href, label: linkLabel }) => (
          <Button
            key={linkLabel}
            variant="outline"
            size="sm"
            className="h-8 text-xs font-normal"
            asChild
          >
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${linkLabel}`}>
              {linkLabel}
            </a>
          </Button>
        ))}
      </span>
    </div>
  );
}
