import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore";
import { useSettingsStore } from "../store/settingsStore";

// ── Auth Store ──────────────────────────────────────────────────────────────

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it("starts unauthenticated", () => {
    const { token, role } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(role).toBeNull();
  });

  it("setAuth stores credentials", () => {
    useAuthStore.getState().setAuth("tok", "STORE001", "boss", "Owner");
    const s = useAuthStore.getState();
    expect(s.token).toBe("tok");
    expect(s.storeId).toBe("STORE001");
    expect(s.role).toBe("boss");
    expect(s.name).toBe("Owner");
  });

  it("logout clears all auth state", () => {
    useAuthStore.getState().setAuth("tok", "STORE001", "boss", "Owner");
    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.token).toBeNull();
    expect(s.storeId).toBeNull();
    expect(s.role).toBeNull();
    expect(s.name).toBeNull();
  });
});

// ── Settings Store ──────────────────────────────────────────────────────────

describe("settingsStore", () => {
  it("has default boss password", () => {
    expect(useSettingsStore.getState().bossPassword).toBe("admin123");
  });

  it("setBossPassword updates the password", () => {
    useSettingsStore.getState().setBossPassword("newpass99");
    expect(useSettingsStore.getState().bossPassword).toBe("newpass99");
    // reset
    useSettingsStore.getState().setBossPassword("admin123");
  });
});

// ── User Store ──────────────────────────────────────────────────────────────

describe("userStore", () => {
  const getEmployees = () => useUserStore.getState().employees;

  it("has initial employees", () => {
    expect(getEmployees().length).toBeGreaterThan(0);
  });

  it("addEmployee creates employee with is_active true", () => {
    const before = getEmployees().length;
    useUserStore.getState().addEmployee({
      name: "Test User",
      username: "TST001",
      password: "pass1",
      security_questions: [],
    });
    const employees = getEmployees();
    expect(employees.length).toBe(before + 1);
    const added = employees.find((e) => e.username === "TST001");
    expect(added).toBeDefined();
    expect(added.is_active).toBe(true);
    expect(added.role).toBe("employee");
  });

  it("deactivateEmployee sets is_active to false", () => {
    const emp = getEmployees().find((e) => e.username === "TST001");
    useUserStore.getState().deactivateEmployee(emp.id);
    const updated = getEmployees().find((e) => e.id === emp.id);
    expect(updated.is_active).toBe(false);
  });

  it("requestPasswordChange sets status to pending", () => {
    const emp = getEmployees()[0];
    useUserStore.getState().requestPasswordChange(emp.id);
    const updated = getEmployees().find((e) => e.id === emp.id);
    expect(updated.pwd_change_request?.status).toBe("pending");
  });

  it("approvePasswordChange sets status to approved", () => {
    const emp = getEmployees().find((e) => e.pwd_change_request?.status === "pending");
    useUserStore.getState().approvePasswordChange(emp.id);
    const updated = getEmployees().find((e) => e.id === emp.id);
    expect(updated.pwd_change_request?.status).toBe("approved");
  });

  it("changeEmployeePassword updates password and clears request", () => {
    const emp = getEmployees().find((e) => e.pwd_change_request?.status === "approved");
    useUserStore.getState().changeEmployeePassword(emp.id, "newpwd123");
    const updated = getEmployees().find((e) => e.id === emp.id);
    expect(updated.password).toBe("newpwd123");
    expect(updated.pwd_change_request).toBeNull();
  });

  it("denyPasswordChange clears the request", () => {
    const emp = getEmployees()[0];
    useUserStore.getState().requestPasswordChange(emp.id);
    useUserStore.getState().denyPasswordChange(emp.id);
    const updated = getEmployees().find((e) => e.id === emp.id);
    expect(updated.pwd_change_request).toBeNull();
  });

  it("cancelPasswordChangeRequest clears the request", () => {
    const emp = getEmployees()[0];
    useUserStore.getState().requestPasswordChange(emp.id);
    useUserStore.getState().cancelPasswordChangeRequest(emp.id);
    const updated = getEmployees().find((e) => e.id === emp.id);
    expect(updated.pwd_change_request).toBeNull();
  });

  it("resetPasswordViaQuestions updates password", () => {
    const emp = getEmployees()[0];
    useUserStore.getState().resetPasswordViaQuestions(emp.id, "resetpass");
    const updated = getEmployees().find((e) => e.id === emp.id);
    expect(updated.password).toBe("resetpass");
  });
});
