"use client";

import React, { useState } from "react";
import { Sparkles, ArrowLeft, ShieldCheck, Flame, ChevronRight, Zap } from "lucide-react";
import { Product } from "@/lib/api";

interface FanShowcaseProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export default function FanShowcase({ products, onSelectProduct }: FanShowcaseProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Take top featured products
  const featured = products.slice(0, 5);

  const cardAngles = [-14, -7, 0, 7, 14];
  const cardYOffsets = [24, 8, 0, 8, 24];

  return (
    <section aria-label="ویترین بادبزنی برترین اشتراک‌ها" className="my-16 overflow-hidden">
      <div className="text-center max-w-[680px] mx-auto mb-12 space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>ویترین سه‌بعدی محصولات برگزیده</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#fafafa]">
          محبوب‌ترین سرویس‌های هوش مصنوعی در یک نگاه
        </h2>
        <p className="text-xs sm:text-sm text-[#a1a1aa]">
          نشانگر ماوس را روی هر کارت ببرید تا جزئیات لایسنس و تحویل آنی نمایان شود
        </p>
      </div>

      {/* Fan Deck Container */}
      <div className="relative mx-auto flex h-[340px] max-w-4xl items-center justify-center pt-8">
        {featured.map((p, idx) => {
          const isHovered = hoveredIdx === idx;
          const isAnyHovered = hoveredIdx !== null;
          const baseAngle = cardAngles[idx] || 0;
          const baseY = cardYOffsets[idx] || 0;

          const transformStyle = isHovered
            ? `translateY(-36px) scale(1.08) rotate(0deg)`
            : isAnyHovered
            ? `translateY(${baseY + 12}px) scale(0.96) rotate(${baseAngle}deg)`
            : `translateY(${baseY}px) scale(1) rotate(${baseAngle}deg)`;

          return (
            <div
              key={p.id}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                transform: transformStyle,
                zIndex: isHovered ? 30 : idx + 10,
                transition: "all 450ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              className="absolute w-[220px] sm:w-[250px] cursor-pointer select-none rounded-2xl border border-[#27272a] bg-[#121216] p-5 shadow-2xl backdrop-blur-xl hover:border-indigo-500 hover:shadow-indigo-500/10"
            >
              {/* Category / Badge */}
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  {p.category}
                </span>
                {p.is_special_offer && (
                  <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                    <Flame className="h-3 w-3" />
                    آفر
                  </span>
                )}
              </div>

              {/* Title & Desc */}
              <div className="mt-3 space-y-1">
                <h3 className="font-bold text-sm text-[#fafafa] line-clamp-1">
                  {p.title}
                </h3>
                <p className="text-[11px] text-[#a1a1aa] line-clamp-2 leading-relaxed">
                  {p.description || "دسترسی مستقیم پریمیوم با تحویل آنی و تضمین کارکرد."}
                </p>
              </div>

              {/* Price & CTA */}
              <div className="mt-4 pt-3 border-t border-[#27272a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold text-[#fafafa]">
                    {p.price_toman.toLocaleString("fa-IR")}
                    <span className="text-[10px] text-[#a1a1aa] mr-1">تومان</span>
                  </div>
                  <div className="text-[9px] font-mono text-[#71717a]">
                    ~{p.price_usdt} USDT
                  </div>
                </div>

                <button
                  onClick={() => onSelectProduct(p)}
                  className="btn-press flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm hover:bg-indigo-500"
                  title="خرید سریع"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
