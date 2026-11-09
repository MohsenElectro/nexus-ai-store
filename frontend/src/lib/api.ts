export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    return `http://${hostname}:8000/api/v1`;
  }
  return "http://localhost:8000/api/v1";
}

export interface User {
  id: number;
  phone_number?: string;
  email?: string;
  full_name?: string;
  role: "CUSTOMER" | "DEVELOPER" | "ADMIN";
  is_active: boolean;
  created_at: string;
}

export interface Wallet {
  id: number;
  balance_toman: number;
  balance_usdt: number;
  locked_toman: number;
}

export interface Product {
  id: number;
  title: string;
  slug: string;
  category: string;
  description?: string;
  features?: string;
  price_toman: number;
  price_usdt: number;
  original_price_toman?: number;
  is_special_offer: boolean;
  offer_badge?: string;
  fulfillment_type: "INSTANT_VAULT" | "MANUAL_ACTIVATION";
  is_active: boolean;
  inventory_count: number;
}

export interface Order {
  id: number;
  total_toman: number;
  total_usdt: number;
  status: "PENDING_PAYMENT" | "PAID_PROCESSING" | "AWAITING_MANUAL_FULFILLMENT" | "COMPLETED" | "CANCELLED";
  target_email?: string;
  customer_notes?: string;
  admin_notes?: string;
  created_at: string;
  items: Array<{
    id: number;
    product_id: number;
    quantity: number;
    unit_price_toman: number;
    delivered_data?: string;
  }>;
}

export interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  spend_limit_toman?: number;
  total_spent_toman: number;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  api_key?: string;
}

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Google Gemini Advanced (روش ارزان فمیلی گوگل وان)",
    slug: "gemini-advanced-family",
    category: "GEMINI",
    description: "فعال‌سازی مستقیم مدل هوشمند Gemini 1.5 Pro با کانتکست ۱ میلیون توکن و ۲ ترابایت فضای ابری گوگل روی جیمیل شخصی شما بدون نیاز به پسورد.",
    features: "فعال‌سازی روی ایمیل شخصی | بدون نیاز به پسورد | ۲ ترابایت گوگل وان | پشتیبانی از Gemini Live",
    price_toman: 240000,
    price_usdt: 3.4,
    original_price_toman: 490000,
    is_special_offer: true,
    offer_badge: "🔥 پرفروش‌ترین آفر پلاتی",
    fulfillment_type: "MANUAL_ACTIVATION",
    is_active: true,
    inventory_count: 50,
  },
  {
    id: 2,
    title: "اکانت اختصاصی ChatGPT Plus (۱ ماهه)",
    slug: "chatgpt-plus-1m",
    category: "CHATGPT",
    description: "دسترسی نامحدود به GPT-4o، قابلیت پیشرفته Canvas، ساخت تصویر با DALL-E 3 و تحلیل پیشرفته داده‌ها با ضمانت کارکرد.",
    features: "تحویل ۱۰۰٪ آنی لایسنس | بدون قطعی | دسترسی به GPT-4o و Canvas | ضمانت ۳۰ روزه تعویض",
    price_toman: 1850000,
    price_usdt: 26.4,
    original_price_toman: 2400000,
    is_special_offer: false,
    offer_badge: "🚀 تحویل آنی مخزن",
    fulfillment_type: "INSTANT_VAULT",
    is_active: true,
    inventory_count: 14,
  },
  {
    id: 3,
    title: "اکانت آماده Google Gemini Advanced (۲ ترابایت اختصاصی)",
    slug: "gemini-advanced-account",
    category: "GEMINI",
    description: "اکانت کاملاً آماده و اختصاصی با ۲ ترابایت فضای ابری گوگل درایو و اشتراک ۱ ماهه فعال Gemini Advanced با تحویل آنی پس از پرداخت.",
    features: "تحویل آنی یوزرنیم و پسورد | ایمیل اختصاصی با ۲TB فضا | قابل تمدید | ضد تحریم",
    price_toman: 490000,
    price_usdt: 7.0,
    original_price_toman: 750000,
    is_special_offer: false,
    offer_badge: "⚡ تحویل خودکار",
    fulfillment_type: "INSTANT_VAULT",
    is_active: true,
    inventory_count: 22,
  },
  {
    id: 4,
    title: "اکانت اختصاصی Claude Pro (۱ ماهه)",
    slug: "claude-pro-1m",
    category: "CLAUDE",
    description: "دسترسی نامحدود به شاهکار برنامه‌نویسی و استدلال جهان Claude 3.5 Sonnet، قابلیت پروژه‌ها و خروجی زنده آرتیفکت‌ها.",
    features: "دسترسی به Claude 3.5 Sonnet | آرتیفکت‌های تعاملی | ۵ برابر محدودیت بیشتر | تحویل آنی",
    price_toman: 1890000,
    price_usdt: 27.0,
    original_price_toman: 2300000,
    is_special_offer: false,
    offer_badge: "برترین ابزار کدنویسی",
    fulfillment_type: "INSTANT_VAULT",
    is_active: true,
    inventory_count: 8,
  },
  {
    id: 5,
    title: "پکیج جامع هوش مصنوعی جیو (GIO 50$ Bundle)",
    slug: "gio-ai-bundle",
    category: "SPECIAL_OFFER",
    description: "کردیت اختصاصی ۵۰ دلاری جیو همراه با دسترسی بدون تحریم به برترین موتورهای پردازش تصویر، متن و ویدیو با ۷۰٪ تخفیف انحصاری.",
    features: "کردیت ۵۰ دلاری آنی | ۷۰٪ تخفیف بلک‌فرایدی | دسترسی به موتورهای متعدد | بدون نیاز به ویزاکارت",
    price_toman: 950000,
    price_usdt: 13.5,
    original_price_toman: 3100000,
    is_special_offer: true,
    offer_badge: "💥 ۷۰٪ تخفیف ویژه",
    fulfillment_type: "INSTANT_VAULT",
    is_active: true,
    inventory_count: 35,
  },
  {
    id: 6,
    title: "اشتراک ادیتور هوش مصنوعی Cursor Pro (۱ ماهه)",
    slug: "cursor-pro-1m",
    category: "CURSOR",
    description: "بهترین IDE هوش مصنوعی جهان برای برنامه‌نویسان با استفاده نامحدود از Claude 3.5 Sonnet و GPT-4o در محیط VSCode.",
    features: "Claude 3.5 Sonnet نامحدود | قابلیت Cursor Tab و Composer | فعال‌سازی روی اکانت شما",
    price_toman: 1250000,
    price_usdt: 17.8,
    original_price_toman: 1600000,
    is_special_offer: false,
    offer_badge: "محبوب برنامه‌نویسان",
    fulfillment_type: "MANUAL_ACTIVATION",
    is_active: true,
    inventory_count: 18,
  },
  {
    id: 7,
    title: "اکانت اختصاصی Midjourney v6 (پلن استاندارد)",
    slug: "midjourney-basic-1m",
    category: "MIDJOURNEY",
    description: "اشتراک ۱ ماهه میدجرنی نسخه ۶ با ساعت‌های سریع تولید تصویر و حالت ریلکس نامحدود برای طراحان گرافیک و تصویرسازان.",
    features: "تولید تصویر نامحدود Relax | ۱۵ ساعت Fast GPU | کانال اختصاصی دیسکورد | تحویل آنی",
    price_toman: 980000,
    price_usdt: 14.0,
    original_price_toman: 1350000,
    is_special_offer: false,
    offer_badge: "پادشاه تولید تصویر",
    fulfillment_type: "INSTANT_VAULT",
    is_active: true,
    inventory_count: 11,
  },
  {
    id: 8,
    title: "آفر یک‌ساله Perplexity Pro (جستجوگر هوشمند AI)",
    slug: "perplexity-pro-offer",
    category: "PERPLEXITY",
    description: "دسترسی به موتور جستجوی عمیق هوش مصنوعی با قابلیت سوئیچ بین GPT-4o، Claude 3.5 Sonnet و Grok همراه با آپلود نامحدود فایل.",
    features: "جستجوی علمی و دقیق با رفرنس | دسترسی به مدل‌های پرچمدار | کد تخفیف و اکانت آماده | تحویل آنی",
    price_toman: 790000,
    price_usdt: 11.2,
    original_price_toman: 1950000,
    is_special_offer: true,
    offer_badge: "💎 آفر ویژه ۶۰٪ تخفیف",
    fulfillment_type: "INSTANT_VAULT",
    is_active: true,
    inventory_count: 15,
  },
];

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("ai_nexus_token");
  }

  public setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("ai_nexus_token", token);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "خطایی در برقراری ارتباط با سرور رخ داد" }));
      throw new Error(errorData.detail || `Request failed with status ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async register(data: { phone_number?: string; email?: string; password: string; full_name?: string }): Promise<User> {
    return this.request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "نام کاربری یا رمز عبور اشتباه است" }));
      throw new Error(err.detail || "خطا در ورود");
    }

    const data = await res.json();
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>("/users/me");
  }

  // Products with seamless fallback
  async getProducts(category?: string, specialOffersOnly = false): Promise<Product[]> {
    try {
      let url = "/products/";
      const params = new URLSearchParams();
      if (category) params.append("category", category);
      if (specialOffersOnly) params.append("special_offers_only", "true");
      const query = params.toString();
      if (query) url += `?${query}`;
      const res = await this.request<Product[]>(url);
      if (res && res.length > 0) return res;
      return FALLBACK_PRODUCTS;
    } catch {
      return FALLBACK_PRODUCTS;
    }
  }

  // Wallet
  async getWallet(): Promise<Wallet> {
    try {
      return await this.request<Wallet>("/wallet/");
    } catch {
      return { id: 1, balance_toman: 0, balance_usdt: 0, locked_toman: 0 };
    }
  }

  async topupWallet(amountToman: number, gateway = "ZARINPAL"): Promise<{ payment_url?: string; authority?: string; [key: string]: any }> {
    return this.request("/wallet/topup", {
      method: "POST",
      body: JSON.stringify({ amount_toman: amountToman, gateway }),
    });
  }

  // Orders
  async createOrder(productId: number, targetEmail?: string, notes?: string): Promise<Order> {
    return this.request<Order>("/orders/", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, target_email: targetEmail, customer_notes: notes }),
    });
  }

  async getMyOrders(): Promise<Order[]> {
    try {
      return await this.request<Order[]>("/orders/");
    } catch {
      return [];
    }
  }

  // API Keys
  async getApiKeys(): Promise<ApiKey[]> {
    try {
      return await this.request<ApiKey[]>("/keys/");
    } catch {
      return [];
    }
  }

  async createApiKey(name: string, spendLimitToman?: number): Promise<ApiKey> {
    return this.request<ApiKey>("/keys/", {
      method: "POST",
      body: JSON.stringify({ name, spend_limit_toman: spendLimitToman }),
    });
  }

  // Admin
  async getAdminStats(): Promise<any> {
    return this.request("/admin/stats");
  }

  async getPendingManualOrders(): Promise<Order[]> {
    return this.request("/admin/manual-orders");
  }

  async fulfillManualOrder(orderId: number, adminNotes?: string): Promise<any> {
    return this.request("/admin/fulfill-manual", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId, admin_notes: adminNotes }),
    });
  }

  async addVaultBatch(productId: number, rawLines: string[]): Promise<any> {
    return this.request("/admin/vault/batch", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, raw_payloads: rawLines }),
    });
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    return this.request<Product>("/admin/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(productId: number): Promise<any> {
    return this.request(`/admin/products/${productId}`, {
      method: "DELETE",
    });
  }

  async patchProduct(productId: number, data: Partial<Product>): Promise<Product> {
    return this.request(`/admin/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getGatewaySettings(): Promise<any> {
    return this.request("/admin/settings");
  }

  async updateGatewaySettings(data: any): Promise<any> {
    return this.request("/admin/settings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Telegram Storefront Bot
  async simulateTelegramBot(payload: {
    telegram_id?: number;
    username?: string;
    first_name?: string;
    text?: string;
    callback_data?: string;
  }): Promise<any> {
    return this.request("/telegram/simulate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();
