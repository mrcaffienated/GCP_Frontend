import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { encryptedStorage } from "../services/encryptedStorage";

export const useSettingsStore = create(
  persist(
    (set) => ({
      bossPassword: "admin123",
      setBossPassword: (password) => set({ bossPassword: password }),
    }),
    {
      name: "pawnpro-settings",
      storage: createJSONStorage(() => encryptedStorage),
    }
  )
);
