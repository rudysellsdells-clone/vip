import { redirect } from "next/navigation";

export default function ReadyForPublishingLegacyRedirect() {
  redirect("/publishing-schedule");
}
