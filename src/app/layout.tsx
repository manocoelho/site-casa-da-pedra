import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ChatFloatingWidget } from "@/components/chat/ChatFloatingWidget";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { ChatNotificationProvider } from "@/context/ChatNotificationContext";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Casa da Pedra",
    template: "%s | Casa da Pedra",
  },
  description: "Reserve flats aconchegantes na Casa da Pedra.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ChatNotificationProvider>
          <SiteHeader />
          {/* Cada página/layout define seu próprio <main> (e rodapé, quando houver). */}
          <div className="flex flex-1 flex-col">{children}</div>
          <ChatFloatingWidget />
          <CookieConsentBanner />
        </ChatNotificationProvider>
      </body>
    </html>
  );
}
