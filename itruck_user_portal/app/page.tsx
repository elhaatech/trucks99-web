import { redirect } from "next/navigation";
import { userProductRoutes } from "@/lib/userProductRoutes";

export default function HomePage() {
  redirect(userProductRoutes.dashboard());
}
