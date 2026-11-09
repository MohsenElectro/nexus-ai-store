"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowLeft,
  Lock,
  Layers,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Product } from "@/lib/api";

interface FeaturedSpotlightProps {
  products: Product[];
  onSelectProduct: (p: Product) => void;
}

export default function FeaturedSpotlight({
  products,
  onSelectProduct,
}: FeaturedSpotlightProps) {
  // Safe product matching with zero collision
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

  const claudeProd =
    products.find((p) => p.category === "CLAUDE") ||
    products.find((p) => p.slug.includes("claude")) ||
    products[2] ||
    products[0];

  const gioProd =
    products.find((p) => p.category === "SPECIAL_OFFER" || p.slug.includes("gio")) ||
    products[3] ||
    products[0];

  // Flagship spotlight products with unique identifiers
  const spotlightItems = [
    {
      id: "gemini-spotlight",
      prod: geminiProd,
      tag: "🔥 پرفروش‌ترین آفر اقتصادی",
      tagColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      accentBorder: "group-hover:border-sky-500/40",
      accentGlow: "group-hover:shadow-[0_0_30px_-5px_rgba(14,165,233,0.15)]",
      badgeIcon: "G",
      delivery: "فعال‌سازی روی جیمیل شخصی بدون پسورد",
      storage: "۲ ترابایت فضای ابری گوگل وان رایگان",
      saving: "۲۵۰,۰۰۰ تومان صرفه‌جویی",
    },
    {
      id: "chatgpt-spotlight",
      prod: chatgptProd,
      tag: "⚡ پرچمدار OpenAI",
      tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      accentBorder: "group-hover:border-emerald-500/40",
      accentGlow: "group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]",
      badgeIcon: "AI",
      delivery: "تحویل آنی لایسنس از مخزن امن",
      storage: "دسترسی کامل به GPT-4o و Canvas",
      saving: "۵۵۰,۰۰۰ تومان صرفه‌جویی",
    },
    {
      id: "claude-spotlight",
      prod: claudeProd,
      tag: "🤖 انتخاب اول برنامه‌نویسان",
      tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      accentBorder: "group-hover:border-amber-500/40",
      accentGlow: "group-hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)]",
      badgeIcon: "C",
      delivery: "اکانت اختصاصی با دسترسی مستقیم",
      storage: "کانتکست ۲۰۰K توکن و ابزار Artifacts",
      saving: "۴۱۰,۰۰۰ تومان صرفه‌جویی",
    },
    {
      id: "gio-spotlight",
      prod: gioProd,
      tag: "🎁 تخفیف استثنایی ۷۰٪",
      tagColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      accentBorder: "group-hover:border-rose-500/40",
      accentGlow: "group-hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)]",
      badgeIcon: "50$",
      delivery: "اعتبار فوری روی پنل کاربری",
      storage: "کردیت ۵۰ دلاری برای انواع مدل‌های مولد",
      saving: "۲,۱۵۰,۰۰۰ تومان صرفه‌جویی",
    },
  ].filter((item) => item.prod !== undefined);

  const [activeFilter, setActiveFilter] = useState<number>(0);

  return (
    <section aria-label="ویترین آفرهای برگزیده" className="my-16">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/5 px-3 py-1 text-xs font-semibold text-sky-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>آفرهای استثنایی و برگزیده امروز</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ویترین پرفروش‌ترین اشتراک‌های هوش مصنوعی
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            تحویل آنی از مخزن امن یا فعال‌سازی رسمی بر روی ایمیل شخصی، همراه با ضمانت بازگشت وجه تا روز آخر
          </p>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-white/[0.06]">
          {["همه برگزیده‌ها", "گوگل Gemini", "ChatGPT Plus", "Claude Pro", "آفر ویژه GIO"].map((label, idx) => (
            <button
              key={`filter-pill-${idx}`}
              onClick={() => setActiveFilter(idx)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeFilter === idx
                  ? "bg-white text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of 4 Crisp, Non-Overlapping Spotlight Cards */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {spotlightItems.map((item, idx) => {
          const p = item.prod!;
          const isHighlighted = activeFilter === 0 || activeFilter === idx + 1;

          return (
            <div
              key={`spotlight-card-${item.id}-${idx}`}
              className={`group relative flex flex-col justify-between rounded-2xl border bg-gradient-to-b from-[#11151c] to-[#0c0f14] p-5 transition-all duration-300 ${
                item.accentBorder
              } ${item.accentGlow} ${
                isHighlighted
                  ? "border-white/[0.08] opacity-100 scale-100"
                  : "border-white/[0.03] opacity-40 scale-[0.98]"
              } hover:-translate-y-1`}
            >
              {/* Card Top: Brand Badge & Saving Tag */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${item.tagColor}`}
                  >
                    {item.tag}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {item.saving}
                  </span>
                </div>

                {/* Title & Brand Header */}
                <div className="mt-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-white/10 text-white font-black text-sm shadow-inner">
                    {item.badgeIcon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                      {p.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.storage}
                    </p>
                  </div>
                </div>

                {/* Value Bullets */}
                <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-3.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-[11px] text-slate-300">{item.delivery}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" />
                    <span className="text-[11px] text-slate-300">ضمانت ۳۰ روزه تعویض و کارکرد</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                    <span className="text-[11px] text-slate-300">
                      {p.fulfillment_type === "INSTANT_VAULT" ? "تحویل زیر ۳۰ ثانیه از انبار" : "فعال‌سازی بدون ارسال پسورد"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Price & Direct CTA */}
              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <div className="mb-3.5 flex items-baseline justify-between">
                  <div>
                    {p.original_price_toman && (
                      <span className="ml-2 text-xs text-slate-500 line-through">
                        {p.original_price_toman.toLocaleString("fa-IR")}
                      </span>
                    )}
                    <span className="text-lg font-extrabold text-white">
                      {p.price_toman.toLocaleString("fa-IR")}
                    </span>
                    <span className="mr-1 text-[11px] text-slate-400">تومان</span>
                  </div>
                  <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-white/5">
                    ~{p.price_usdt} USDT
                  </span>
                </div>

                <button
                  onClick={() => onSelectProduct(p)}
                  className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-slate-200 transition-colors"
                >
                  <span>خرید و تحویل فوری</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
