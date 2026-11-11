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
    <div className="space-y-6 sm:space-y-8 my-4 sm:my-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Terminal className="h-3.5 w-3.5" />
              <span>پراکسی یکپارچه سازگار با استانداردهای OpenAI</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              هاب توکن و API برای توسعه‌دهندگان
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              تنها با تغییر `base_url` در پروژه‌های فعلی‌تان، مستقیماً به مدل‌های برتر دنیا با پرداخت شتابی و بدون فیلتر متصل شوید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCreateKey}
              className="btn-press flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-slate-950 shadow hover:bg-slate-200 transition-all"
            >
              <Key className="h-4 w-4 text-slate-800" />
              <span>ساخت کلید API جدید</span>
            </button>
            <button
              onClick={onOpenWallet}
              className="btn-press flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-xs font-semibold text-white hover:bg-slate-800 hover:border-white/20 transition-all"
            >
              <span>شارژ اعتبار توکن</span>
            </button>
          </div>
        </div>

        {/* Generated Key Alert */}
        {generatedKey && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-emerald-400">
                  کلید API شما آماده است (فقط یک‌بار نمایش داده می‌شود):
                </span>
                <code className="mt-1 block font-mono text-sm text-white select-all">
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
                className="btn-press flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>کپی کلید</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Keys Strip */}
        <div className="mt-8 border-t border-white/[0.06] pt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            کلیدهای فعال من ({apiKeys.length})
          </h4>
          {apiKeys.length === 0 ? (
            <p className="text-xs text-slate-500">هنوز کلید فعالی ایجاد نکرده‌اید. با کلیک روی دکمه بالا اولین کلید خود را بسازید.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {apiKeys.map((k, kIdx) => (
                <div
                  key={`apikey-${k.id}-${kIdx}`}
                  className="rounded-xl border border-white/[0.06] bg-[#090c12] p-3.5 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-xs text-white">{k.name}</div>
                    <div className="font-mono text-xs text-sky-400">{k.prefix}...</div>
                  </div>
                  <div className="text-left">
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
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Code Snippets Console */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-sky-400 shrink-0" />
              <h3 className="text-sm font-bold text-white">نمونه کد و راهنمای اتصال سریع</h3>
            </div>

            {/* Language Switcher Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-slate-900/90 p-1 rounded-xl border border-white/5 shrink-0 self-start sm:self-auto max-w-full">
              {(["python", "node", "curl", "cursor"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-mono transition-all btn-press shrink-0 ${
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

          <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#07090e] p-4 font-mono text-xs text-slate-300" dir="ltr">
            <button
              onClick={() => {
                navigator.clipboard.writeText(snippets[selectedLang]);
                toast.success("کد در کلیپ‌بورد کپی شد");
              }}
              className="btn-press absolute right-3 top-3 rounded-lg border border-white/10 bg-slate-800 p-1.5 text-slate-400 hover:text-white"
              title="کپی قطعه کد"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <pre className="overflow-x-auto text-emerald-400 leading-relaxed">
              {snippets[selectedLang]}
            </pre>
          </div>
        </div>

        {/* Live Stream Playground */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">زمین بازی و تست زنده استریم</h3>
            </div>
            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300 font-mono border border-sky-500/20">
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
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-[#080b10] p-3.5 font-mono text-xs text-emerald-400">
                <span className="block text-[10px] text-slate-500 mb-1 font-sans">پاسخ زنده استریم:</span>
                <p className="whitespace-pre-wrap">{playgroundResponse}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
