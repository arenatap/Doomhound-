import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const creepster = localFont({
  src: [
    {
      path: "../../public/fonts/Creepster-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-creepster",
  display: "swap",
});

export const metadata: Metadata = {
  title: "$DOOMHOUND — Can't Kill What's Already From Hell",
  description:
    "The Arena's most feared contender. $DOOMHOUND on Avalanche. Fair launch, 0 tax, LP burned, contract renounced. The devil's good boy is here.",
  keywords: [
    "DOOMHOUND",
    "meme token",
    "Avalanche",
    "The Arena",
    "crypto",
    "degen",
  ],
  icons: {
    icon: "/images/doomhound-logo.png",
  },
  openGraph: {
    title: "$DOOMHOUND — Can't Kill What's Already From Hell",
    description:
      "The Arena's most feared contender. Fair launch, 0 tax, LP burned, contract renounced.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "$DOOMHOUND — Can't Kill What's Already From Hell",
    description:
      "The Arena's most feared contender. Fair launch, 0 tax, LP burned, contract renounced.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${creepster.variable} antialiased bg-[#0a0a0a] text-[#f5f5f5]`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
