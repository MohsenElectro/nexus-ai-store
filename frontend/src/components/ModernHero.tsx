"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Flame,
  Layers,
  Code2,
  Lock,
  ChevronLeft,
  TrendingUp,
} from "lucide-react";
import ReactDropsAiOrb from "./ReactDropsAiOrb";
import { Product } from "@/lib/api";

interface ModernHeroProps {
  products: Product[];
  onSelectProduct: (p: Product) => void;
  onOpenDeveloperTab: () => void;
  onOpenCalculator: () => void;
}

export default function ModernHero({
  products,
  onSelectProduct,
  onOpenDeveloperTab,
  onOpenCalculator,
}: ModernHeroProps) {
  const [activeHeroTab, setActiveHeroTab] = useState<"DEALS" | "API" | "SECURITY">("DEALS");

  const geminiProd =
    products.find(
      (p) => p.category === "GEMINI" && (p.slug.includes("family") || p.title.includes("فمیلی"))
    ) ||
    products.find((p) => p.category === "GEMINI") ||
    products[0];

  const chatgptProd =
    products.find((p) => p.category === "CHATGPT") ||
    products.find((p) => p.slug.includes("chatgpt")) ||
    products[1] ||
    products[0];

  const gioProd =
    products.find((p) => p.category === "SPECIAL_OFFER" || p.slug.includes("gio")) ||
    products[2] ||
    products[0];

  return (
    <div className="relative mb-16 overflow-hidden pt-4 pb-8">
      {/* Subtle, restrained lighting (No loud purple glows) */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-20 h-[380px] w-[700px] rounded-full bg-gradient-to-b from-sky-500/10 via-transparent to-transparent blur-[140px]" />

      {/* Hero Header */}
      <div className="relative z-10 mx-auto max-w-4xl text-center space-y-5">
        {/* Top Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3.5 py-1 text-xs font-medium text-slate-300 shadow-sm backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span>پلتفرم تخصصی هوش مصنوعی و توکن</span>
          <span className="text-white/20">•</span>
          <span className="text-white font-semibold">تحویل آنی بدون مرز و تحریم</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.2]">
          اشتراک هوش مصنوعی و هاب توکن،{" "}
          <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            با پرداخت شتابی و تتر
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto max-w-2xl text-sm sm:text-base leading-relaxed text-slate-400">
          فعال‌سازی رسمی <strong className="text-white font-semibold">Gemini Advanced (۲ ترابایت گوگل وان)</strong> و <strong className="text-white font-semibold">ChatGPT Plus</strong> با ضمانت ۳۰ روزه تعویض، همراه با اندپوینت استاندارد OpenAI برای برنامه‌نویسان.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {geminiProd && (
            <button
              onClick={() => onSelectProduct(geminiProd)}
              className="btn-press group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-lg hover:bg-slate-200 transition-all"
            >
              <Sparkles className="h-4 w-4 text-sky-600" />
              <span>خرید فوری Gemini فمیلی (۲۴۰,۰۰۰ تومان)</span>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </button>
          )}

          <button
            onClick={onOpenDeveloperTab}
            className="btn-press flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 hover:border-white/20 transition-all"
          >
            <Terminal className="h-4 w-4 text-sky-400" />
            <span>دریافت API Key برنامه‌نویسان</span>
          </button>
        </div>

        {/* Social Proof Badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>بیش از ۱,۴۵۰ فعال‌سازی تایید شده</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-sky-400" />
            <span>ضمانت کامل کارکرد ۳۰ روزه</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>تحویل زیر ۳۰ ثانیه از انبار امن</span>
          </div>
        </div>
      </div>

      {/* Centerpiece Interactive Console */}
      <div className="relative z-10 mx-auto mt-10 max-w-5xl rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-3 shadow-2xl backdrop-blur-xl sm:p-5">
        {/* Console Header Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3 px-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="mr-3 font-mono text-xs text-slate-500">nexus-hub ~ v2.4</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveHeroTab("DEALS")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all btn-press ${
                activeHeroTab === "DEALS"
                  ? "bg-white text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🔥 آفرهای برگزیده
            </button>
            <button
              onClick={() => setActiveHeroTab("API")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all btn-press ${
                activeHeroTab === "API"
                  ? "bg-white text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ هاب توکن برنامه‌نویسان
            </button>
            <button
              onClick={() => setActiveHeroTab("SECURITY")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all btn-press ${
                activeHeroTab === "SECURITY"
                  ? "bg-white text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🔒 امنیت مخزن AES-256
            </button>
          </div>
        </div>

        {/* Tab 1: Live Top Deals */}
        {activeHeroTab === "DEALS" && (
          <div className="grid gap-4 pt-4 md:grid-cols-3">
            {/* Deal 1: Gemini */}
            {geminiProd && (
              <div
                onClick={() => onSelectProduct(geminiProd)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-sky-500/20 bg-gradient-to-b from-sky-950/20 to-[#0f141d] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50 hover:shadow-[0_0_20px_-5px_rgba(56,189,248,0.2)]"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400 border border-sky-500/20">
                    Google One 2TB
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">آفر فمیلی</span>
                </div>
                <h3 className="mt-3 font-bold text-white text-sm group-hover:text-sky-300 transition-colors">
                  Google Gemini Advanced
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                  فعال‌سازی روی جیمیل شخصی بدون پسورد با کانتکست ۱ میلیون توکن.
                </p>
                <div className="mt-4 flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
                  <div>
                    <span className="text-base font-extrabold text-white">
                      {geminiProd.price_toman.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-[11px] text-slate-400 mr-1">تومان</span>
                  </div>
                  <span className="text-xs font-semibold text-sky-400 group-hover:translate-x-[-4px] transition-transform">
                    خرید آنی ←
                  </span>
                </div>
              </div>
            )}

            {/* Deal 2: ChatGPT Plus */}
            {chatgptProd && (
              <div
                onClick={() => onSelectProduct(chatgptProd)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-[#0f141d] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/50 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    OpenAI GPT-4o
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">تحویل آنی</span>
                </div>
                <h3 className="mt-3 font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                  ChatGPT Plus اختصاصی
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                  دسترسی به قابلیت Canvas، ساخت تصویر DALL-E و بدون قطعی.
                </p>
                <div className="mt-4 flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
                  <div>
                    <span className="text-base font-extrabold text-white">
                      {chatgptProd.price_toman.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-[11px] text-slate-400 mr-1">تومان</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 group-hover:translate-x-[-4px] transition-transform">
                    خرید آنی ←
                  </span>
                </div>
              </div>
            )}

            {/* Deal 3: GIO Bundle */}
            {gioProd && (
              <div
                onClick={() => onSelectProduct(gioProd)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-rose-500/20 bg-gradient-to-b from-rose-950/20 to-[#0f141d] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-rose-400/50 hover:shadow-[0_0_20px_-5px_rgba(244,63,94,0.2)]"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                    ۷۰٪ تخفیف
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">کردیت ۵۰$</span>
                </div>
                <h3 className="mt-3 font-bold text-white text-sm group-hover:text-rose-300 transition-colors">
                  پکیج استثنایی جیو (GIO)
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                  کردیت ۵۰ دلاری جیو با دسترسی بدون تحریم به موتورهای متن و تصویر.
                </p>
                <div className="mt-4 flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
                  <div>
                    <span className="text-base font-extrabold text-white">
                      {gioProd.price_toman.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-[11px] text-slate-400 mr-1">تومان</span>
                  </div>
                  <span className="text-xs font-semibold text-rose-400 group-hover:translate-x-[-4px] transition-transform">
                    خرید آنی ←
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: API & Code Hub */}
        {activeHeroTab === "API" && (
          <div className="grid gap-6 pt-4 md:grid-cols-2 items-center">
            <div className="space-y-3 p-2">
              <span className="rounded-md bg-sky-500/10 px-2.5 py-1 text-xs text-sky-400 font-semibold border border-sky-500/20">
                یک API Key برای تمام مدل‌ها
              </span>
              <h3 className="text-lg font-bold text-white">
                اتصال مستقیم به Claude 3.5, GPT-4o و Gemini Flash
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                بدون نیاز به خرید چندین اکانت مجزا یا شارژ دلاری، با پروتکل استاندارد OpenAI کدهای پایتون و نرم‌افزار Cursor خود را مستقیم به هوش مصنوعی وصل کنید.
              </p>
              <button
                onClick={onOpenDeveloperTab}
                className="btn-press inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-slate-200"
              >
                <span>ورود به پنل توسعه‌دهنده</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#080a0e] p-4 font-mono text-xs text-slate-300" dir="ltr">
              <div className="text-slate-500 text-[11px] pb-2 border-b border-white/[0.06] mb-2 flex justify-between">
                <span>main.py</span>
                <span>OpenAI Compatible</span>
              </div>
              <pre className="text-emerald-400">{`from openai import OpenAI

client = OpenAI(
  api_key="sk-live-your-nexus-key",
  base_url="http://nexus-ai.store/v1"
)

response = client.chat.completions.create(
  model="gemini-1.5-flash",
  messages=[{"role": "user", "content": "Hello!"}],
  stream=True
)`}</pre>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Vault */}
        {activeHeroTab === "SECURITY" && (
          <div className="grid gap-4 pt-4 md:grid-cols-3 p-2">
            <div className="rounded-xl border border-white/[0.06] bg-[#0f141d] p-4 text-center space-y-2">
              <Lock className="h-6 w-6 text-sky-400 mx-auto" />
              <h4 className="text-xs font-bold text-white">رمزنگاری نظامی AES-256</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">اطلاعات اکانت‌ها در مخزن کاملاً رمزنگاری شده ذخیره شده و فقط خریدار کلید رمزگشایی را دارد.</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0f141d] p-4 text-center space-y-2">
              <ShieldCheck className="h-6 w-6 text-emerald-400 mx-auto" />
              <h4 className="text-xs font-bold text-white">فعال‌سازی بدون نیاز به پسورد</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">در پلن‌های فمیلی گوگل و سایر آفرها، هیچ‌گاه رمز عبور ایمیل شما دریافت نمی‌شود.</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0f141d] p-4 text-center space-y-2">
              <Zap className="h-6 w-6 text-amber-400 mx-auto" />
              <h4 className="text-xs font-bold text-white">پشتیبانی و گارانتی تعویض</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">در صورت هرگونه مشکل، پشتیبانی لحظه‌ای لایسنس جدید صادر کرده یا وجه را عودت می‌دهد.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
