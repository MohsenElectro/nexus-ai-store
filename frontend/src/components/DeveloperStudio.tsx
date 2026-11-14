"use client";

import React, { useState } from "react";
import {
  Terminal,
  Key,
  Copy,
  Check,
  Code2,
  RefreshCw,
  Zap,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiKey, getApiBase } from "@/lib/api";

interface DeveloperStudioProps {
  apiKeys: ApiKey[];
  onRefreshKeys: () => void;
  onOpenWallet: () => void;
}

export default function DeveloperStudio({
  apiKeys,
  onRefreshKeys,
  onOpenWallet,
}: DeveloperStudioProps) {
  const [selectedLang, setSelectedLang] = useState<"python" | "node" | "curl" | "cursor">("python");
  const [playgroundModel, setPlaygroundModel] = useState("gemini-1.5-flash");
  const [playgroundPrompt, setPlaygroundPrompt] = useState("سلام! یک تابع پایتون برای پردازش متن بنویس.");
  const [playgroundResponse, setPlaygroundResponse] = useState("");
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [wrapCode, setWrapCode] = useState(true);

  const apiBase = getApiBase();
  const proxyBaseUrl = apiBase.replace(/\/api\/v1\/?$/, "/v1");

  const snippets = {
    python: `from openai import OpenAI

client = OpenAI(
    api_key="${generatedKey || "sk-live-your-nexus-key"}",
    base_url="${proxyBaseUrl}"
)

response = client.chat.completions.create(
    model="${playgroundModel}",
    messages=[{"role": "user", "content": "سلام!"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")`,
    node: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "${generatedKey || "sk-live-your-nexus-key"}",
  baseURL: "${proxyBaseUrl}",
});

