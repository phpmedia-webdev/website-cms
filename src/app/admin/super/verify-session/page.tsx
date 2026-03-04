import { redirect } from "next/navigation";

/**
 * Verify Session is now a tab on the Auth test page. Redirect so old links still work.
 */
export default function VerifySessionPage() {
  redirect("/admin/super/auth-test");
}
