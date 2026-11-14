"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        enableClosingConfirmation: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          query_id?: string;
          auth_date?: string;
          hash?: string;
        };
      };
    };
  }
}

export default function TelegramWebAppProvider() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      try {
        tg.ready();
        tg.expand();
        if (typeof tg.setHeaderColor === "function") {
          tg.setHeaderColor("#0c1017");
        }
        if (typeof tg.setBackgroundColor === "function") {
          tg.setBackgroundColor("#090a0f");
        }
        if (typeof tg.enableClosingConfirmation === "function") {
          tg.enableClosingConfirmation();
        }
      } catch (err) {
        console.error("Failed to init Telegram WebApp:", err);
      }
    }
  }, []);

  return null;
}
