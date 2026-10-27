import { redirect } from "next/navigation";
import { canSeeDashboard, getViewer } from "@/lib/viewer";

export default async function Home() {
  const viewer = await getViewer();
  redirect(viewer && canSeeDashboard(viewer) ? "/dashboard" : "/check-in");
}
