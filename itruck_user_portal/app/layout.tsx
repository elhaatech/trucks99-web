import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import ThemeRegistry from "./ThemeRegistry";
import { AdsenseScript } from "@/components/ads/AdsenseScript";
import { GOOGLE_ADS_CLIENT } from "@/components/ads/adsConfig";
import { withAppBasePath } from "@/lib/appConfig";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TRUCKS99 Marketplace",
  description: "Buy and sell commercial vehicles on TRUCKS99.",
  icons: {
    icon: withAppBasePath("/images/trucks99-logo.png"),
    apple: withAppBasePath("/images/trucks99-logo.png"),
  },
  other: {
    "google-adsense-account": GOOGLE_ADS_CLIENT,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sora.variable} antialiased`} suppressHydrationWarning>
        <AdsenseScript />
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
