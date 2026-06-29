import { redirect } from "next/navigation";

export default function PublishedLegacyRedirect() {
  redirect("/actions");
}
