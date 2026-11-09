"use client";

import React, { useState } from "react";
import { Zap, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default function LiveTicker() {
  const [isPaused, setIsPaused] = useState(false);

  const events = [
    { text: "سفارش جدید: اکانت Gemini Advanced فمیلی تحویل داده شد", time: "۱ دقیقه پیش", icon: Sparkles, color: "text-sky-400" },
    { text: "توسعه‌دهنده از تهران کلید API با ۱,۰۰۰,۰۰۰ توکن ساخت", time: "۳ دقیقه پیش", icon: Zap, color: "text-emerald-400" },
    { text: "سفارش موفق: آفر ویژه پکیج جیو (۷۰٪ تخفیف) فعال شد", time: "۶ دقیقه پیش", icon: CheckCircle2, color: "text-amber-400" },
    { text: "شارژ کیف پول: مبلغ ۵۰۰,۰۰۰ تومان از درگاه شتاب تایید گردید", time: "۹ دقیقه پیش", icon: ShieldCheck, color: "text-sky-400" },
    { text: "سفارش جدید: اکانت ChatGPT Plus اختصاصی تحویل آنی شد", time: "۱۱ دقیقه پیش", icon: Sparkles, color: "text-emerald-400" },
  ];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative mb-8 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1017] py-2 px-4 shadow-sm"
    >
      <div
        className={`flex w-max items-center gap-12 whitespace-nowrap animate-marquee ${
          isPaused ? "[animation-play-state:paused]" : ""
        }`}
      >
        {events.concat(events).map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
              <Icon className={`h-3.5 w-3.5 ${item.color} flex-shrink-0`} />
              <span className="font-medium text-white">{item.text}</span>
              <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] text-slate-500 font-mono border border-white/5">
                {item.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
