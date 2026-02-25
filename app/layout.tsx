import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IndiaNext | Hackathon",
  description: "Join the most advanced mission-critical hackathon in Mumbai. Outthink the algorithm and build the future.",
  icons: {
    icon: "/logo-new.png",
    shortcut: "/logo-new.png",
    apple: "/logo-new.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script defer async src="https://apply.devfolio.co/v2/sdk.js" />
      </body>
    </html>
  );
}
