import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReportsModal from "../components/ReportsModal";

const mockPawns = [
  {
    id: "1", serial_no: 1, entry_date: "2024-01-15",
    borrower_name: "Rajan Kumar", item_description: "Gold Ring",
    collateral_type: "gold", loan_amount: "50000", interest_rate: "2",
    is_released: false, renewed: false,
  },
  {
    id: "2", serial_no: 2, entry_date: "2024-02-10",
    borrower_name: "Meena Sharma", item_description: "Silver Anklets",
    collateral_type: "silver", loan_amount: "8000", interest_rate: "1.5",
    is_released: true, released_date: "2024-05-01", renewed: false,
  },
  {
    id: "3", serial_no: 3, entry_date: "2024-03-01",
    borrower_name: "Arjun Patel", item_description: "Gold Bangle",
    collateral_type: "gold", loan_amount: "30000", interest_rate: "2",
    is_released: false, renewed: true,
  },
];

const baseProps = {
  pawns: mockPawns,
  isBoss: true,
  bossStats: null,
  onClose: vi.fn(),
};

describe("ReportsModal", () => {
  it("renders the modal title", () => {
    render(<ReportsModal {...baseProps} />);
    expect(screen.getByText("Summary Report")).toBeInTheDocument();
  });

  it("shows all period filter options", () => {
    render(<ReportsModal {...baseProps} />);
    ["Today", "This Week", "This Month", "All Time", "Custom"].forEach((p) => {
      expect(screen.getByRole("button", { name: p })).toBeInTheDocument();
    });
  });

  it("defaults to This Month period", () => {
    render(<ReportsModal {...baseProps} />);
    const thisMonthBtn = screen.getByRole("button", { name: "This Month" });
    expect(thisMonthBtn.className).toMatch(/bg-amber/);
  });

  it("switching to All Time shows New Entries card", () => {
    render(<ReportsModal {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "All Time" }));
    expect(screen.getAllByText("New Entries").length).toBeGreaterThan(0);
  });

  it("shows Custom date pickers when Custom period selected", () => {
    render(<ReportsModal {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(document.querySelectorAll("input[type='date']").length).toBeGreaterThanOrEqual(2);
  });

  it("All Time shows entry count in summary card", () => {
    render(<ReportsModal {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "All Time" }));
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  });

  it("All Time shows Loans Given card", () => {
    render(<ReportsModal {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "All Time" }));
    expect(screen.getByText("Loans Given")).toBeInTheDocument();
  });

  it("calls onClose when X button in header is clicked", () => {
    const onClose = vi.fn();
    render(<ReportsModal {...baseProps} onClose={onClose} />);
    const closeBtn = document.querySelector("button.text-neutral-500");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders with empty pawns without crashing", () => {
    render(<ReportsModal {...baseProps} pawns={[]} />);
    expect(screen.getByText("Summary Report")).toBeInTheDocument();
  });
});
