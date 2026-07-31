import type { Metadata } from "next";
import Script from "next/script";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import ThemeRegistry from "./ThemeRegistry";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <head>
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${jakarta.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
