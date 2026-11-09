"use client";

import React from "react";
import { Toaster } from "sonner";

export default function ToasterProvider() {
  return (
    <Toaster
      richColors
      position="bottom-left"
      dir="rtl"
      theme="dark"
      toastOptions={{
        style: {
          background: "#18181b",
          border: "1px solid #27272a",
          color: "#fafafa",
          fontFamily: "inherit",
          borderRadius: "12px",
        },
      }}
    />
  );
}
