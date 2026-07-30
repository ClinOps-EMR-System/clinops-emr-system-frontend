import { redirect } from "next/navigation";

export default function EmergencyQueueRedirect() {
  redirect("/triage-queue");
}
