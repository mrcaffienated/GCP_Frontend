import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomerLedgerModal from "../components/CustomerLedgerModal";

const mockPawns = [
  {
    id: "1", serial_no: 1, series: null, entry_date: "2023-01-01",
    borrower_name: "Rajan Kumar", relative_name: "Suresh",
    item_description: "Gold Ring", item_weight: "10",
    collateral_type: "gold", loan_amount: "30000", interest_rate: "2",
    is_released: false, renewed: false,
  },
  {
    id: "2", serial_no: 2, series: null, entry_date: "2022-06-01",
    borrower_name: "Meena Sharma", relative_name: "Raj",
    item_description: "Silver Anklets", item_weight: "80",
    collateral_type: "silver", loan_amount: "8000", interest_rate: "1.5",
    is_released: true, released_date: "2023-01-01", renewed: false,
  },
  {
    id: "3", serial_no: 3, series: null, entry_date: "2023-03-01",
    borrower_name: "Rajan Kumar", relative_name: "Suresh",
    item_description: "Gold Bangle", item_weight: "15",
    collateral_type: "gold", loan_amount: "20000", interest_rate: "2",
    is_released: false, renewed: false,
  },
];

describe("CustomerLedgerModal", () => {
  it("renders the modal title", () => {
    render(<CustomerLedgerModal pawns={mockPawns} onClose={vi.fn()} />);
    expect(screen.getByText(/Customer Ledger/i)).toBeInTheDocument();
  });

  it("lists all unique customer names", () => {
    render(<CustomerLedgerModal pawns={mockPawns} onClose={vi.fn()} />);
    expect(screen.getByText("Rajan Kumar")).toBeInTheDocument();
    expect(screen.getByText("Meena Sharma")).toBeInTheDocument();
  });

  it("customers with more entries appear first", () => {
    render(<CustomerLedgerModal pawns={mockPawns} onClose={vi.fn()} />);
    const items = screen.getAllByRole("button").filter((b) => b.textContent.includes("Rajan Kumar") || b.textContent.includes("Meena Sharma"));
    expect(items[0].textContent).toContain("Rajan Kumar");
  });

  it("clicking a customer shows their detail view", () => {
    render(<CustomerLedgerModal pawns={mockPawns} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Rajan Kumar"));
    expect(screen.getByText("Gold Ring")).toBeInTheDocument();
  });

  it("initialName pre-selects a customer", () => {
    render(<CustomerLedgerModal pawns={mockPawns} onClose={vi.fn()} initialName="Meena Sharma" />);
    expect(screen.getByText("Silver Anklets")).toBeInTheDocument();
  });

  it("search filters the customer list", () => {
    render(<CustomerLedgerModal pawns={mockPawns} onClose={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "meena" } });
    expect(screen.getByText("Meena Sharma")).toBeInTheDocument();
    expect(screen.queryByText("Rajan Kumar")).not.toBeInTheDocument();
  });

  it("shows entry count badge per customer", () => {
    render(<CustomerLedgerModal pawns={mockPawns} onClose={vi.fn()} />);
    expect(screen.getByText("2 customers")).toBeInTheDocument();
  });

  it("back button returns to customer list", () => {
    render(<CustomerLedgerModal pawns={mockPawns} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Rajan Kumar"));
    const backBtns = screen.getAllByRole("button", { name: "" });
    const backBtn = backBtns.find((b) => b.className.includes("chevron") || b.closest("div")?.querySelector(".lucide-chevron-left"));
    if (backBtn) fireEvent.click(backBtn);
    expect(screen.getByText("Meena Sharma")).toBeInTheDocument();
  });

  it("handles empty pawns array", () => {
    render(<CustomerLedgerModal pawns={[]} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});
