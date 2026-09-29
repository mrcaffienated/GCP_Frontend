import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EntryDetailCard from "../components/EntryDetailCard";

const basePawn = {
  id: "1",
  serial_no: 1,
  series: null,
  entry_date: "2023-01-01",
  borrower_name: "Rajan Kumar",
  relative_name: "Suresh Kumar",
  item_description: "Gold Necklace",
  item_weight: "20",
  collateral_type: "gold",
  loan_amount: "50000",
  interest_rate: "2",
  is_released: false,
  renewed: false,
};

const baseProps = {
  pawn: basePawn,
  onClose: vi.fn(),
  onRelease: vi.fn(),
  onMarkActive: vi.fn(),
  userRole: "boss",
  isBoss: true,
  onAddAmount: vi.fn(),
  onAddPrepayment: vi.fn(),
  onAddInterestPayment: vi.fn(),
  onRenewLoan: vi.fn(),
  nextSerial: 10,
};

describe("EntryDetailCard", () => {
  it("renders borrower name", () => {
    render(<EntryDetailCard {...baseProps} />);
    expect(screen.getByText("Rajan Kumar")).toBeInTheDocument();
  });

  it("renders item description", () => {
    render(<EntryDetailCard {...baseProps} />);
    expect(screen.getByText("Gold Necklace")).toBeInTheDocument();
  });

  it("shows Active Loan indicator for unreleased pawn", () => {
    render(<EntryDetailCard {...baseProps} />);
    expect(screen.getByText("Active Loan")).toBeInTheDocument();
  });

  it("shows Mark Released button for active pawn", () => {
    render(<EntryDetailCard {...baseProps} />);
    expect(screen.getByRole("button", { name: /mark released/i })).toBeInTheDocument();
  });

  it("shows Released indicator for released pawn", () => {
    const releasedPawn = { ...basePawn, is_released: true, released_date: "2024-01-01" };
    render(<EntryDetailCard {...baseProps} pawn={releasedPawn} />);
    expect(screen.getByText("Released")).toBeInTheDocument();
  });

  it("shows Renew button for boss on active pawn", () => {
    render(<EntryDetailCard {...baseProps} />);
    expect(screen.getByRole("button", { name: /renew/i })).toBeInTheDocument();
  });

  it("shows Renew button for employees too", () => {
    render(<EntryDetailCard {...baseProps} isBoss={false} userRole="employee" />);
    expect(screen.getByRole("button", { name: /renew/i })).toBeInTheDocument();
  });

  it("shows Add Pre-payment button", () => {
    render(<EntryDetailCard {...baseProps} />);
    expect(screen.getByText(/Add Pre-payment/i)).toBeInTheDocument();
  });

  it("shows Add Dhafa button", () => {
    render(<EntryDetailCard {...baseProps} />);
    expect(screen.getByText(/Add Dhafa/i)).toBeInTheDocument();
  });

  it("does not show Add Interest Payment button (removed)", () => {
    render(<EntryDetailCard {...baseProps} />);
    expect(screen.queryByText(/Add Interest Payment/i)).not.toBeInTheDocument();
  });

  it("shows confirm release dialog when Mark Released is clicked", () => {
    render(<EntryDetailCard {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /mark released/i }));
    expect(screen.getByText(/Confirm Release/i)).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<EntryDetailCard {...baseProps} onClose={onClose} />);
    const backdrop = document.querySelector(".fixed.inset-0.z-50");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows phone when provided", () => {
    const pawnWithPhone = { ...basePawn, phone: "9876543210" };
    render(<EntryDetailCard {...baseProps} pawn={pawnWithPhone} />);
    expect(screen.getByText(/9876543210/)).toBeInTheDocument();
  });

  it("shows aadhar when provided", () => {
    const pawnWithAadhar = { ...basePawn, aadhar: "1234 5678 9012" };
    render(<EntryDetailCard {...baseProps} pawn={pawnWithAadhar} />);
    expect(screen.getByText("1234 5678 9012")).toBeInTheDocument();
  });

  it("shows Both badge for both collateral type", () => {
    const bothPawn = { ...basePawn, collateral_type: "both", loan_amount_gold: "20000", interest_rate_gold: "2", loan_amount_silver: "10000", interest_rate_silver: "1.5" };
    render(<EntryDetailCard {...baseProps} pawn={bothPawn} />);
    expect(screen.getByText("Both")).toBeInTheDocument();
  });

  it("shows amount due for active pawn", () => {
    render(<EntryDetailCard {...baseProps} />);
    expect(screen.getByText(/Amount Due/i)).toBeInTheDocument();
  });
});
