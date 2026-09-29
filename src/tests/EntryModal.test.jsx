import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EntryModal from "../components/EntryModal";

const baseProps = {
  nextSerial: 5,
  isBoss: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

describe("EntryModal", () => {
  it("renders the modal title", () => {
    render(<EntryModal {...baseProps} />);
    expect(screen.getByText("New Pawn Entry")).toBeInTheDocument();
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    render(<EntryModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("pre-fills the serial number with nextSerial", () => {
    render(<EntryModal {...baseProps} nextSerial={42} />);
    expect(screen.getByDisplayValue("42")).toBeInTheDocument();
  });

  it("collateral type defaults to gold", () => {
    render(<EntryModal {...baseProps} />);
    const goldBtn = screen.getByRole("button", { name: /gold/i });
    expect(goldBtn.className).toMatch(/bg-amber/);
  });

  it("switching to silver updates collateral selection", () => {
    render(<EntryModal {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /silver/i }));
    const silverBtn = screen.getByRole("button", { name: /silver/i });
    expect(silverBtn.className).toMatch(/bg-slate/);
  });

  it("switching to both shows gold and silver loan fields", () => {
    render(<EntryModal {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /both/i }));
    expect(screen.getByText("Gold Loan Amount (₹)")).toBeInTheDocument();
    expect(screen.getByText("Silver Loan Amount (₹)")).toBeInTheDocument();
  });

  it("date field is read-only for non-boss", () => {
    render(<EntryModal {...baseProps} isBoss={false} />);
    const dateField = document.querySelector("input[type='date']");
    expect(dateField).toHaveAttribute("readonly");
  });

  it("date field is editable for boss", () => {
    render(<EntryModal {...baseProps} isBoss={true} />);
    const dateField = document.querySelector("input[type='date']");
    expect(dateField).not.toHaveAttribute("readonly");
  });

  it("calls onSaved with correct data on submit", () => {
    const onSaved = vi.fn();
    render(<EntryModal {...baseProps} onSaved={onSaved} />);

    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByPlaceholderText("Relative's name"), { target: { value: "Parent" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 22K Gold Necklace"), { target: { value: "Gold Ring" } });
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "10" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "5000" } });
    fireEvent.change(screen.getByPlaceholderText("2.0"), { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /save entry/i }));
    expect(onSaved).toHaveBeenCalled();
    const saved = onSaved.mock.calls[0][0];
    expect(saved.borrower_name).toBe("Test User");
    expect(saved.serial_no).toBe(5);
  });

  it("series is uppercased on save", () => {
    const onSaved = vi.fn();
    render(<EntryModal {...baseProps} onSaved={onSaved} />);

    fireEvent.change(screen.getByPlaceholderText("A"), { target: { value: "b" } });
    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Name" } });
    fireEvent.change(screen.getByPlaceholderText("Relative's name"), { target: { value: "Relative" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 22K Gold Necklace"), { target: { value: "Item" } });
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "5" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "1000" } });
    fireEvent.change(screen.getByPlaceholderText("2.0"), { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /save entry/i }));
    expect(onSaved.mock.calls[0][0].series).toBe("B");
  });

  it("shows Entry ID preview when series or serial is set", () => {
    render(<EntryModal {...baseProps} nextSerial={10} />);
    fireEvent.change(screen.getByPlaceholderText("A"), { target: { value: "A" } });
    expect(screen.getByText(/Entry ID/i)).toBeInTheDocument();
  });
});
