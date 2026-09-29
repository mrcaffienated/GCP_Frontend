import { create } from "zustand";

// Cross-component bridge: the chatbot is rendered in a portal on document.body
// (outside the dashboard's React tree), so it can't call the dashboard's
// openPawn() directly. It drops a bill request here; DashboardPage watches this
// store, resolves the bill number to a pawn, and opens its detail card.
//
// `nonce` makes every request unique so clicking the same bill twice re-triggers.
export const usePawnNavStore = create((set) => ({
  billRequest: null, // { billNo: string, nonce: number }
  requestBill: (billNo) => set({ billRequest: { billNo: String(billNo), nonce: Date.now() } }),
  clearBillRequest: () => set({ billRequest: null }),
}));
