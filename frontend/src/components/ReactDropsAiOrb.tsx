"use client";

import React, { useRef, useEffect, useState } from "react";
import { Sparkles, Cpu, Zap, Activity } from "lucide-react";

type OrbState = "idle" | "thinking" | "speaking";

interface ReactDropsAiOrbProps {
  initialState?: OrbState;
}

export default function ReactDropsAiOrb({ initialState = "idle" }: ReactDropsAiOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [orbState, setOrbState] = useState<OrbState>(initialState);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseRef.current.targetX = Math.max(0, Math.min(1, x));
      mouseRef.current.targetY = Math.max(0, Math.min(1, y));
    };

    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      t += orbState === "thinking" ? 0.045 : orbState === "speaking" ? 0.03 : 0.015;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.42;

      ctx.save();

      // Outer Refraction Glow (Cool Sky & Teal, NO Purple Slop)
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.2,
        centerX,
        centerY,
        radius * 1.35
      );
      if (orbState === "thinking") {
        glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.35)");
        glowGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.18)");
        glowGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      } else if (orbState === "speaking") {
        glowGrad.addColorStop(0, "rgba(16, 185, 129, 0.35)");
        glowGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.18)");
        glowGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
      } else {
        glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.22)");
        glowGrad.addColorStop(0.6, "rgba(14, 165, 233, 0.1)");
        glowGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      }

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Clip inside main orb
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();

      // Deep Glass Core
      const coreGrad = ctx.createRadialGradient(
        centerX + (mouseRef.current.x - 0.5) * 45,
        centerY + (mouseRef.current.y - 0.5) * 45,
        0,
        centerX,
        centerY,
        radius
      );
      coreGrad.addColorStop(0, "#0b1524");
      coreGrad.addColorStop(0.7, "#080c14");
      coreGrad.addColorStop(1, "#04060a");
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, width, height);

      // Rotating Fluid Chromatic Waves (Sky, Emerald, White)
      const numRings = 3;
      for (let i = 0; i < numRings; i++) {
        const offsetAngle = t + (i * Math.PI) / 1.5;
        const fluidX = centerX + Math.cos(offsetAngle) * (radius * 0.3);
        const fluidY = centerY + Math.sin(offsetAngle * 1.2) * (radius * 0.3);

        const fluidGrad = ctx.createRadialGradient(
          fluidX,
          fluidY,
          radius * 0.05,
          fluidX,
          fluidY,
          radius * 0.65
        );

        if (i === 0) {
          fluidGrad.addColorStop(0, "rgba(56, 189, 248, 0.5)"); // Sky
          fluidGrad.addColorStop(1, "transparent");
        } else if (i === 1) {
          fluidGrad.addColorStop(0, "rgba(16, 185, 129, 0.45)"); // Emerald
          fluidGrad.addColorStop(1, "transparent");
        } else {
          fluidGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)"); // Pure White
          fluidGrad.addColorStop(1, "transparent");
        }

        ctx.fillStyle = fluidGrad;
        ctx.beginPath();
        ctx.arc(fluidX, fluidY, radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      // Specular Highlight
      const specX = centerX + (mouseRef.current.x - 0.5) * 35 - radius * 0.28;
      const specY = centerY + (mouseRef.current.y - 0.5) * 35 - radius * 0.28;
      const specGrad = ctx.createRadialGradient(
        specX,
        specY,
        0,
        specX,
        specY,
        radius * 0.5
      );
      specGrad.addColorStop(0, "rgba(255, 255, 255, 0.7)");
      specGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.15)");
      specGrad.addColorStop(1, "transparent");

      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(specX, specY, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Rim Lighting
      ctx.restore();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [orbState]);

  return (
    <div className="relative flex flex-col items-center justify-center p-3">
      {/* Liquid Glass Orb Canvas */}
      <div className="relative h-40 w-40 sm:h-48 sm:w-48">
        <canvas
          ref={canvasRef}
          width={240}
          height={240}
          className="h-full w-full cursor-pointer select-none"
          title="ReactDrops Liquid Glass AI Core"
        />

        {/* Center state badge overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 backdrop-blur-md">
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-200">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  orbState === "thinking"
                    ? "bg-amber-400 animate-ping"
                    : orbState === "speaking"
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-sky-400"
                }`}
              />
              {orbState === "idle"
                ? "آماده پردازش"
                : orbState === "thinking"
                ? "پردازش استریم"
                : "تولید پاسخ"}
            </span>
          </div>
        </div>
      </div>

      {/* State Switcher Pills */}
      <div className="mt-2.5 flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#0c1017] p-1 text-[11px]">
        <button
          onClick={() => setOrbState("idle")}
          className={`btn-press rounded-lg px-2.5 py-1 font-medium transition-all ${
            orbState === "idle"
              ? "bg-white text-slate-950 font-bold shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          آماده
        </button>
        <button
          onClick={() => setOrbState("thinking")}
          className={`btn-press rounded-lg px-2.5 py-1 font-medium transition-all ${
            orbState === "thinking"
              ? "bg-white text-slate-950 font-bold shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          محاسبه
        </button>
        <button
          onClick={() => setOrbState("speaking")}
          className={`btn-press rounded-lg px-2.5 py-1 font-medium transition-all ${
            orbState === "speaking"
              ? "bg-white text-slate-950 font-bold shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          استریم
        </button>
      </div>
    </div>
  );
}
