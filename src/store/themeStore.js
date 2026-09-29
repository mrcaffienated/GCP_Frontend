import { create } from "zustand";
import { persist } from "zustand/middleware";

// Synchronous read before React renders — prevents flash and ensures correct initial state
try {
  const raw = localStorage.getItem("pawnpro-theme");
  if (raw) {
    const parsed = JSON.parse(raw);
    document.documentElement.classList.toggle("dark", !!parsed?.state?.isDark);
  }
} catch {}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      isDark: false,
      toggle: () => {
        const next = !get().isDark;
        document.documentElement.classList.toggle("dark", next);
        set({ isDark: next });
      },
    }),
    { name: "pawnpro-theme" }
  )
);
