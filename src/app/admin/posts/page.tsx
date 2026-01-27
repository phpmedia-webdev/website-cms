import { redirect } from "next/navigation";

export default function PostsRedirectPage() {
  redirect("/admin/content?type=post");
}
