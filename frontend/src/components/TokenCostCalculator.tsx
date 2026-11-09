"use client";

import React, { useState } from "react";
import { Calculator, Sparkles, Zap, ArrowLeft, Layers } from "lucide-react";

const MODEL_RATES: Record<string, { name: string; inputToman: number; outputToman: number; provider: string }> = {
  "deepseek-chat": {
    name: "DeepSeek V3 / R1",
    inputToman: 15,
    outputToman: 40,
    provider: "DeepSeek",
  },
  "gemini-1.5-flash": {
    name: "Gemini 1.5 Flash",
    inputToman: 12,
    outputToman: 35,
    provider: "Google",
  },
  "gemini-1.5-pro": {
    name: "Gemini 1.5 Pro (1M Context)",
    inputToman: 90,
    outputToman: 350,
    provider: "Google",
  },
  "gpt-4o": {
    name: "OpenAI GPT-4o",
    inputToman: 250,
    outputToman: 900,
    provider: "OpenAI",
  },
  "claude-3-5-sonnet": {
    name: "Claude 3.5 Sonnet",
    inputToman: 300,
    outputToman: 1200,
    provider: "Anthropic",
  },
};

export default function TokenCostCalculator({ onOpenWallet }: { onOpenWallet: () => void }) {
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
  const [promptTokens, setPromptTokens] = useState(10000);
  const [completionTokens, setCompletionTokens] = useState(2500);

  const modelInfo = MODEL_RATES[selectedModel] || MODEL_RATES["gemini-1.5-flash"];
  const costToman = Math.round(
    (promptTokens / 1000) * modelInfo.inputToman + (completionTokens / 1000) * modelInfo.outputToman
  );
  const costUsdt = (costToman / 70000).toFixed(3);

  return (
    <section
      aria-label="محاسبه‌گر هزینه توکن"
      className="relative mb-12 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-xl sm:p-8"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
            <Calculator className="h-3.5 w-3.5" />
            <span>محاسبه‌گر زنده هزینه مصرف توکن‌ها</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            شفافیت کامل در هزینه‌های پردازش هوش مصنوعی
          </h3>
          <p className="text-xs text-slate-400">
            میزان توکن ورودی و خروجی مورد نیاز برنامه‌تان را تنظیم کنید و هزینه دقیق تومانی را بدون کارمزد پنهان ببینید.
          </p>
        </div>

        {/* Quick Model Selector Pills */}
        <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/5">
          {Object.entries(MODEL_RATES).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setSelectedModel(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 btn-press ${
                selectedModel === key
                  ? "bg-white text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {info.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Sliders Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-white">توکن‌های ورودی (پرامپت و کانتکست):</span>
              <span className="font-mono text-sky-400 font-bold">
                {promptTokens.toLocaleString("fa-IR")} توکن (~{(promptTokens * 0.75).toLocaleString("fa-IR")} کلمه)
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="200000"
              step="1000"
              value={promptTokens}
              onChange={(e) => setPromptTokens(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-400"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>۱,۰۰۰ توکن</span>
              <span>۲۰۰,۰۰۰ توکن</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-white">توکن‌های خروجی (پاسخ مدل):</span>
              <span className="font-mono text-emerald-400 font-bold">
                {completionTokens.toLocaleString("fa-IR")} توکن (~{(completionTokens * 0.75).toLocaleString("fa-IR")} کلمه)
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="20000"
              step="500"
              value={completionTokens}
              onChange={(e) => setCompletionTokens(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-emerald-400"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>۵۰۰ توکن</span>
              <span>۲۰,۰۰۰ توکن</span>
            </div>
          </div>

          {/* Rate Breakdown Table */}
          <div className="rounded-xl border border-white/[0.06] bg-[#080b10] p-4 text-xs text-slate-400 space-y-2">
            <div className="flex justify-between pb-1 border-b border-white/[0.06]">
              <span>تأمین‌کننده رسمی مدل:</span>
              <span className="font-semibold text-white">{modelInfo.provider}</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-white/[0.06]">
              <span>نرخ هر ۱,۰۰۰ توکن ورودی:</span>
              <span className="font-mono text-sky-400 font-bold">{modelInfo.inputToman.toLocaleString("fa-IR")} تومان</span>
            </div>
            <div className="flex justify-between">
              <span>نرخ هر ۱,۰۰۰ توکن خروجی:</span>
              <span className="font-mono text-emerald-400 font-bold">{modelInfo.outputToman.toLocaleString("fa-IR")} تومان</span>
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#090d14] p-6 shadow-inner">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">هزینه کل پردازش برآورد شده:</span>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                بدون قطعی و تحریم
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {costToman.toLocaleString("fa-IR")}{" "}
                <span className="text-sm font-normal text-slate-400">تومان</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                معادل تقریباً <span className="text-emerald-400 font-semibold">{costUsdt} USDT</span> (تتر)
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-2">
              با شارژ کیف پول خود به مبلغ دلخواه، به صورت خودکار توکن‌های مصرفی کسر می‌شوند و پس از پایان هر درخواست گزارش دقیق کسر موجودی به صورت اتمیک ثبت خواهد شد.
            </p>
          </div>

          <div className="pt-6">
            <button
              onClick={onOpenWallet}
              className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-slate-950 hover:bg-slate-200 transition-all shadow-md"
            >
              <span>شارژ فوری کیف پول و شروع استفاده</span>
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
