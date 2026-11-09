"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Zap,
  Lock,
} from "lucide-react";

export default function HowItWorksAndFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const steps = [
    {
      num: "۱",
      title: "انتخاب پلن یا مقدار توکن",
      desc: "اشتراک اختصاصی دلخواه (مثل Gemini یا ChatGPT) را انتخاب کنید یا حساب خود را برای ساخت API Key شارژ نمایید.",
      icon: Zap,
    },
    {
      num: "۲",
      title: "پرداخت آسان شتابی یا تتری",
      desc: "هزینه را با کلیه کارت‌های عضو شتاب از طریق درگاه پرداخت بانکی یا با تتر شبکه ترون (TRC-20) بپردازید.",
      icon: CreditCard,
    },
    {
      num: "۳",
      title: "تحویل آنی و لایسنس فعال",
      desc: "اکانت‌های آماده بلافاصله در صفحه شما رمزگشایی می‌شوند و آفرهای فعال‌سازی روی ایمیل در صف اولویت همکاران ارزی قرار می‌گیرند.",
      icon: CheckCircle2,
    },
  ];

  const faqs = [
    {
      q: "آیا برای خرید اکانت Gemini Advanced نیاز است پسورد جیمیل را ارسال کنم؟",
      a: "خیر، به هیچ وجه! مدل اینوایت گوگل وان فمیلی (Family Invite) تنها نیازمند آدرس جیمیل شماست. لینک رسمی ورود به فمیلی گوگل برای شما ارسال شده و ظرف چند ثانیه روی اکانت شخصی خودتان فعال می‌شود بدون نیاز به هیچ‌گونه پسورد.",
    },
    {
      q: "تفاوت اکانت تحویل آنی (Instant Vault) با فعال‌سازی دستی چیست؟",
      a: "در اکانت‌های تحویل آنی، اطلاعات کاربری از قبل در سرور به شکل رمزنگاری‌شده با استاندارد نظامی AES-256 ذخیره شده و بلافاصله پس از پرداخت به شما نمایش داده می‌شود. در فعال‌سازی دستی، سفارش مستقیماً توسط اپراتورهای ارزی با کارت‌های بین‌المللی روی ایمیل اختصاصی شما شارژ می‌شود.",
    },
    {
      q: "سرویس توکن هوش مصنوعی (API Gateway) چگونه کار می‌کند؟",
      a: "ما یک پروکسی کاملاً استاندارد و سازگار با فرمت OpenAI ایجاد کرده‌ایم. با یک کلید اختصاصی می‌توانید به مدل‌های پیشرفته GPT-4o، کلود، دیپ‌سیک و جمینای وصل شوید. هزینه مصرف بر اساس هر ۱,۰۰۰ توکن محاسبه و از کیف پول شما کسر می‌گردد.",
    },
    {
      q: "در صورت قطعی اکانت یا بروز مشکل چه تضمینی وجود دارد؟",
      a: "کلیه اکانت‌های ما دارای ضمانت ۳۰ روزه تا آخرین روز اشتراک هستند. در صورت بروز هرگونه قطعی ناگهانی از سمت سرویس‌دهنده، اکانت جایگزین صادر شده یا باقیمانده اعتبار به کیف پول کاربر بازگردانده می‌شود.",
    },
    {
      q: "حداقل مبلغ شارژ کیف پول چقدر است؟",
      a: "حداقل شارژ کیف پول ۱۰,۰۰۰ تومان است و هیچ کارمزد پنهانی وجود ندارد. موجودی کیف پول تاریخ انقضا ندارد و در هر زمان قابل استفاده است.",
    },
    {
      q: "آیا پرداخت با ارز دیجیتال تتر (USDT) امکان‌پذیر است؟",
      a: "بله، در بخش افزایش موجودی می‌توانید درگاه تتر TRC-20 را انتخاب کنید و با ارسال TXID به صورت خودکار یا پس از بررسی چند ثانیه‌ای موجودی کیف پول خود را شارژ کنید.",
    },
  ];

  return (
    <div className="space-y-16 py-12">
      {/* 1. How It Works Section */}
      <section aria-label="مراحل خرید و فعال‌سازی">
        <div className="text-center max-w-[680px] mx-auto mb-10 space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            نحوه عملکرد فروشگاه در ۳ گام ساده
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            سریع‌ترین مسیر برای دسترسی به ابزارهای هوش مصنوعی برتر بین‌المللی
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="surface-card relative p-6 space-y-3 rounded-2xl border border-white/[0.08] bg-[#0c1017]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 border border-white/10 rounded-md px-2 py-0.5 bg-slate-900">
                    مرحله {s.num}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white pt-1">
                  {s.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Trust & Guarantees (Risk Reversal) */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-white/[0.06]">
          <div className="space-y-2 px-4 pt-4 md:pt-0">
            <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-semibold text-white">ضمانت کامل کارکرد</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              پشتیبانی تا آخرین روز اشتراک و تعویض فوری در صورت بروز هرگونه اختلال.
            </p>
          </div>
          <div className="space-y-2 px-4 pt-4 md:pt-0">
            <Lock className="h-8 w-8 text-sky-400 mx-auto" />
            <h4 className="text-sm font-semibold text-white">رمزنگاری پیشرفته مخزن</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              کلیه اطلاعات لایسنس‌ها با کلیدهای ۲۵۶ بیتی AES به صورت ایزوله نگهداری می‌شوند.
            </p>
          </div>
          <div className="space-y-2 px-4 pt-4 md:pt-0">
            <Zap className="h-8 w-8 text-amber-400 mx-auto" />
            <h4 className="text-sm font-semibold text-white">تحویل فوری و خودکار</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              بدون معطلی و بلافاصله پس از پرداخت، دسترسی مورد نظر در پنل کاربری شما قرار می‌گیرد.
            </p>
          </div>
        </div>
      </section>

      {/* 3. FAQ Accordion */}
      <section aria-label="سؤالات متداول">
        <div className="text-center max-w-[680px] mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-medium">
            <HelpCircle className="h-4 w-4" />
            <span>پاسخ به ابهامات متداول</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            سؤالات متداول کاربران
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            تمام جزئیاتی که قبل از خرید و اتصال نیاز است بدانید
          </p>
        </div>

        <div className="max-w-[760px] mx-auto space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1017] transition-all duration-300"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-right transition-colors hover:bg-slate-800/40"
                  aria-expanded={isOpen}
                >
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-sky-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-white/[0.06] p-4 text-xs leading-relaxed text-slate-400 bg-slate-900/40">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
