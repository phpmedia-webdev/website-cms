declare module "react-big-calendar" {
  import type { ComponentType } from "react";

  export type View = "month" | "week" | "work_week" | "day" | "agenda";

  export const Calendar: ComponentType<Record<string, unknown>>;
  export const Navigate: ComponentType<unknown> & {
    PREVIOUS: string;
    NEXT: string;
  };
  export function dateFnsLocalizer(...args: unknown[]): unknown;

  export type ViewsProps<T = unknown, S = unknown> = Record<string, unknown>;
  export type Components<T = unknown, S = unknown> = Record<string, unknown>;
}
