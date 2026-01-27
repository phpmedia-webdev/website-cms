import { redirect } from "next/navigation";

export default function PagesRedirectPage() {
  redirect("/admin/content?type=page");
}
