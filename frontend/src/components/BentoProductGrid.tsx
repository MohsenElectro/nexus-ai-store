"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  Flame,
  Search,
  Tag,
  Clock,
  Layers,
} from "lucide-react";
import { Product } from "@/lib/api";

interface BentoProductGridProps {
  products: Product[];
  onSelectProduct: (p: Product) => void;
}

export default function BentoProductGrid({ products, onSelectProduct }: BentoProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = [
    { id: "ALL", label: "همه اشتراک‌ها", count: products.length },
    { id: "SPECIAL_OFFER", label: "🔥 آفرهای ویژه تخفیفی", count: products.filter((p) => p.is_special_offer).length },
    { id: "GEMINI", label: "Google Gemini Advanced", count: products.filter((p) => p.category === "GEMINI").length },
    { id: "CHATGPT", label: "ChatGPT Plus", count: products.filter((p) => p.category === "CHATGPT").length },
    { id: "CLAUDE", label: "Claude Pro", count: products.filter((p) => p.category === "CLAUDE").length },
    { id: "CURSOR", label: "Cursor AI", count: products.filter((p) => p.category === "CURSOR").length },
    { id: "MIDJOURNEY", label: "Midjourney v6", count: products.filter((p) => p.category === "MIDJOURNEY").length },
  ];

  const filtered = products.filter((p) => {
    const matchesCat =
      selectedCategory === "ALL" ||
      (selectedCategory === "SPECIAL_OFFER" && p.is_special_offer) ||
      p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <section aria-label="فهرست اشتراک‌ها و آفرها" className="my-16">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 md:flex-row md:items-end">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400">
            <Tag className="h-3.5 w-3.5" />
            <span>کاتالوگ کامل و قانونی</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            تمامی اشتراک‌های پریمیوم هوش مصنوعی
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            تمامی اکانت‌ها قانونی، دارای پشتیبانی ۲۴ ساعته و قابلیت تمدید ماهانه با تضمین هستند
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="جستجوی مدل (مثلاً Gemini, Claude)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0c1017] py-2.5 pl-4 pr-10 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="my-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`btn-press flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              selectedCategory === c.id
                ? "bg-white text-slate-950 font-bold shadow-md shadow-white/5"
                : "border border-white/[0.08] bg-[#0c1017] text-slate-400 hover:border-white/20 hover:text-white"
            }`}
          >
            <span>{c.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                selectedCategory === c.id
                  ? "bg-slate-950/10 text-slate-900 font-bold"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {c.count}
            </span>
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p, pIdx) => {
          const isGemini = p.category === "GEMINI";
          const isChatGPT = p.category === "CHATGPT";
          const isClaude = p.category === "CLAUDE";
          const isSpecial = p.is_special_offer;

          let badgeColor = "bg-sky-500/10 text-sky-400 border-sky-500/20";
          let borderAccent = "border-white/[0.08] hover:border-white/20";
          let ambientGlow = "hover:shadow-sky-500/5";

          if (isGemini) {
            badgeColor = "bg-sky-500/10 text-sky-400 border-sky-500/20";
            borderAccent = "border-sky-500/20 hover:border-sky-400/60";
            ambientGlow = "hover:shadow-[0_0_25px_-5px_rgba(56,189,248,0.15)]";
          } else if (isChatGPT) {
            badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            borderAccent = "border-emerald-500/20 hover:border-emerald-400/60";
            ambientGlow = "hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.15)]";
          } else if (isClaude) {
            badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
            borderAccent = "border-amber-500/20 hover:border-amber-400/60";
            ambientGlow = "hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)]";
          } else if (isSpecial) {
            badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
            borderAccent = "border-rose-500/20 hover:border-rose-400/60";
            ambientGlow = "hover:shadow-[0_0_25px_-5px_rgba(244,63,94,0.15)]";
          }

          return (
            <div
              key={`product-card-${p.id}-${pIdx}`}
              className={`surface-card group relative flex flex-col justify-between rounded-2xl border ${borderAccent} bg-[#0c1017] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 ${ambientGlow}`}
            >
              <div>
                {/* Header: Category and Badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                    {p.category}
                  </span>

                  {p.offer_badge && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                      <Flame className="h-3 w-3 text-amber-400" />
                      {p.offer_badge}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div className="mt-4 space-y-2">
                  <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-400 line-clamp-2">
                    {p.description}
                  </p>
                </div>

                {/* Features Bullets */}
                {p.features && (
                  <div className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3 text-xs text-slate-300">
                    {p.features.split("|").slice(0, 3).map((feat, idx) => (
                      <div key={`feat-${p.id}-${idx}`} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{feat.trim()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom: Pricing & Buy Button */}
              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <div className="mb-4 flex items-baseline justify-between">
                  <div>
                    {p.original_price_toman && (
                      <span className="ml-2 text-xs text-slate-500 line-through">
                        {p.original_price_toman.toLocaleString("fa-IR")}
                      </span>
                    )}
                    <span className="text-xl font-extrabold text-white">
                      {p.price_toman.toLocaleString("fa-IR")}
                    </span>
                    <span className="mr-1 text-xs text-slate-400">تومان</span>
                  </div>
                  <span className="rounded border border-white/[0.08] bg-slate-900 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    ~{p.price_usdt} USDT
                  </span>
                </div>

                <button
                  onClick={() => onSelectProduct(p)}
                  className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-slate-950 shadow hover:bg-slate-200 transition-all"
                >
                  <span>خرید و فعال‌سازی فوری</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-sky-400" />
                    {p.fulfillment_type === "INSTANT_VAULT" ? "تحویل آنی از مخزن" : "شارژ مستقیم ایمیل"}
                  </span>
                  <span className="text-emerald-400 font-medium">ضمانت ۳۰ روزه</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
