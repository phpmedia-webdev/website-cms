import { redirect } from "next/navigation";

export default function NewPostRedirectPage() {
  redirect("/admin/content?type=post");
}
