import type { Metadata, Viewport } from "next";
import Script from "next/script";
import ToasterProvider from "@/components/ToasterProvider";
import TelegramWebAppProvider from "@/components/TelegramWebAppProvider";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c1017" },
    { media: "(prefers-color-scheme: light)", color: "#0c1017" },
  ],
};

export const metadata: Metadata = {
  title: "AI Nexus Store | فروشگاه هوش مصنوعی و هاب توکن",
  description: "خرید فوری اشتراک‌های هوش مصنوعی (Gemini Advanced, ChatGPT Plus, Claude Pro, Cursor) و سرویس یکپارچه توکن برای توسعه‌دهندگان با پرداخت شتابی و تتر",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="dark">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen bg-[#09090b] text-[#fafafa] antialiased">
        {children}
        <TelegramWebAppProvider />
        <ToasterProvider />
      </body>
    </html>
  );
}
