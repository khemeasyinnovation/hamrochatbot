import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteWidgetLoader } from "@/components/chat/SiteWidgetLoader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HamroBot",
  description: "Made by next app",
  icons: {
    icon: "/globe.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SiteWidgetLoader />
      </body>
    </html>
  );
}