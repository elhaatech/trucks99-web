import { redirect } from "next/navigation";
import { SHOW_ADVERTISEMENT_MODULE } from "@/lib/featureFlags";
import { routes } from "@/lib/routes";

export default function AdvertisementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!SHOW_ADVERTISEMENT_MODULE) {
    redirect(routes.dashboard());
  }

  return <>{children}</>;
}
