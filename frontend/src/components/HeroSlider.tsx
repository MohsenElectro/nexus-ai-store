"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  ArrowLeft,
  Flame,
  Terminal,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import ReactDropsAiOrb from "./ReactDropsAiOrb";

interface HeroSliderProps {
  onSelectCategory: (category: string) => void;
  onOpenDeveloperTab: () => void;
}

export default function HeroSlider({ onSelectCategory, onOpenDeveloperTab }: HeroSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides = [
    {
      id: "gemini-adv",
      badge: "Google One AI Premium",
      badgeIcon: Sparkles,
      badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      title: "اکانت و اینوایت اختصاصی Google Gemini Advanced",
      subtitle: "دسترسی مستقیم روی جیمیل شخصی بدون نیاز به ارسال پسورد با فعال‌سازی آنی، یا اکانت‌های آماده ۲ ترابایتی با کمترین نرخ بازار.",
      highlight: "شروع از ۲۴۰,۰۰۰ تومان",
      originalPrice: "۴۹۰,۰۰۰ تومان",
      ctaText: "مشاهده پلن‌های Gemini",
      orbState: "speaking" as const,
      features: ["فعال‌سازی روی ایمیل شما", "فضای ذخیره‌سازی ۲ ترابایتی", "مدل قدرتمند Gemini 1.5 Pro"],
      action: () => onSelectCategory("GEMINI"),
    },
    {
      id: "gio-deal",
      badge: "پیشنهاد محدود و اختصاصی",
      badgeIcon: Flame,
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      title: "پکیج جامع هوش مصنوعی جیو (GIO Bundle)",
      subtitle: "کردیت ۵۰ دلاری جیو همراه با دسترسی بدون تحریم به موتورهای پیشرفته پردازش تصویر و متن، آماده تحویل آنی.",
      highlight: "۷۰٪ تخفیف انحصاری",
      originalPrice: "۳,۱۰۰,۰۰۰ تومان",
      ctaText: "دریافت فوری پکیج جیو",
      orbState: "thinking" as const,
      features: ["کردیت ۵۰ دلاری آنی", "تولید تصویر نامحدود", "بدون نیاز به کارت خارجی"],
      action: () => onSelectCategory("SPECIAL_OFFER"),
    },
    {
      id: "token-hub",
      badge: "OpenAI-Compatible Gateway",
      badgeIcon: Terminal,
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      title: "هاب متمرکز توکن برای توسعه‌دهندگان ایرانی",
      subtitle: "یک API Key واحد برای اتصال به GPT-4o, Claude 3.5 Sonnet, DeepSeek و Gemini با تسویه آنی شتابی یا تتری.",
      highlight: "شمارش توکن با دقت ۱ کلمه",
      originalPrice: null,
      ctaText: "دریافت کلید API توسعه‌دهنده",
      orbState: "idle" as const,
      features: ["سازگار با تمام کتابخانه‌های OpenAI", "استریم آنی پاسخ (SSE)", "پشتیبانی از پرداخت تتری"],
      action: onOpenDeveloperTab,
    },
  ];

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const slide = slides[currentSlide];
  const BadgeIcon = slide.badgeIcon;

  return (
    <section
      aria-label="آفرهای برتر"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative mb-12 overflow-hidden rounded-2xl border border-[#27272a] bg-[#121216] p-6 shadow-xl transition-all duration-500 sm:p-10"
    >
      {/* Background Architectural Glow */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl transition-opacity duration-700" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl transition-opacity duration-700" />

      <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
        {/* Slide Content */}
        <div className="max-w-[620px] space-y-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${slide.badgeColor}`}
            >
              <BadgeIcon className="h-3.5 w-3.5" />
              {slide.badge}
            </span>
            <span className="text-xs text-[#a1a1aa] flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              ضمانت تحویل آنی
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#fafafa] sm:text-4xl leading-tight">
            {slide.title}
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-[#a1a1aa]">
            {slide.subtitle}
          </p>

          {/* Key Feature Bullets */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-xs text-[#d4d4d8]">
            {slide.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Action and Pricing */}
          <div className="flex flex-wrap items-center gap-4 pt-3">
            <button
              onClick={slide.action}
              className="btn-press inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <span>{slide.ctaText}</span>
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-[#fafafa]">
                {slide.highlight}
              </span>
              {slide.originalPrice && (
                <span className="text-xs text-[#71717a] line-through">
                  {slide.originalPrice}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Liquid Glass Orb (ReactDrops inspired) & Slide Selector */}
        <div className="flex flex-col items-center justify-center gap-4">
          <ReactDropsAiOrb initialState={slide.orbState} />

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              {slides.map((s, index) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`اسلاید ${index + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === index
                      ? "w-8 bg-indigo-500"
                      : "w-2 bg-[#27272a] hover:bg-[#3f3f46]"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-[#71717a]">
              اسلاید {currentSlide + 1} از {slides.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
