import { redirect } from "next/navigation";

export default function EditPostRedirectPage() {
  redirect("/admin/content?type=post");
}
