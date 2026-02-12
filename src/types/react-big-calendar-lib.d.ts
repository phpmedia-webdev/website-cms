declare module "react-big-calendar/lib/Agenda" {
  import type { ComponentType } from "react";
  const Agenda: ComponentType<any> & {
    navigate?: (date: Date, action: string, props?: unknown) => Date;
    title?: (start: Date, props?: unknown) => string;
  };
  export default Agenda;
}
