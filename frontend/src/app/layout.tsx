import type { Metadata } from "next";
import ToasterProvider from "@/components/ToasterProvider";
import "./globals.css";

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
      <body className="min-h-screen bg-[#09090b] text-[#fafafa] antialiased">
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
