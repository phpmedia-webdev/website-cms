"use client";

import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export function ApiBaseUrl() {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);
  return <Input value={origin} readOnly className="bg-muted" />;
}
