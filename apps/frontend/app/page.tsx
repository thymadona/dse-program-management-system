import { redirect } from "next/navigation";
import { getNavRoutes } from "@/lib/nav";

/** Root redirects to the first plugin route (Students for now). */
export default function Home() {
  const [first] = getNavRoutes();
  redirect(first?.path ?? "/students");
}
