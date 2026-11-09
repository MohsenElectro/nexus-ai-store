"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";

export default function TaglineReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.25 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const taglineWords = [
    "قوی‌ترین",
    "مدل‌های",
    "هوش",
    "مصنوعی",
    "جهان",
    "را",
    "بدون",
    "دغدغه",
    "تحریم،",
    "کارت‌های",
    "خارجی",
    "و",
    "هزینه‌های",
    "گزاف",
    "مستقیماً",
    "در",
    "دستان",
    "خود",
    "داشته",
    "باشید.",
  ];

  return (
    <section
      ref={containerRef}
      className="my-16 border-y border-white/[0.08] bg-[#0c1017]/70 py-14 px-6 sm:px-12"
      aria-label="بیانیه ارزش پلتفرم"
    >
      <div className="mx-auto max-w-[760px] text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3.5 py-1 text-xs font-medium text-sky-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>زیرساخت بدون واسطه و پایدار</span>
        </div>

        <h2 className="text-xl sm:text-3xl font-semibold leading-relaxed tracking-tight text-white">
          {taglineWords.map((word, index) => (
            <span
              key={index}
              style={{
                transitionDelay: `${index * 35}ms`,
              }}
              className={`inline-block mx-1 transition-all duration-500 ${
                isVisible
                  ? "opacity-100 text-white translate-y-0"
                  : "opacity-25 text-slate-500 translate-y-1"
              }`}
            >
              {word}
            </span>
          ))}
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 max-w-[560px] mx-auto pt-2">
          تحویل تضمین‌شده در کمتر از ۳۰ ثانیه، فعال‌سازی رسمی بر روی ایمیل شخصی و اتصال مستقیم به API مدل‌ها با تسویه ریالی.
        </p>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-3 pt-6 max-w-[480px] mx-auto">
          <div className="rounded-xl border border-white/[0.08] bg-[#080b10] p-3 text-center">
            <div className="text-base sm:text-lg font-bold text-sky-400">۱,۴۵۰+</div>
            <div className="text-[11px] text-slate-500">سفارش موفق</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#080b10] p-3 text-center">
            <div className="text-base sm:text-lg font-bold text-emerald-400">&lt; ۳۰ ثانیه</div>
            <div className="text-[11px] text-slate-500">سرعت تحویل</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#080b10] p-3 text-center">
            <div className="text-base sm:text-lg font-bold text-cyan-400">۹۹.۸٪</div>
            <div className="text-[11px] text-slate-500">رضایت کاربران</div>
          </div>
        </div>
      </div>
    </section>
  );
}
