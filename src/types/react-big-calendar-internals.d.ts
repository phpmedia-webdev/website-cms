/**
 * react-big-calendar does not ship types for these internal modules; we use them in AgendaWithDescription.
 */
declare module "react-big-calendar/lib/utils/eventLevels" {
  export function inRange(
    event: object,
    start: Date,
    end: Date,
    accessors: {
      start: (e: object) => Date;
      end: (e: object) => Date;
    },
    localizer: Record<string, unknown>
  ): boolean;
}

declare module "react-big-calendar/lib/utils/selection" {
  export function isSelected(event: object, selected: object | null | undefined): boolean;
}
