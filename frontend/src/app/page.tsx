"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  CreditCard,
  Key,
  Copy,
  Check,
  Terminal,
  Layers,
  ShoppingBag,
  ExternalLink,
  ChevronLeft,
  AlertCircle,
  Code2,
  Cpu,
  Coins,
  RefreshCw,
  Flame,
  Search,
  CheckCircle2,
  HelpCircle,
  Lock,
  Server,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { api, Product, Wallet as WalletType, Order, ApiKey, getApiBase } from "@/lib/api";
import ModernHero from "@/components/ModernHero";
import FeaturedSpotlight from "@/components/FeaturedSpotlight";
import BentoProductGrid from "@/components/BentoProductGrid";
import DeveloperStudio from "@/components/DeveloperStudio";
import ComparisonMatrix from "@/components/ComparisonMatrix";
import LiveTicker from "@/components/LiveTicker";
import TokenCostCalculator from "@/components/TokenCostCalculator";
import TaglineReveal from "@/components/TaglineReveal";
import HowItWorksAndFaq from "@/components/HowItWorksAndFaq";
import AdminDashboard from "@/components/AdminDashboard";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [topupAmount, setTopupAmount] = useState<number>(200000);
  const [selectedGateway, setSelectedGateway] = useState<string>("ZARINPAL");
  const [topupStatus, setTopupStatus] = useState<string>("");

  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetEmail, setTargetEmail] = useState<string>("");
  const [orderProcessing, setOrderProcessing] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<Order | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"STORE" | "DEVELOPER" | "ORDERS" | "ADMIN">("STORE");

  const handleTabChange = (tab: "STORE" | "DEVELOPER" | "ORDERS" | "ADMIN") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  useEffect(() => {
    initData();
  }, []);

  async function initData() {
    setLoading(true);
    try {
      const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
      const tgUser = tg?.initDataUnsafe?.user;
      const storedTgId = typeof window !== "undefined" ? localStorage.getItem("ai_nexus_tg_id") : null;
      let currentToken = typeof window !== "undefined" ? localStorage.getItem("ai_nexus_token") : null;

      // 1. Synchronized Telegram WebApp Authentication (Guarantees individual wallet per user)
      if (tg && tg.initData && tgUser?.id) {
        // If switched Telegram accounts or token missing
        if (!currentToken || storedTgId !== String(tgUser.id)) {
          try {
            const authRes = await api.authTelegramWebapp(tg.initData, tgUser);
            currentToken = authRes.access_token;
            localStorage.setItem("ai_nexus_tg_id", String(tgUser.id));
          } catch (e) {
            console.error("Telegram WebApp auth error:", e);
          }
        }
      } else if (!currentToken) {
        // 2. Standalone browser fallback (Non-Telegram)
        try {
          const rand = Math.floor(1000 + Math.random() * 9000);
          await api.register({
            phone_number: `0912000${rand}`,
            password: "DemoPassword123!",
            full_name: "کاربر وب‌سایت",
          });
          const loginRes = await api.login(`0912000${rand}`, "DemoPassword123!");
          currentToken = loginRes.access_token;
        } catch {}
      }

      const [prods, wal, ords, keys] = await Promise.all([
        api.getProducts().catch(() => []),
        api.getWallet().catch(() => null),
        api.getMyOrders().catch(() => []),
        api.getApiKeys().catch(() => []),
      ]);

      setProducts(prods);
      setWallet(wal);
      setOrders(ords);
      setApiKeys(keys);
    } finally {
      setLoading(false);
    }
  }

  async function handleTopup() {
    if (topupAmount <= 0) {
      toast.error("لطفاً یک مبلغ معتبر وارد نمایید.");
      return;
    }
    setTopupStatus("در حال اتصال به درگاه پرداخت...");
    try {
      const res = await api.topupWallet(topupAmount, selectedGateway);
      if (res.payment_url) {
        setTopupStatus("در حال شبیه‌سازی تایید تراکنش درگاه پرداخت شتاب...");
        if (res.authority) {
          const apiBase = getApiBase();
          const verifyRes = await fetch(
            `${apiBase}/payments/verify/zarinpal?Authority=${res.authority}&Status=OK`
          );
          const vData = await verifyRes.json();
          if (vData.success) {
            toast.success(
              `کیف پول با موفقیت به مبلغ ${topupAmount.toLocaleString("fa-IR")} تومان شارژ شد.`
            );
            const updatedWallet = await api.getWallet();
            setWallet(updatedWallet);
            setShowWalletModal(false);
            setTopupStatus("");
          }
        }
      } else if (res.deposit_address) {
        toast.info("آدرس واریز تتر TRC-20 ایجاد شد.");
        setTopupStatus(`آدرس ولت ترون (TRC-20): ${res.deposit_address}`);
      }
    } catch (err: any) {
      toast.error(err.message || "خطا در برقراری ارتباط با درگاه");
      setTopupStatus(err.message || "خطا در اتصال");
    }
  }

  async function handleBuyProduct() {
    if (!selectedProduct) return;
    setOrderProcessing(true);
    try {
      const order = await api.createOrder(selectedProduct.id, targetEmail);
      setOrderResult(order);
      toast.success("سفارش با موفقیت ثبت و تحویل داده شد!");
      const [updatedWallet, updatedOrders] = await Promise.all([
        api.getWallet(),
        api.getMyOrders(),
      ]);
      setWallet(updatedWallet);
      setOrders(updatedOrders);
    } catch (err: any) {
      toast.error(err.message || "خطا در ثبت سفارش");
    } finally {
      setOrderProcessing(false);
    }
  }

  async function handleDirectDeficitPay(deficitAmount: number) {
    if (!selectedProduct) return;
    setOrderProcessing(true);
    setTopupStatus("در حال اتصال مستقیم به درگاه پرداخت شتاب برای تکمیل خرید...");
    try {
      const res = await api.topupWallet(
        deficitAmount,
        selectedGateway,
        selectedProduct.id,
        targetEmail
      );
      if (res.payment_url) {
        setTopupStatus("در حال شبیه‌سازی تایید تراکنش بانکی و تحویل آنی لایسنس...");
        if (res.authority) {
          const apiBase = getApiBase();
          const verifyRes = await fetch(
            `${apiBase}/payments/verify/zarinpal?Authority=${res.authority}&Status=OK`
          );
          const vData = await verifyRes.json();
          if (vData.success) {
            toast.success("پرداخت کسری تایید شد و لایسنس شما به صورت آنی تحویل گردید!");
            const [updatedWallet, updatedOrders] = await Promise.all([
              api.getWallet(),
              api.getMyOrders(),
            ]);
            setWallet(updatedWallet);
            setOrders(updatedOrders);
            if (vData.delivered_data) {
              setOrderResult({
                id: updatedOrders[0]?.id || Date.now(),
                total_toman: selectedProduct.price_toman,
                total_usdt: selectedProduct.price_usdt,
                status: "COMPLETED",
                items: [
                  {
                    id: 1,
                    product_id: selectedProduct.id,
                    quantity: 1,
                    unit_price_toman: selectedProduct.price_toman,
                    delivered_data: vData.delivered_data,
                  },
                ],
                created_at: new Date().toISOString(),
              });
            } else if (updatedOrders.length > 0) {
              setOrderResult(updatedOrders[0]);
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "خطا در پرداخت مستقیم کسری");
    } finally {
      setOrderProcessing(false);
      setTopupStatus("");
    }
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 bg-subtle-grid pb-24 selection:bg-sky-500/30 selection:text-white">
      {/* 1. Header Navigation Bar (Responsive & Mobile/Desktop Mini-App Optimized) */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0c1017]/95 backdrop-blur-xl shadow-lg">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <nav
            aria-label="منوی اصلی"
            className="flex items-center justify-between py-2.5 sm:py-3"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white text-slate-950 font-black shadow-md">
                AI
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold tracking-tight text-white sm:text-base">
                    AI Nexus Store
                  </span>
                </div>
                <span className="hidden text-[11px] text-slate-400 lg:inline">
                  مرجع تخصصی اشتراک‌ها و هاب توکن هوش مصنوعی
                </span>
              </div>
            </div>

            {/* Navigation Links for Large Desktop (lg and up) */}
            <div className="hidden items-center gap-1 lg:flex bg-[#06080d] p-1 rounded-xl border border-white/5">
              <button
                onClick={() => handleTabChange("STORE")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all btn-press ${
                  activeTab === "STORE"
                    ? "bg-white text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                فروشگاه و آفرها
              </button>
              <button
                onClick={() => handleTabChange("DEVELOPER")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all btn-press ${
                  activeTab === "DEVELOPER"
                    ? "bg-white text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                هاب توکن و API
              </button>
              <button
                onClick={() => handleTabChange("ORDERS")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all btn-press ${
                  activeTab === "ORDERS"
                    ? "bg-white text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                سفارش‌های من ({orders.length})
              </button>
              <button
                onClick={() => handleTabChange("ADMIN")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all btn-press ${
                  activeTab === "ADMIN"
                    ? "border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold"
                    : "text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                مدیریت و انبارداری
              </button>
            </div>

            {/* Wallet Balance Pill */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWalletModal(true)}
                className="btn-press flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-xs font-medium text-white hover:border-white/20 hover:bg-slate-800 shadow-sm transition-all sm:gap-2 sm:px-3.5 sm:py-2"
              >
                <CreditCard className="h-3.5 w-3.5 text-sky-400 sm:h-4 sm:w-4 shrink-0" />
                <span className="text-[11px] sm:text-xs whitespace-nowrap">
                  موجودی: {wallet ? wallet.balance_toman.toLocaleString("fa-IR") : "۰"} ت
                </span>
                <span className="rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-300 border border-sky-500/30 sm:px-2 sm:text-[10px] shrink-0">
                  + شارژ
                </span>
              </button>
            </div>
          </nav>
        </div>

        {/* Navigation Sub-Bar (Mobile and Telegram Desktop < lg) */}
        <div className="border-t border-white/5 bg-[#06080d]/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-around sm:justify-center sm:gap-2 overflow-x-auto no-scrollbar px-2 py-1.5">
            <button
              onClick={() => handleTabChange("STORE")}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-all btn-press ${
                activeTab === "STORE"
                  ? "bg-white text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🛍 فروشگاه و آفرها
            </button>
            <button
              onClick={() => handleTabChange("DEVELOPER")}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-all btn-press ${
                activeTab === "DEVELOPER"
                  ? "bg-white text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ هاب توکن
            </button>
            <button
              onClick={() => handleTabChange("ORDERS")}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-all btn-press ${
                activeTab === "ORDERS"
                  ? "bg-white text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📦 سفارش‌ها ({orders.length})
            </button>
            <button
              onClick={() => handleTabChange("ADMIN")}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-all btn-press ${
                activeTab === "ADMIN"
                  ? "border border-amber-500/40 bg-amber-500/20 text-amber-300 font-bold"
                  : "text-amber-400/80 hover:text-amber-300"
              }`}
            >
              👑 انبار و ادمین
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {/* Live Marquee Ticker */}
        <LiveTicker />

        {activeTab === "STORE" && (
          <div>
            {/* 1. Modern High-Craft Hero */}
            <ModernHero
              products={products}
              onSelectProduct={(p) => {
                setSelectedProduct(p);
                setShowOrderModal(true);
                setOrderResult(null);
              }}
              onOpenDeveloperTab={() => handleTabChange("DEVELOPER")}
              onOpenCalculator={() => {
                const el = document.getElementById("token-calculator-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            />

            {/* 2. Premier Featured Spotlight (Replaced erratic FanShowcase with clean, dignified 4-card showroom) */}
            {products.length > 0 && (
              <FeaturedSpotlight
                products={products}
                onSelectProduct={(p) => {
                  setSelectedProduct(p);
                  setShowOrderModal(true);
                  setOrderResult(null);
                }}
              />
            )}

            {/* 3. High-End Bento Product Grid with Search & Categories */}
            <BentoProductGrid
              products={products}
              onSelectProduct={(p) => {
                setSelectedProduct(p);
                setShowOrderModal(true);
                setOrderResult(null);
              }}
            />

            {/* 4. Large-Type Tagline Reveal Section */}
            <TaglineReveal />

            {/* 5. Live Token Cost Calculator */}
            <div id="token-calculator-section">
              <TokenCostCalculator onOpenWallet={() => setShowWalletModal(true)} />
            </div>

            {/* 6. Comparison Matrix: Why AI Nexus vs Black Market Channels vs Direct Card */}
            <ComparisonMatrix />

            {/* 7. How It Works & Objections FAQ */}
            <HowItWorksAndFaq />
          </div>
        )}

        {/* 2. Developer & Token Hub Tab */}
        {activeTab === "DEVELOPER" && (
          <DeveloperStudio
            apiKeys={apiKeys}
            onRefreshKeys={async () => {
              const keys = await api.getApiKeys();
              setApiKeys(keys);
            }}
            onOpenWallet={() => setShowWalletModal(true)}
          />
        )}

        {/* 3. Orders Tab */}
        {activeTab === "ORDERS" && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white">
              تاریخچه خریدهای من و اطلاعات لایسنس
            </h2>
            {orders.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500">هنوز سفارشی ثبت نکرده‌اید.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {orders.map((ord, ordIdx) => (
                  <div
                    key={`my-order-${ord.id}-${ordIdx}`}
                    className="rounded-xl border border-white/[0.06] bg-[#080b10] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                      <div>
                        <span className="font-semibold text-white text-xs">سفارش #{ord.id}</span>
                        <span className="mr-3 text-xs text-slate-500">
                          {new Date(ord.created_at).toLocaleDateString("fa-IR")}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          ord.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {ord.status === "COMPLETED" ? "تکمیل و تحویل داده شد" : "در انتظار فعال‌سازی با کارت"}
                      </span>
                    </div>

                    <div className="mt-3">
                      {ord.items.map((it, itIdx) => (
                        <div key={`order-item-${it.id}-${itIdx}`}>
                          <div className="text-xs text-slate-400">
                            مبلغ پرداختی: {it.unit_price_toman.toLocaleString("fa-IR")} تومان
                          </div>
                          {it.delivered_data && (
                            <div className="mt-2.5 rounded-lg border border-sky-500/20 bg-sky-950/20 p-3">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                                اطلاعات اختصاصی اکانت / لایسنس شما (رمزنگاری AES-256):
                              </span>
                              <pre className="mt-1 font-mono text-xs text-white whitespace-pre-wrap select-all">
                                {it.delivered_data}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Admin Tab */}
        {activeTab === "ADMIN" && (
          <AdminDashboard products={products} onRefreshProducts={initData} />
        )}
      </main>

      {/* Semantic Footer */}
      <footer className="mt-24 border-t border-white/[0.08] bg-[#0c1017] py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-950 font-black shadow-md">
              AI
            </div>
            <div>
              <p className="font-semibold text-white">AI Nexus Store © ۱۴۰۵</p>
              <p className="text-[11px] text-slate-500">زیرساخت اختصاصی توزیع اشتراک و توکن‌های هوش مصنوعی</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              وضعیت سرورها: پایدار و فعال
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="h-3.5 w-3.5 text-sky-400" />
              رمزنگاری SSL ۲۵۶ بیتی
            </span>
          </div>
        </div>
      </footer>

      {/* Wallet Topup Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">افزایش موجودی کیف پول</h3>
            <p className="mt-1 text-xs text-slate-400">
              موجودی فعلی: {wallet ? wallet.balance_toman.toLocaleString("fa-IR") : "۰"} تومان
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs text-slate-400">انتخاب مبالغ پیشنهادی سریع:</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {[50000, 100000, 250000, 500000, 1000000, 2000000].map((amt) => (
                    <button
                      key={`topup-amt-${amt}`}
                      onClick={() => setTopupAmount(amt)}
                      className={`btn-press rounded-lg border py-2 text-xs font-semibold transition-all ${
                        topupAmount === amt
                          ? "border-sky-500 bg-sky-500/10 text-sky-300 font-bold"
                          : "border-white/10 hover:bg-slate-800 text-slate-400"
                      }`}
                    >
                      {amt.toLocaleString("fa-IR")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">یا ورود مبلغ دلخواه (تومان):</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min={1000}
                    step={5000}
                    placeholder="مبلغ دلخواه را وارد کنید..."
                    value={topupAmount || ""}
                    onChange={(e) => setTopupAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500">تومان</span>
                </div>
                {topupAmount > 0 && (
                  <p className="mt-1 text-[11px] text-sky-400">
                    مبلغ قابل پرداخت: {topupAmount.toLocaleString("fa-IR")} تومان
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400">درگاه پرداخت:</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedGateway("ZARINPAL")}
                    className={`btn-press flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold ${
                      selectedGateway === "ZARINPAL"
                        ? "border-sky-500 bg-sky-500/10 text-sky-300 font-bold"
                        : "border-white/10 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    شتاب (زرین‌پال)
                  </button>
                  <button
                    onClick={() => setSelectedGateway("CRYPTOMUS")}
                    className={`btn-press flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold ${
                      selectedGateway === "CRYPTOMUS"
                        ? "border-sky-500 bg-sky-500/10 text-sky-300 font-bold"
                        : "border-white/10 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Coins className="h-4 w-4" />
                    ارز دیجیتال (تتر)
                  </button>
                </div>
              </div>

              {topupStatus && (
                <div className="rounded-lg border border-sky-500/20 bg-sky-950/30 p-3 text-xs text-sky-300">
                  {topupStatus}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleTopup}
                  disabled={topupAmount <= 0}
                  className="btn-press flex-1 rounded-xl bg-white py-2.5 text-xs font-bold text-slate-950 hover:bg-slate-200 disabled:opacity-50 shadow transition-all"
                >
                  تایید و پرداخت {topupAmount > 0 ? `(${topupAmount.toLocaleString("fa-IR")} تومان)` : ""}
                </button>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="btn-press rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Purchase Modal */}
      {showOrderModal && selectedProduct && (() => {
        const currentBal = wallet?.balance_toman || 0;
        const prodPrice = selectedProduct.price_toman;
        const isInstant = selectedProduct.fulfillment_type === "INSTANT_VAULT";
        const isOutOfStock = isInstant && (selectedProduct.inventory_count <= 0);
        const hasEnoughBalance = currentBal >= prodPrice;
        const deficit = Math.max(0, prodPrice - currentBal);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white">تایید خرید: {selectedProduct.title}</h3>

              {!orderResult ? (
                <div className="mt-4 space-y-4">
                  {/* Stock Alert */}
                  {isOutOfStock ? (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>موجودی انبار این پکیج در حال حاضر به پایان رسیده است. به زودی توسط مدیریت شارژ خواهد شد.</span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/[0.08] bg-[#080b10] p-3.5 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">مبلغ سفارش:</span>
                        <span className="font-bold text-white">
                          {prodPrice.toLocaleString("fa-IR")} تومان
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">موجودی کیف پول شما:</span>
                        <span className={`font-semibold ${hasEnoughBalance ? "text-emerald-400" : "text-amber-400"}`}>
                          {currentBal.toLocaleString("fa-IR")} تومان
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-2">
                        <span className="text-slate-400">وضعیت موجودی در انبار:</span>
                        <span className="font-semibold text-sky-400">
                          {isInstant
                            ? `${selectedProduct.inventory_count.toLocaleString("fa-IR")} عدد آماده تحویل آنی`
                            : "فعال‌سازی با کارت ارزی"}
                        </span>
                      </div>

                      {!hasEnoughBalance && (
                        <div className="flex justify-between border-t border-amber-500/20 bg-amber-500/10 -mx-3.5 -mb-3.5 p-3 rounded-b-xl text-amber-300 font-bold">
                          <span>کسری موجودی جهت خرید:</span>
                          <span>{deficit.toLocaleString("fa-IR")} تومان</span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedProduct.fulfillment_type === "MANUAL_ACTIVATION" && !isOutOfStock && (
                    <div>
                      <label className="text-xs text-slate-400">
                        ایمیل اکانت شما جهت شارژ مستقیم یا ارسال لینک فمیلی:
                      </label>
                      <input
                        type="email"
                        placeholder="name@example.com"
                        value={targetEmail}
                        onChange={(e) => setTargetEmail(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {topupStatus && (
                    <div className="rounded-lg border border-sky-500/20 bg-sky-950/30 p-3 text-xs text-sky-300">
                      {topupStatus}
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5 pt-2">
                    {hasEnoughBalance ? (
                      <button
                        onClick={handleBuyProduct}
                        disabled={orderProcessing || isOutOfStock}
                        className="btn-press w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        <span>
                          {orderProcessing
                            ? "در حال پردازش و کسر از کیف پول..."
                            : `کسر از موجودی و خرید آنی (${prodPrice.toLocaleString("fa-IR")} تومان)`}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDirectDeficitPay(deficit)}
                        disabled={orderProcessing || isOutOfStock}
                        className="btn-press w-full rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 py-3 text-xs font-extrabold text-slate-950 hover:opacity-90 disabled:opacity-50 shadow-lg shadow-sky-500/15 transition-all flex items-center justify-center gap-2"
                      >
                        <CreditCard className="h-4 w-4 text-slate-900" />
                        <span>
                          {orderProcessing
                            ? "در حال اتصال به درگاه شتاب..."
                            : `💳 پرداخت کسری (${deficit.toLocaleString("fa-IR")} تومان) از شتاب و تحویل فوری`}
                        </span>
                      </button>
                    )}

                    <div className="flex gap-2">
                      {!hasEnoughBalance && (
                        <button
                          onClick={() => {
                            setTopupAmount(deficit);
                            setShowWalletModal(true);
                          }}
                          className="btn-press flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                        >
                          شارژ دلخواه کیف پول
                        </button>
                      )}
                      <button
                        onClick={() => setShowOrderModal(false)}
                        className="btn-press flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                    <h4 className="mt-2 font-bold text-emerald-400 text-sm">خرید با موفقیت تکمیل شد!</h4>
                    <p className="mt-1 text-xs text-slate-400">شماره سفارش: #{orderResult.id}</p>
                  </div>

                  {orderResult.items?.[0]?.delivered_data && (
                    <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4">
                      <span className="text-[11px] font-semibold text-sky-400">اطلاعات اکانت تحویل داده شده (رمزنگاری‌شده):</span>
                      <pre className="mt-2 font-mono text-xs text-white select-all whitespace-pre-wrap p-3 rounded-lg bg-black/40 border border-white/5">
                        {orderResult.items[0].delivered_data}
                      </pre>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowOrderModal(false);
                      setOrderResult(null);
                    }}
                    className="btn-press w-full rounded-xl bg-white py-2.5 text-xs font-bold text-slate-950 hover:bg-slate-200"
                  >
                    متوجه شدم و بستن پنجره
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
