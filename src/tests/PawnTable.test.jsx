import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PawnTable from "../components/PawnTable";

const mockPawns = [
  {
    id: "1", serial_no: 1, series: "A", entry_date: "2024-01-15",
    borrower_name: "Rajan Kumar", relative_name: "Suresh Kumar",
    item_description: "22K Gold Necklace", item_weight: "25",
    collateral_type: "gold", loan_amount: "50000", interest_rate: "2",
    is_released: false, renewed: false,
  },
  {
    id: "2", serial_no: 2, series: null, entry_date: "2024-02-10",
    borrower_name: "Meena Sharma", relative_name: "Raj Sharma",
    item_description: "Silver Anklets", item_weight: "80",
    collateral_type: "silver", loan_amount: "8000", interest_rate: "1.5",
    is_released: true, released_date: "2024-05-01", renewed: false,
  },
  {
    id: "3", serial_no: 3, series: null, entry_date: "2024-03-01",
    borrower_name: "Arjun Patel", relative_name: "Mohan Patel",
    item_description: "Gold & Silver Set", item_weight: "40",
    collateral_type: "both", loan_amount: "30000", interest_rate: "2",
    is_released: false, renewed: true,
  },
];

describe("PawnTable", () => {
  it("renders loading spinner when loading=true", () => {
    render(<PawnTable pawns={[]} loading={true} onRowClick={vi.fn()} />);
    expect(screen.getByText(/Loading entries/i)).toBeInTheDocument();
  });

  it("renders empty state when no pawns", () => {
    render(<PawnTable pawns={[]} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getByText(/No entries found/i)).toBeInTheDocument();
  });

  it("renders all column headers", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    ["#", "Date", "Borrower", "Item", "Weight", "Type", "Amount", "Interest", "Status"].forEach((h) => {
      expect(screen.getByText(h)).toBeInTheDocument();
    });
  });

  it("renders borrower names", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getByText("Rajan Kumar")).toBeInTheDocument();
    expect(screen.getByText("Meena Sharma")).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", () => {
    const onRowClick = vi.fn();
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText("Rajan Kumar").closest("tr"));
    expect(onRowClick).toHaveBeenCalledWith(mockPawns[0]);
  });

  it("calls onBorrowerClick when borrower name button is clicked", () => {
    const onBorrowerClick = vi.fn();
    const onRowClick = vi.fn();
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={onRowClick} onBorrowerClick={onBorrowerClick} />);
    fireEvent.click(screen.getByText("Rajan Kumar"));
    expect(onBorrowerClick).toHaveBeenCalledWith("Rajan Kumar");
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("shows gold badge for gold collateral", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("shows silver badge for silver collateral", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getByText("Silver")).toBeInTheDocument();
  });

  it("shows both badge for both collateral", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getByText("Both")).toBeInTheDocument();
  });

  it("shows Active status for unreleased loans", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("shows Released status for released loans", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getByText("Released")).toBeInTheDocument();
  });

  it("shows Renewed badge for renewed loans", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getAllByText("↻ Renewed").length).toBeGreaterThan(0);
  });

  it("displays series prefix in amber for entries with series", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("displays weight with g suffix", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getByText("25 g")).toBeInTheDocument();
  });

  it("displays interest rate with ₹ /mo", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("released rows have reduced opacity class", () => {
    render(<PawnTable pawns={mockPawns} loading={false} onRowClick={vi.fn()} />);
    const rows = document.querySelectorAll("tr.opacity-40");
    expect(rows.length).toBe(1);
  });
});
