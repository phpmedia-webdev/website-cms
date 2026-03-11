import { redirect } from "next/navigation";

/** Ecommerce section: default to Products list. */
export default function EcommercePage() {
  redirect("/admin/ecommerce/products");
}
