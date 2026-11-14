"use client";

import React from "react";
import { Check, X, ShieldCheck, Zap, Sparkles } from "lucide-react";

export default function ComparisonMatrix() {
  const rows = [
    {
      feature: "روش و سادگی پرداخت",
      nexus: "درگاه پرداخت امن شتابی + تتر (TRC-20)",
      telegram: "کارت‌به‌کارت به افراد ناشناس و ریسک کلاهبرداری",
      direct: "نیازمند ویزاکارت / مسترکارت بین‌المللی با کارمزد صرافی",
    },
    {
      feature: "امنیت اکانت و حریم خصوصی",
      nexus: "بدون نیاز به پسورد جیمیل (لینک رسمی فمیلی یا اکانت آماده)",
      telegram: "دریافت اجباری ایمیل و پسورد شخصی شما",
      direct: "ریسک بالای بلاک شدن اکانت به علت IP ایران",
    },
    {
      feature: "سرعت تحویل لایسنس",
      nexus: "تحویل آنی از مخزن امن در کمتر از ۳۰ ثانیه",
      telegram: "چند ساعت تا چند روز معطلی تا پاسخگویی ادمین",
      direct: "فوری (در صورت داشتن کارت ارزی معتبر)",
    },
    {
      feature: "ضمانت تعویض و پشتیبانی",
      nexus: "ضمانت ۳۰ روزه رسمی تا آخرین ثانیه اشتراک",
      telegram: "بدون پاسخگویی پس از واریز وجه یا بن شدن کانال",
      direct: "پشتیبانی به زبان انگلیسی با ریسک مسدودی ایرانیان",
    },
    {
      feature: "هاب متمرکز توکن برای برنامه‌نویسان",
      nexus: "پراکسی واحد سازگار با OpenAI برای تمام مدل‌ها",
      telegram: "ندارد",
      direct: "شارژ دلاری مجزا برای تک‌تک سرویس‌ها",
    },
  ];

  return (
    <section aria-label="جدول مقایسه پلتفرم" className="my-16">
      <div className="text-center max-w-[680px] mx-auto mb-10 space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>برتری‌های رقابتی و شفافیت</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          چرا AI Nexus Store انتخاب اول کاربران است؟
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          مقایسه شفاف خرید از پلتفرم تخصصی ما با واسطه‌های تلگرامی و خرید مستقیم دلاری
        </p>
      </div>

      {/* Mobile & Mini-App Stacked Comparison Cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((r, idx) => (
          <div
            key={`mobile-comp-${idx}`}
            className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 space-y-2.5 shadow-lg"
          >
            <div className="font-bold text-white text-xs border-b border-white/[0.06] pb-2">
              {r.feature}
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5 text-xs font-semibold text-emerald-400">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold text-sky-400 mb-0.5">AI Nexus Store:</span>
                <span>{r.nexus}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-[11px] text-slate-400 pt-0.5">
              <div className="flex items-start gap-1.5">
                <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-500">کانال‌های تلگرامی:</strong> {r.telegram}
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-500">
                <span className="inline-block w-3.5 text-center shrink-0">•</span>
                <span>
                  <strong>خرید مستقیم خارجی:</strong> {r.direct}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Comparison Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0c1017] shadow-xl">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] bg-slate-900/60 text-slate-400">
              <th className="p-4 font-bold text-white">ویژگی و معیار</th>
              <th className="p-4 font-extrabold text-sky-400 border-x border-white/[0.08] bg-sky-500/5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-sky-400" />
                  <span>AI Nexus Store</span>
                </div>
              </th>
              <th className="p-4 font-semibold text-slate-500">کانال‌های تلگرامی و واسطه‌ها</th>
              <th className="p-4 font-semibold text-slate-500">خرید مستقیم خارجی</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4 font-medium text-white">{r.feature}</td>
                <td className="p-4 border-x border-white/[0.08] bg-sky-500/5 font-semibold text-emerald-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>{r.nexus}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-400">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-rose-500 flex-shrink-0" />
                    <span>{r.telegram}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-500">
                  <span>{r.direct}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
