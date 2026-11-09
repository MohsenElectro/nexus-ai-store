"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Database,
  CreditCard,
  Settings,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Plus,
  Coins,
  Send,
  Save,
  Check,
  AlertTriangle,
  UserCheck,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { api, Product, Order } from "@/lib/api";

interface AdminDashboardProps {
  products: Product[];
  onRefreshProducts: () => void;
}

export default function AdminDashboard({ products, onRefreshProducts }: AdminDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<"ORDERS" | "VAULT" | "PRICES" | "TELEGRAM" | "SETTINGS">("ORDERS");
  
  // Stats
  const [stats, setStats] = useState<{
    total_revenue_toman: number;
    total_orders_count: number;
    pending_manual_count: number;
    total_users_count: number;
    active_api_keys_count: number;
    total_vault_items_available: number;
  } | null>(null);

  // Manual Orders
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [adminNotesMap, setAdminNotesMap] = useState<Record<number, string>>({});
  const [fulfillingId, setFulfillingId] = useState<number | null>(null);

  // Batch Vault
  const [selectedProductId, setSelectedProductId] = useState<number>(products[0]?.id || 1);
  const [batchRawText, setBatchRawText] = useState<string>("");
  const [vaultStatus, setVaultStatus] = useState<string>("");
  const [vaultLoading, setVaultLoading] = useState<boolean>(false);

  // Product Editing & Creation
  const [editingPrices, setEditingPrices] = useState<Record<number, { price_toman: number; is_special_offer: boolean; offer_badge: string }>>({});
  const [savedProductId, setSavedProductId] = useState<number | null>(null);
  const [newProd, setNewProd] = useState({
    title: "",
    slug: "",
    category: "SPECIAL_OFFER",
    price_toman: 490000,
    price_usdt: 7.0,
    original_price_toman: 890000,
    is_special_offer: true,
    offer_badge: "🔥 آفر ویژه هوش مصنوعی",
    fulfillment_type: "INSTANT_VAULT" as "INSTANT_VAULT" | "MANUAL_ACTIVATION",
    description: "",
    features: "تحویل آنی | گارانتی کامل ۳۰ روزه | پشتیبانی ۲۴ ساعته",
    inventory_count: 10,
  });
  const [creatingProd, setCreatingProd] = useState<boolean>(false);

  // Telegram Bot Live Simulator
  const [tgMessage, setTgMessage] = useState<string>("");
  const [tgKeyboard, setTgKeyboard] = useState<Array<Array<{ text: string; callback_data?: string; url?: string }>>>([]);
  const [tgInput, setTgInput] = useState<string>("");
  const [tgLoading, setTgLoading] = useState<boolean>(false);

  // Gateway Settings
  const [gatewaySettings, setGatewaySettings] = useState<{
    zarinpal_merchant_id: string;
    zarinpal_sandbox: boolean;
    toman_per_usdt: number;
    crypto_deposit_address: string;
    cardholder_alert_channel: string;
    telegram_bot_username: string;
    telegram_bot_token: string;
  }>({
    zarinpal_merchant_id: "00000000-0000-0000-0000-000000000000",
    zarinpal_sandbox: true,
    toman_per_usdt: 70000,
    crypto_deposit_address: "TQn9Y2khEsLJW1ChVWFMSMeSTow5KaxnSE",
    cardholder_alert_channel: "@cardholder_alerts",
    telegram_bot_username: "AINexusStoreBot",
    telegram_bot_token: "",
  });
  const [settingsStatus, setSettingsStatus] = useState<string>("");
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadAdminData();
    runTelegramSim({ text: "/start" });
  }, []);

  async function runTelegramSim(payload: { text?: string; callback_data?: string }) {
    setTgLoading(true);
    try {
      const res = await api.simulateTelegramBot({
        telegram_id: 77889900,
        username: "nexus_vip_user",
        first_name: "کاربر تست تلگرام",
        ...payload,
      });
      if (res && res.text) {
        setTgMessage(res.text);
        setTgKeyboard(res.reply_markup?.inline_keyboard || []);
      }
    } catch (err: any) {
      toast.error(err.message || "خطا در شبیه‌ساز ربات تلگرام");
    } finally {
      setTgLoading(false);
    }
  }

  async function loadAdminData() {
    try {
      const [st, pend, sett] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getPendingManualOrders().catch(() => []),
        api.getGatewaySettings().catch(() => null),
      ]);
      if (st) setStats(st);
      setPendingOrders(pend);
      if (sett) {
        setGatewaySettings((prev) => ({
          ...prev,
          zarinpal_merchant_id: sett.zarinpal_merchant_id,
          zarinpal_sandbox: sett.zarinpal_sandbox,
          toman_per_usdt: sett.toman_per_usdt,
          crypto_deposit_address: sett.crypto_deposit_address,
          cardholder_alert_channel: sett.cardholder_alert_channel,
          telegram_bot_username: sett.telegram_bot_username || prev.telegram_bot_username,
        }));
      }

      // Initialize price edits
      const pMap: Record<number, any> = {};
      products.forEach((p) => {
        pMap[p.id] = {
          price_toman: p.price_toman,
          is_special_offer: p.is_special_offer,
          offer_badge: p.offer_badge || "",
        };
      });
      setEditingPrices(pMap);
    } catch {}
  }

  async function handleFulfill(orderId: number) {
    setFulfillingId(orderId);
    try {
      const note = adminNotesMap[orderId] || "فعال‌سازی دستی انجام شد.";
      await api.fulfillManualOrder(orderId, note);
      toast.success(`سفارش #${orderId} با موفقیت تایید و تکمیل گردید.`);
      await loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "خطا در تایید سفارش");
    } finally {
      setFulfillingId(null);
    }
  }

  async function handleBatchInject() {
    if (!batchRawText.trim()) {
      toast.error("لطفاً حداقل یک خط اطلاعات اکانت وارد کنید.");
      return;
    }
    setVaultLoading(true);
    setVaultStatus("");
    try {
      const lines = batchRawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      const res = await api.addVaultBatch(selectedProductId, lines);
      toast.success(`${lines.length} اکانت جدید به مخزن رمزنگاری شده اضافه شد.`);
      setVaultStatus(`با موفقیت ${lines.length} اکانت در انبار ذخیره شد! موجودی فعلی: ${res.current_inventory}`);
      setBatchRawText("");
      onRefreshProducts();
      const st = await api.getAdminStats();
      setStats(st);
    } catch (err: any) {
      toast.error(err.message || "خطا در ذخیره‌سازی");
      setVaultStatus(`خطا: ${err.message}`);
    } finally {
      setVaultLoading(false);
    }
  }

  async function handleSaveProduct(prodId: number) {
    const edit = editingPrices[prodId];
    if (!edit) return;
    try {
      await api.patchProduct(prodId, {
        price_toman: Number(edit.price_toman),
        is_special_offer: edit.is_special_offer,
        offer_badge: edit.offer_badge,
      });
      setSavedProductId(prodId);
      toast.success("قیمت و مشخصات محصول با موفقیت بروزرسانی شد.");
      setTimeout(() => setSavedProductId(null), 2000);
      onRefreshProducts();
    } catch (err: any) {
      toast.error(err.message || "خطا در ذخیره تغییرات قیمت");
    }
  }

  async function handleCreateNewProduct() {
    if (!newProd.title.trim() || !newProd.slug.trim()) {
      toast.error("لطفاً عنوان و شناسه لاتین (Slug) محصول را وارد کنید.");
      return;
    }
    setCreatingProd(true);
    try {
      await api.createProduct({
        ...newProd,
        price_toman: Number(newProd.price_toman),
        price_usdt: Number(newProd.price_usdt),
        original_price_toman: Number(newProd.original_price_toman) || undefined,
      });
      toast.success("محصول و آفر جدید با موفقیت به فروشگاه و ربات تلگرام اضافه شد!");
      setNewProd({
        ...newProd,
        title: "",
        slug: "",
        description: "",
      });
      onRefreshProducts();
    } catch (err: any) {
      toast.error(err.message || "خطا در ایجاد محصول جدید");
    } finally {
      setCreatingProd(false);
    }
  }

  async function handleDeleteProduct(prodId: number, title: string) {
    try {
      await api.deleteProduct(prodId);
      toast.success(`محصول «${title}» حذف شد.`);
      onRefreshProducts();
    } catch (err: any) {
      toast.error(err.message || "خطا در حذف محصول");
    }
  }

  async function handleSaveSettings() {
    setSettingsLoading(true);
    setSettingsStatus("");
    try {
      await api.updateGatewaySettings(gatewaySettings);
      toast.success("تنظیمات درگاه‌ها و تسویه ارزی با موفقیت ذخیره گردید.");
      setSettingsStatus("تنظیمات درگاه‌ها و تسویه ارزی با موفقیت در سیستم اعمال شد!");
      setTimeout(() => setSettingsStatus(""), 3000);
    } catch (err: any) {
      toast.error(err.message || "خطا در ذخیره تنظیمات");
      setSettingsStatus(`خطا: ${err.message}`);
    } finally {
      setSettingsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#0c1017] p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>درآمد کل فروشگاه</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {stats ? stats.total_revenue_toman.toLocaleString("fa-IR") : "۰"}
            <span className="mr-1 text-xs font-normal text-slate-500">تومان</span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 shadow-lg">
          <div className="flex items-center justify-between text-amber-300 text-xs">
            <span>صف شارژ دستی (کارت ارزی)</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {stats ? stats.pending_manual_count : 0}
            <span className="mr-1 text-xs font-normal text-amber-300">سفارش منتظر اقدام</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0c1017] p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>موجودی آماده در انبارها (Vault)</span>
            <Database className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {stats ? stats.total_vault_items_available : 0}
            <span className="mr-1 text-xs font-normal text-slate-500">لایسنس رمزنگاری‌شده</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0c1017] p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>کلیدهای API فعال و کاربران</span>
            <UserCheck className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {stats ? stats.active_api_keys_count : 0}
            <span className="mr-1 text-xs font-normal text-slate-500">کلید توکن</span>
          </div>
        </div>
      </div>

      {/* Admin Subtabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-4">
        {[
          { id: "ORDERS", label: `صف سفارش‌های دستی کارت ارزی (${pendingOrders.length})`, icon: Clock },
          { id: "VAULT", label: "تزریق دسته‌ای اکانت به انبار (AES-256)", icon: Database },
          { id: "PRICES", label: "مدیریت محصولات، قیمت‌ها و آفرها", icon: Package },
          { id: "TELEGRAM", label: "🤖 ربات تلگرام فروشگاهی (پیش‌نمایش زنده)", icon: Send },
          { id: "SETTINGS", label: "تنظیمات درگاه پرداخت و توکن ربات", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`btn-press flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeSubTab === tab.id
                  ? "bg-white text-slate-950 font-bold shadow-sm"
                  : "border border-white/[0.08] bg-[#0c1017] text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Subtab 1: Manual Orders Queue */}
      {activeSubTab === "ORDERS" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="text-base font-bold text-white">صف سفارش‌های نیازمند شارژ با کارت ارزی</h3>
              <p className="text-xs text-slate-400">
                این سفارش‌ها پس از تایید پرداخت مشتری ثبت شده‌اند و منتظر فعال‌سازی روی ایمیل خریدار توسط شما یا پارتنرتان هستند.
              </p>
            </div>
            <button
              onClick={loadAdminData}
              className="btn-press flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>بروزرسانی لیست</span>
            </button>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-white/10 p-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 opacity-60" />
              <p className="mt-2 text-sm font-semibold text-white">هیچ سفارش در انتظاری وجود ندارد!</p>
              <p className="mt-1 text-xs text-slate-500">تمامی سفارش‌ها انجام شده‌اند یا به صورت آنی از انبار تحویل گردیده‌اند.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {pendingOrders.map((ord, oIdx) => (
                <div
                  key={`pending-ord-${ord.id}-${oIdx}`}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">سفارش #{ord.id}</span>
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300 font-medium">
                        منتظر فعال‌سازی
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      ثبت: {new Date(ord.created_at).toLocaleTimeString("fa-IR")} - {new Date(ord.created_at).toLocaleDateString("fa-IR")}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-400">ایمیل مقصد مشتری:</span>{" "}
                        <span className="font-mono font-bold text-sky-400 select-all">
                          {ord.target_email || "ثبت نشده"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">یادداشت مشتری:</span>{" "}
                        <span className="text-white">{ord.customer_notes || "بدون یادداشت"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">مبلغ پرداختی:</span>{" "}
                        <span className="font-bold text-white">
                          {ord.total_toman.toLocaleString("fa-IR")} تومان
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400">
                        یادداشت مدیر یا شماره ارجاع ویزاکارت:
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: روی جیمیل فعال شد / لینک فمیلی ارسال گردید"
                        value={adminNotesMap[ord.id] || ""}
                        onChange={(e) =>
                          setAdminNotesMap({ ...adminNotesMap, [ord.id]: e.target.value })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleFulfill(ord.id)}
                      disabled={fulfillingId === ord.id}
                      className="btn-press flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {fulfillingId === ord.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      تایید فعال‌سازی و ارسال به کاربر
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Batch License Ingestion */}
      {activeSubTab === "VAULT" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-xl">
          <h3 className="text-base font-bold text-white">شارژ مخزن لایسنس و اکانت‌ها (AES-256)</h3>
          <p className="mt-1 text-xs text-slate-400">
            در این بخش می‌توانید صدها اکانت آماده را به صورت خط‌به‌خط وارد کنید. سیستم هر خط را با کلید نظامی رمزنگاری کرده و به محض خرید کاربر به صورت آنی تحویل می‌دهد.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">انتخاب محصول مقصد:</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} - قیمت: {p.price_toman.toLocaleString("fa-IR")} تومان ({p.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">
                اطلاعات اکانت‌ها (هر خط یک اکانت یا لایسنس):
              </label>
              <textarea
                rows={6}
                placeholder="user1@domain.com:Password123&#10;user2@domain.com:Password456&#10;sk-license-token-abc-xyz"
                value={batchRawText}
                onChange={(e) => setBatchRawText(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] p-3 font-mono text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            {vaultStatus && (
              <div className="rounded-xl border border-sky-500/20 bg-sky-950/30 p-3 text-xs text-sky-300">
                {vaultStatus}
              </div>
            )}

            <button
              onClick={handleBatchInject}
              disabled={vaultLoading}
              className="btn-press flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-slate-200 disabled:opacity-50"
            >
              {vaultLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 text-slate-800" />}
              رمزنگاری و افزودن به انبار
            </button>
          </div>
        </div>
      )}

      {/* Subtab 3: Product & Price Management */}
      {activeSubTab === "PRICES" && (
        <div className="space-y-6">
          {/* Add New AI Account / Offer Card */}
          <div className="rounded-2xl border border-sky-500/20 bg-[#0c1017] p-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-sky-400" />
              <span>افزودن اکانت یا آفر هوش مصنوعی جدید</span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              محصول جدید بلافاصله هم در سایت و هم در منوی شیشه‌ای ربات تلگرام نمایش داده می‌شود.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">عنوان محصول / آفر:</label>
                <input
                  type="text"
                  placeholder="مثال: اکانت اختصاصی ChatGPT Plus"
                  value={newProd.title}
                  onChange={(e) => setNewProd({ ...newProd, title: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">شناسه لاتین (Slug):</label>
                <input
                  type="text"
                  placeholder="chatgpt-plus-vip"
                  value={newProd.slug}
                  onChange={(e) => setNewProd({ ...newProd, slug: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">دسته‌بندی سرویس:</label>
                <select
                  value={newProd.category}
                  onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="SPECIAL_OFFER">🔥 آفر ویژه (SPECIAL_OFFER)</option>
                  <option value="CHATGPT">🤖 ChatGPT</option>
                  <option value="CLAUDE">🧠 Claude Pro</option>
                  <option value="GEMINI">✨ Google Gemini</option>
                  <option value="CURSOR">💻 Cursor Pro</option>
                  <option value="PERPLEXITY">🔍 Perplexity Pro</option>
                  <option value="MIDJOURNEY">🎨 Midjourney</option>
                  <option value="OTHER">📦 سایر (OTHER)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">قیمت فروش (تومان):</label>
                <input
                  type="number"
                  value={newProd.price_toman}
                  onChange={(e) => setNewProd({ ...newProd, price_toman: Number(e.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">قیمت قبل از تخفیف (تومان):</label>
                <input
                  type="number"
                  value={newProd.original_price_toman}
                  onChange={(e) => setNewProd({ ...newProd, original_price_toman: Number(e.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">قیمت تتر (USDT):</label>
                <input
                  type="number"
                  step="0.1"
                  value={newProd.price_usdt}
                  onChange={(e) => setNewProd({ ...newProd, price_usdt: Number(e.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">روش تحویل سفارش:</label>
                <select
                  value={newProd.fulfillment_type}
                  onChange={(e) => setNewProd({ ...newProd, fulfillment_type: e.target.value as any })}
                  className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="INSTANT_VAULT">⚡ تحویل آنی خودکار از انبار رمزنگاری شده</option>
                  <option value="MANUAL_ACTIVATION">👨‍💻 فعال‌سازی دستی روی ایمیل مشتری</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">برچسب تخفیف (Badge):</label>
                <input
                  type="text"
                  value={newProd.offer_badge}
                  onChange={(e) => setNewProd({ ...newProd, offer_badge: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">ویژگی‌ها (جداشده با |):</label>
                <input
                  type="text"
                  value={newProd.features}
                  onChange={(e) => setNewProd({ ...newProd, features: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-[11px] text-slate-400 mb-1">توضیحات کامل محصول:</label>
              <input
                type="text"
                placeholder="توضیحات، شرایط گارانتی و نحوه استفاده..."
                value={newProd.description}
                onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCreateNewProduct}
                disabled={creatingProd}
                className="btn-press flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>ثبت و انتشار محصول در سایت و ربات تلگرام</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-xl">
            <h3 className="text-base font-bold text-white">ویرایش یا حذف اکانت‌ها و آفرهای فعلی</h3>
            <p className="mt-1 text-xs text-slate-400">
              قیمت تومانی، نشان‌های تخفیف و وضعیت آفر ویژه محصولات را مستقیماً ویرایش یا حذف کنید.
            </p>

            <div className="mt-6 space-y-4">
              {products.map((p, pIdx) => {
                const edit = editingPrices[p.id] || {
                  price_toman: p.price_toman,
                  is_special_offer: p.is_special_offer,
                  offer_badge: p.offer_badge,
                };

                return (
                  <div
                    key={`admin-product-${p.id}-${pIdx}`}
                    className="rounded-xl border border-white/[0.06] bg-[#080b10] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.title}</h4>
                      <span className="text-[11px] text-slate-500">
                        دسته: {p.category} | روش تحویل: {p.fulfillment_type} | موجودی: {p.inventory_count}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">قیمت (تومان):</label>
                        <input
                          type="number"
                          value={edit.price_toman}
                          onChange={(e) =>
                            setEditingPrices({
                              ...editingPrices,
                              [p.id]: { ...edit, price_toman: Number(e.target.value) },
                            })
                          }
                          className="w-36 rounded-xl border border-white/10 bg-[#0c1017] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">نشان آفر (Badge):</label>
                        <input
                          type="text"
                          value={edit.offer_badge}
                          placeholder="مثال: آفر ویژه پلاتی"
                          onChange={(e) =>
                            setEditingPrices({
                              ...editingPrices,
                              [p.id]: { ...edit, offer_badge: e.target.value },
                            })
                          }
                          className="w-36 rounded-xl border border-white/10 bg-[#0c1017] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                        />
                      </div>

                      <div className="pt-4 flex items-center gap-2">
                        <button
                          onClick={() => handleSaveProduct(p.id)}
                          className="btn-press flex items-center gap-1.5 rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-slate-200"
                        >
                          {savedProductId === p.id ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4 text-slate-800" />}
                          ذخیره
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.title)}
                          className="btn-press rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Subtab 4: Live Telegram Bot Storefront Simulator */}
      {activeSubTab === "TELEGRAM" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-sky-400" />
                <span>شبیه‌ساز زنده و تست ربات تلگرام فروشگاهی (@{gatewaySettings.telegram_bot_username})</span>
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                این ربات مستقیماً به دیتابیس سایت متصل است. می‌توانید همین الان روی دکمه‌های شیشه‌ای کلیک کنید و فرآیند خرید، شارژ کیف پول و تحویل آنی لایسنس در تلگرام را تست کنید!
              </p>
            </div>
            <button
              onClick={() => runTelegramSim({ text: "/start" })}
              className="btn-press flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${tgLoading ? "animate-spin" : ""}`} />
              <span>ارسال مجدد /start</span>
            </button>
          </div>

          <div className="mt-6 mx-auto max-w-lg rounded-2xl border border-sky-500/20 bg-[#080b10] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-bold text-sm">
                  AI
                </div>
                <div>
                  <div className="text-xs font-bold text-white">AI Nexus Store Bot</div>
                  <div className="text-[10px] text-emerald-400">bot • متصل به دیتابیس فروشگاه</div>
                </div>
              </div>
              <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-mono text-slate-400">
                /api/v1/telegram/webhook
              </span>
            </div>

            {/* Bot Message Bubble */}
            <div
              className="rounded-2xl rounded-tr-sm border border-white/[0.08] bg-[#111824] p-4 text-xs leading-relaxed text-slate-200 whitespace-pre-line"
              dangerouslySetInnerHTML={{
                __html: tgMessage || "در حال بارگذاری منوی ربات تلگرام...",
              }}
            />

            {/* Inline Keyboard Buttons */}
            {tgKeyboard && tgKeyboard.length > 0 && (
              <div className="space-y-1.5">
                {tgKeyboard.map((row, rIdx) => (
                  <div key={`tg-row-${rIdx}`} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                    {row.map((btn, bIdx) => (
                      <button
                        key={`tg-btn-${rIdx}-${bIdx}`}
                        disabled={tgLoading}
                        onClick={() => {
                          if (btn.callback_data) {
                            runTelegramSim({ callback_data: btn.callback_data });
                          } else if (btn.url) {
                            window.open(btn.url, "_blank");
                          }
                        }}
                        className="btn-press rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-center text-[11px] font-semibold text-sky-200 hover:bg-sky-500/25 transition-all disabled:opacity-50"
                      >
                        {btn.text}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Text Input Bar (For commands or submitting email for manual orders) */}
            <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
              <input
                type="text"
                placeholder="ارسال پیام یا ایمیل به ربات (مثال: mymail@gmail.com یا /offers)..."
                value={tgInput}
                onChange={(e) => setTgInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tgInput.trim()) {
                    runTelegramSim({ text: tgInput.trim() });
                    setTgInput("");
                  }
                }}
                className="flex-1 rounded-xl border border-white/10 bg-[#0c1017] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (tgInput.trim()) {
                    runTelegramSim({ text: tgInput.trim() });
                    setTgInput("");
                  }
                }}
                disabled={tgLoading}
                className="btn-press rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
              >
                ارسال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 5: Gateways, Bot Token & Cardholder Settings */}
      {activeSubTab === "SETTINGS" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-xl">
          <h3 className="text-base font-bold text-white">پیکربندی درگاه‌های بانکی، تتر و توکن ربات تلگرام</h3>
          <p className="mt-1 text-xs text-slate-400">
            اطلاعات درگاه ریالی زرین‌پال، آدرس دریافت تتر (TRC-20)، توکن ربات تلگرام (@BotFather) و کانال اطلاع‌رسانی به همکاران ارزی را تنظیم کنید.
          </p>

          <div className="mt-6 space-y-4 max-w-xl">
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
              <div className="text-xs font-bold text-sky-300">تنظیمات اتصال ربات تلگرام فروشگاهی</div>
              <div>
                <label className="text-xs font-semibold text-slate-400">یوزرنیم ربات تلگرام (بدون @):</label>
                <input
                  type="text"
                  value={gatewaySettings.telegram_bot_username}
                  onChange={(e) =>
                    setGatewaySettings({ ...gatewaySettings, telegram_bot_username: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">توکن ربات تلگرام (Telegram Bot Token از BotFather):</label>
                <input
                  type="password"
                  placeholder="123456789:AAH..."
                  value={gatewaySettings.telegram_bot_token}
                  onChange={(e) =>
                    setGatewaySettings({ ...gatewaySettings, telegram_bot_token: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">کد مرچنت زرین‌پال (Merchant ID):</label>
              <input
                type="text"
                value={gatewaySettings.zarinpal_merchant_id}
                onChange={(e) =>
                  setGatewaySettings({ ...gatewaySettings, zarinpal_merchant_id: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sandboxToggle"
                checked={gatewaySettings.zarinpal_sandbox}
                onChange={(e) =>
                  setGatewaySettings({ ...gatewaySettings, zarinpal_sandbox: e.target.checked })
                }
                className="h-4 w-4 rounded border-white/10 bg-slate-900 text-sky-500 focus:ring-sky-400"
              />
              <label htmlFor="sandboxToggle" className="text-xs text-white">
                حالت تستی و شبیه‌ساز زرین‌پال (Sandbox Mode)
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">آدرس کیف پول تتر TRC-20 (Crypto Deposit):</label>
              <input
                type="text"
                value={gatewaySettings.crypto_deposit_address}
                onChange={(e) =>
                  setGatewaySettings({ ...gatewaySettings, crypto_deposit_address: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">نرخ برابری تومان به هر تتر (USDT):</label>
              <input
                type="number"
                value={gatewaySettings.toman_per_usdt}
                onChange={(e) =>
                  setGatewaySettings({ ...gatewaySettings, toman_per_usdt: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">کانال/آیدی تلگرام هشدار به همکاران ارزی:</label>
              <input
                type="text"
                value={gatewaySettings.cardholder_alert_channel}
                onChange={(e) =>
                  setGatewaySettings({ ...gatewaySettings, cardholder_alert_channel: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            {settingsStatus && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                {settingsStatus}
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={settingsLoading}
              className="btn-press flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-slate-200 disabled:opacity-50"
            >
              {settingsLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-slate-800" />}
              ذخیره تنظیمات درگاه‌ها و ربات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
