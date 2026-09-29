import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { encryptedStorage } from "../services/encryptedStorage";

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      storeId: null,
      role: null,
      name: null,
      setAuth: (token, storeId, role, name) => set({ token, storeId, role, name }),
      logout: () => set({ token: null, storeId: null, role: null, name: null }),
    }),
    {
      name: "pawnpro-auth-v2",
      storage: createJSONStorage(() => encryptedStorage),
    }
  )
);
