import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "../styles/globals.css";
import { Providers } from "@/components/Providers";
import { StoreInitializer } from "@/components/StoreInitializer";

const appSans = Manrope({
  subsets: ["latin"],
  variable: "--font-app-sans",
});

const appDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-app-display",
});

export const metadata: Metadata = {
  title: "LogiTrace | Logistics Control Platform",
  description:
    "A multi-role logistics operations platform for managers, supervisors, and drivers.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#14532d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${appSans.variable} ${appDisplay.variable}`}>
        <StoreInitializer />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

