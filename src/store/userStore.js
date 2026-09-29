import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { INITIAL_EMPLOYEES } from "../services/mockData";
import { encryptedStorage } from "../services/encryptedStorage";

let nextEmpId = INITIAL_EMPLOYEES.length + 1;

export const useUserStore = create(
  persist(
    (set) => ({
      employees: INITIAL_EMPLOYEES,

      addEmployee: (emp) => {
        const newEmp = { ...emp, id: `emp${nextEmpId++}`, role: "employee", is_active: true };
        set((s) => ({ employees: [...s.employees, newEmp] }));
      },

      deactivateEmployee: (id) =>
        set((s) => ({ employees: s.employees.map((e) => e.id === id ? { ...e, is_active: false } : e) })),

      // ── Password change request flow ──────────────────────────────────────
      requestPasswordChange: (id) =>
        set((s) => ({ employees: s.employees.map((e) => e.id === id
          ? { ...e, pwd_change_request: { status: "pending", requested_at: new Date().toISOString() } }
          : e) })),

      cancelPasswordChangeRequest: (id) =>
        set((s) => ({ employees: s.employees.map((e) => e.id === id ? { ...e, pwd_change_request: null } : e) })),

      approvePasswordChange: (id) =>
        set((s) => ({ employees: s.employees.map((e) => e.id === id
          ? { ...e, pwd_change_request: { ...e.pwd_change_request, status: "approved" } }
          : e) })),

      denyPasswordChange: (id) =>
        set((s) => ({ employees: s.employees.map((e) => e.id === id ? { ...e, pwd_change_request: null } : e) })),

      changeEmployeePassword: (id, newPwd) =>
        set((s) => ({ employees: s.employees.map((e) => e.id === id
          ? { ...e, password: newPwd, pwd_change_request: null }
          : e) })),

      // ── Security question reset ───────────────────────────────────────────
      resetPasswordViaQuestions: (id, newPwd) =>
        set((s) => ({ employees: s.employees.map((e) => e.id === id ? { ...e, password: newPwd } : e) })),
    }),
    {
      name: "pawnpro-users",
      storage: createJSONStorage(() => encryptedStorage),
    }
  )
);
