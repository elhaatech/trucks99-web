import { PortalProviders } from "./PortalProviders";

export default function UserProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalProviders>{children}</PortalProviders>;
}
