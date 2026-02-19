import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from "@/components/Providers";
import { StoreInitializer } from "@/components/StoreInitializer";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "LogiTrace ERP",
  description: "Complete Logistics Management System",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StoreInitializer />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

