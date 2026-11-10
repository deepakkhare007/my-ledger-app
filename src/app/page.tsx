import { redirect } from "next/navigation";

// S02 (the customer list) is the default landing screen per recon.md.
export default function RootPage() {
  redirect("/customers");
}
