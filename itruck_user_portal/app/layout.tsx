import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import ThemeRegistry from "./ThemeRegistry";
import { GOOGLE_ADS_CLIENT } from "@/components/ads/adsConfig";

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
    icon: "/images/trucks99-logo.png",
    apple: "/images/trucks99-logo.png",
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
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2600927533607135"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.variable} ${sora.variable} antialiased`} suppressHydrationWarning>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
