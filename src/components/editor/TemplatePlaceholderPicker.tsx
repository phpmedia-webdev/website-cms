"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Braces } from "lucide-react";

/** Placeholders available for email/template body. Key is the token inserted as {{key}}. Resolved at send time from order/contact (customer_*) or tenant/site settings (business_*, site_name). */
export const TEMPLATE_PLACEHOLDERS = [
  { key: "customer_name", label: "Customer name" },
  { key: "customer_email", label: "Customer email" },
  { key: "order_id", label: "Order ID" },
  { key: "order_total", label: "Order total" },
  { key: "items_summary", label: "Items summary" },
  { key: "access_link", label: "Access link" },
  { key: "site_name", label: "Site name" },
  { key: "business_name", label: "Business name" },
  { key: "business_address", label: "Business address" },
  { key: "business_phone", label: "Business phone" },
  { key: "business_email", label: "Business email" },
  { key: "download_links", label: "Download links (time-limited, one per line)" },
] as const;

interface TemplatePlaceholderPickerProps {
  insertAtCursor: (text: string) => void;
}

export function TemplatePlaceholderPicker({ insertAtCursor }: TemplatePlaceholderPickerProps) {
  const [value, setValue] = useState<string>("");
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) {
          insertAtCursor(`{{${v}}}`);
          setValue("");
        }
      }}
    >
      <SelectTrigger
        className="w-[180px] h-9"
        aria-label="Insert placeholder"
        title="Insert placeholder (e.g. {{customer_name}})"
      >
        <Braces className="h-4 w-4 mr-1.5 text-muted-foreground" />
        <SelectValue placeholder="Insert placeholder" />
      </SelectTrigger>
      <SelectContent>
        {TEMPLATE_PLACEHOLDERS.map(({ key, label }) => (
          <SelectItem key={key} value={key}>
            {label} ({`{{${key}}}`})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
