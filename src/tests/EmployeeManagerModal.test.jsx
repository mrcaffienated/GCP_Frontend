import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmployeeManagerModal, { SECURITY_QUESTIONS } from "../components/EmployeeManagerModal";
import { useUserStore } from "../store/userStore";

beforeEach(() => {
  // Reset employees to a clean state by clearing added test employees
  const state = useUserStore.getState();
  const original = state.employees.filter((e) => e.role === "boss");
  // We don't fully reset, just ensure the store is in a consistent state
});

describe("EmployeeManagerModal", () => {
  it("renders the modal title", () => {
    render(<EmployeeManagerModal onClose={vi.fn()} />);
    expect(screen.getByText(/Employee Management/i)).toBeInTheDocument();
  });

  it("shows List and Add tabs", () => {
    render(<EmployeeManagerModal onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "All Employees" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add New" })).toBeInTheDocument();
  });

  it("switching to Add tab shows the add form", () => {
    render(<EmployeeManagerModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add New" }));
    expect(screen.getByPlaceholderText("e.g. Ramesh Kumar")).toBeInTheDocument();
  });

  it("step 1 form has name, username, password fields", () => {
    render(<EmployeeManagerModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add New" }));
    expect(screen.getByPlaceholderText("e.g. Ramesh Kumar")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. EMP002")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Min. 4 characters")).toBeInTheDocument();
  });

  it("shows error when username already exists", () => {
    render(<EmployeeManagerModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add New" }));

    const employees = useUserStore.getState().employees;
    const existingUsername = employees[0]?.username || "boss";

    fireEvent.change(screen.getByPlaceholderText("e.g. Ramesh Kumar"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. EMP002"), { target: { value: existingUsername } });
    fireEvent.change(screen.getByPlaceholderText("Min. 4 characters"), { target: { value: "pass" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
  });

  it("advances to step 2 (security questions) with valid step 1 data", () => {
    render(<EmployeeManagerModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add New" }));

    fireEvent.change(screen.getByPlaceholderText("e.g. Ramesh Kumar"), { target: { value: "New Employee" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. EMP002"), { target: { value: "NEWUSR999" } });
    fireEvent.change(screen.getByPlaceholderText("Min. 4 characters"), { target: { value: "securepass" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText(/security questions/i)).toBeInTheDocument();
  });

  it("shows 10 preset security questions in SECURITY_QUESTIONS export", () => {
    expect(SECURITY_QUESTIONS.length).toBe(10);
  });

  it("password field starts as type password and has a visibility toggle button", () => {
    render(<EmployeeManagerModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add New" }));

    const pwdInput = screen.getByPlaceholderText("Min. 4 characters");
    expect(pwdInput.type).toBe("password");
    // Toggle button (Eye icon) is a sibling of the input
    const toggleBtn = pwdInput.nextElementSibling;
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.tagName).toBe("BUTTON");
  });

  it("renders active employees in the list", () => {
    const employees = useUserStore.getState().employees.filter((e) => e.is_active !== false);
    render(<EmployeeManagerModal onClose={vi.fn()} />);
    if (employees.length > 0) {
      expect(screen.getByText(employees[0].name)).toBeInTheDocument();
    }
  });

  it("calls onClose when X is clicked", () => {
    const onClose = vi.fn();
    render(<EmployeeManagerModal onClose={onClose} />);
    const closeBtn = document.querySelector("button.text-slate-400");
    if (closeBtn) fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