const stream = await client.chat.completions.create({
  model: "${playgroundModel}",
  messages: [{ role: "user", content: "سلام!" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`,
    curl: `curl ${proxyBaseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${generatedKey || "sk-live-your-nexus-key"}" \\
  -d '{
    "model": "${playgroundModel}",
    "messages": [{"role": "user", "content": "سلام!"}]
  }'`,
    cursor: `# In Cursor IDE Settings -> Models -> OpenAI API Key:
# Paste your Nexus Key: ${generatedKey || "sk-live-your-nexus-key"}
# Override OpenAI Base URL: ${proxyBaseUrl}

# Models available:
# gpt-4o, claude-3-5-sonnet, gemini-1.5-pro, deepseek-chat`,
  };

  async function handleCreateKey() {
    try {
      const key = await api.createApiKey(`کلید ${new Date().toLocaleTimeString("fa-IR")}`);
      setGeneratedKey(key.api_key || "");
      toast.success("کلید API جدید با موفقیت تولید شد");
      onRefreshKeys();
    } catch (err: any) {
      toast.error(err.message || "خطا در ساخت کلید");
    }
  }

  async function runPlayground() {
    const keyToUse = generatedKey || apiKeys[0]?.prefix || "sk-live-test";
    setPlaygroundLoading(true);
    setPlaygroundResponse("");

    try {
      const res = await fetch(`${proxyBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keyToUse}`,
        },
        body: JSON.stringify({
          model: playgroundModel,
          messages: [{ role: "user", content: playgroundPrompt }],
          stream: true,
        }),
      });

      if (!res.ok) {
        throw new Error("پاسخی از مدل دریافت نشد یا موجودی کافی نیست");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                full += parsed.choices?.[0]?.delta?.content || "";
                setPlaygroundResponse(full);
              } catch {}
            }
          }
        }
      }
      toast.success("پاسخ استریم با موفقیت دریافت شد");
    } catch (err: any) {
      setPlaygroundResponse(`خطا: ${err.message}`);
      toast.error(err.message || "خطا در اتصال به پراکسی");
    } finally {
      setPlaygroundLoading(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-8 my-3 sm:my-8 min-w-0">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 sm:p-8 min-w-0">
        <div className="flex flex-col justify-between gap-4 sm:gap-6 sm:flex-row sm:items-center min-w-0">
          <div className="space-y-2 min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] sm:text-xs font-semibold text-emerald-400">
              <Terminal className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">پراکسی یکپارچه سازگار با استانداردهای OpenAI</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-white">
              هاب توکن و API برای توسعه‌دهندگان
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              تنها با تغییر <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-sky-300">base_url</code> در پروژه‌های فعلی‌تان، مستقیماً به مدل‌های برتر دنیا با پرداخت شتابی و بدون فیلتر متصل شوید.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={handleCreateKey}
              className="btn-press flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-white px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs font-bold text-slate-950 shadow hover:bg-slate-200 transition-all"
            >
              <Key className="h-4 w-4 text-slate-800 shrink-0" />
              <span>ساخت کلید API</span>
            </button>
            <button
              onClick={onOpenWallet}
              className="btn-press flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-white/10 bg-slate-900 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-semibold text-white hover:bg-slate-800 hover:border-white/20 transition-all"
            >
              <span>شارژ اعتبار توکن</span>
            </button>
          </div>
        </div>

        {/* Generated Key Alert */}
        {generatedKey && (
          <div className="mt-5 sm:mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 sm:p-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <span className="text-xs font-bold text-emerald-400 block">
                  کلید API شما آماده است (فقط یک‌بار نمایش داده می‌شود):
                </span>
                <code
                  dir="ltr"
                  className="mt-1.5 block font-mono text-xs sm:text-sm text-white select-all break-all rounded-lg bg-black/40 p-2 border border-white/10 text-left"
                >
                  {generatedKey}
                </code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  setCopiedKey(true);
                  toast.success("کلید در کلیپ‌بورد کپی شد");
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="btn-press flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shrink-0"
              >
                {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>کپی کلید</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Keys Strip */}
        <div className="mt-6 sm:mt-8 border-t border-white/[0.06] pt-5 sm:pt-6 min-w-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            کلیدهای فعال من ({apiKeys.length})
          </h4>
          {apiKeys.length === 0 ? (
            <p className="text-xs text-slate-500 leading-relaxed">
              هنوز کلید فعالی ایجاد نکرده‌اید. با کلیک روی دکمه بالا اولین کلید خود را بسازید.
            </p>
          ) : (
            <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
              {apiKeys.map((k, kIdx) => (
                <div
                  key={`apikey-${k.id}-${kIdx}`}
                  className="min-w-0 rounded-xl border border-white/[0.06] bg-[#090c12] p-3.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-white truncate">{k.name}</div>
                    <div dir="ltr" className="font-mono text-xs text-sky-400 truncate text-left">
                      {k.prefix}...
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-[11px] text-emerald-400 font-medium">
                      {k.total_spent_toman.toLocaleString("fa-IR")} تومان
                    </span>
                    <span className="block text-[10px] text-slate-500">مصرف شده</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Code Studio & Stream Playground */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 min-w-0">
        {/* Code Snippets Console */}
        <div className="min-w-0 w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Code2 className="h-4 w-4 text-sky-400 shrink-0" />
              <h3 className="text-sm font-bold text-white truncate">نمونه کد و راهنمای اتصال سریع</h3>
            </div>

            {/* Language Switcher Tabs */}
            <div
              dir="ltr"
              className="grid grid-cols-4 sm:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/5 w-full sm:w-auto shrink-0"
            >
              {(["python", "node", "curl", "cursor"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-center transition-all btn-press ${
                    selectedLang === lang
                      ? "bg-white text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Copy Base URL Bar for Mobile & Mini App */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] text-slate-400">آدرس پراکسی (Base URL):</span>
              <code
                dir="ltr"
                className="block truncate font-mono text-[11px] text-sky-300 text-left select-all"
              >
                {proxyBaseUrl}
              </code>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(proxyBaseUrl);
                setCopiedEndpoint(true);
                toast.success("آدرس Base URL کپی شد");
                setTimeout(() => setCopiedEndpoint(false), 2000);
              }}
              className="btn-press shrink-0 flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/25"
            >
              {copiedEndpoint ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>کپی آدرس</span>
            </button>
          </div>

          {/* Code Block with Dedicated Toolbar (Never overflows or clips in RTL/Mini-App) */}
          <div
            className="min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#07090e] font-mono text-xs text-slate-300"
            dir="ltr"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0b0f17] px-3 py-2">
              <span className="text-[11px] text-slate-400 truncate">
                {selectedLang === "python"
                  ? "main.py"
                  : selectedLang === "node"
                  ? "index.mjs"
                  : selectedLang === "curl"
                  ? "terminal.sh"
                  : "cursor-settings.txt"}
              </span>

              <div className="flex items-center gap-1.5 shrink-0" dir="rtl">
                <button
                  type="button"
                  onClick={() => setWrapCode((prev) => !prev)}
                  className="btn-press rounded-lg border border-white/10 bg-slate-900 px-2 py-1 font-sans text-[10px] font-medium text-slate-300 hover:text-white"
                >
                  {wrapCode ? "اسکرول افقی" : "نمایش کامل"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(snippets[selectedLang]);
                    setCopiedSnippet(true);
                    toast.success("کد در کلیپ‌بورد کپی شد");
                    setTimeout(() => setCopiedSnippet(false), 2000);
                  }}
                  className="btn-press flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 font-sans text-[11px] font-semibold text-white hover:bg-slate-700"
                  title="کپی قطعه کد"
                >
                  {copiedSnippet ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-sky-400" />
                  )}
                  <span>{copiedSnippet ? "کپی شد" : "کپی کد"}</span>
                </button>
              </div>
            </div>

            <pre
              className={`p-3.5 sm:p-4 text-[11px] sm:text-xs text-emerald-400 leading-relaxed text-left max-w-full ${
                wrapCode
                  ? "whitespace-pre-wrap [overflow-wrap:anywhere]"
                  : "whitespace-pre overflow-x-auto"
              }`}
            >
              {snippets[selectedLang]}
            </pre>
          </div>
        </div>

        {/* Live Stream Playground */}
        <div className="min-w-0 w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="h-4 w-4 text-sky-400 shrink-0" />
              <h3 className="text-sm font-bold text-white truncate">زمین بازی و تست زنده استریم</h3>
            </div>
            <span className="shrink-0 rounded bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300 font-mono border border-sky-500/20">
              SSE Real-Time
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400">انتخاب مدل هوش مصنوعی:</label>
              <select
                value={playgroundModel}
                onChange={(e) => setPlaygroundModel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (فوق‌العاده سریع)</option>
                <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (کانتکست ۱ میلیون)</option>
                <option value="deepseek-chat">DeepSeek Chat V3 / R1 (مقرون‌به‌صرفه)</option>
                <option value="gpt-4o">OpenAI GPT-4o (استاندارد)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (بهترین برای کد)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400">متن ورودی (Prompt):</label>
              <textarea
                rows={3}
                value={playgroundPrompt}
                onChange={(e) => setPlaygroundPrompt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] p-3 text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <button
              onClick={runPlayground}
              disabled={playgroundLoading}
              className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-slate-950 shadow hover:bg-slate-200 disabled:opacity-50 transition-all"
            >
              {playgroundLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-sky-600" />}
              <span>ارسال درخواست استریم و محاسبه زنده هزینه</span>
            </button>

            {playgroundResponse && (
              <div className="mt-3 min-w-0 rounded-xl border border-emerald-500/20 bg-[#080b10] p-3.5 font-mono text-xs text-emerald-400">
                <span className="block text-[10px] text-slate-500 mb-1 font-sans">پاسخ زنده استریم:</span>
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{playgroundResponse}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
