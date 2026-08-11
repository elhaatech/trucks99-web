import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import ThemeRegistry from "./ThemeRegistry";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TRUCKS99 Marketplace",
  description: "Buy and sell commercial vehicles on TRUCKS99.",
  icons: {
    icon: "/images/trucks99-logo.png",
    apple: "/images/trucks99-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`} suppressHydrationWarning style={{ overflowX: "hidden" }}>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
