import { useState, useEffect, useRef } from "react";

/** Locks body scroll for the lifetime of the component that calls it. */
function useLockBodyScroll() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);
}

// ── Smart date input (shared across all date fields) ─────────────────────────
function isoToDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function smartParseDateInput(raw, isBackspace = false) {
  let digits = raw.replace(/\D/g, "");
  if (!isBackspace) {
    if (digits.length >= 1 && parseInt(digits[0]) > 3) digits = "0" + digits;
    if (digits.length >= 3 && parseInt(digits[2]) > 1) digits = digits.slice(0, 2) + "0" + digits.slice(2);
    if (digits.length >= 5 && digits.slice(4, 6) !== "20") digits = digits.slice(0, 4) + "20" + digits.slice(4);
  }
  digits = digits.slice(0, 8);
  let display;
  if (digits.length <= 2) display = digits;
  else if (digits.length <= 4) display = digits.slice(0, 2) + "/" + digits.slice(2);
  else display = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
  if (!isBackspace && digits.length === 2) display += "/";
  if (!isBackspace && digits.length === 4) display += "/";
  let iso = "";
  if (digits.length === 8) {
    const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8);
    iso = `${y}-${m}-${d}`;
  }
  return { display, iso };
}

function SmartDateInput({ value, onChange, isBoss = true, className = "", autoFocus = false }) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const inputRef = useRef(null);
  useEffect(() => { setDisplay(value ? isoToDisplay(value) : ""); }, [value]);
  useEffect(() => { if (autoFocus) setTimeout(() => inputRef.current?.focus(), 80); }, [autoFocus]);
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        if (!isBoss) return;
        const isBackspace = e.target.value.length < display.length;
        const { display: newDisplay, iso } = smartParseDateInput(e.target.value, isBackspace);
        setDisplay(newDisplay);
        if (iso) onChange(iso);
      }}
      readOnly={!isBoss}
      placeholder="DD/MM/YY"
      maxLength={10}
      className={`font-mono ${className} ${!isBoss ? "opacity-50 cursor-not-allowed select-none" : ""}`}
    />
  );
}
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Clock, Gem, AlertTriangle, User, Phone, CreditCard, MapPin, Plus, RefreshCw, Edit2, History, ChevronDown, ChevronUp, Undo2, Trash2, ShoppingBag, Ban, Loader2 } from "lucide-react";
import { parsePhones } from "./EntryModal";
import { effectiveMonths, calcReleaseAmount } from "../utils/interest";

const FIELD_LABELS = {
  entry_date:          "Entry Date",
  borrower_name:       "Borrower Name",
  relative_name:       "Relative",
  phone:               "Phone",
  aadhar:              "Aadhar",
  address:             "Address",
  item_description:    "Item Description",
  item_weight:         "Weight (g)",
  item_weight_gold:    "Gold Weight (g)",
  item_weight_silver:  "Silver Weight (g)",
  loan_amount:         "Loan Amount",
  interest_rate:       "Interest Rate",
  loan_amount_gold:    "Gold Loan",
  interest_rate_gold:  "Gold Rate",
  loan_amount_silver:  "Silver Loan",
  interest_rate_silver:"Silver Rate",
};

const rawAmount = (v) => String(v).replace(/,/g, "");

function formatINR2(raw) {
  const clean = String(raw).replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
  if (!clean) return "";
  const [intPart, decPart] = clean.split(".");
  const formatted = Number(intPart || 0).toLocaleString("en-IN");
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

function InfoRow({ label, value, highlight, accent }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-neutral-50 dark:border-neutral-800 last:border-0">
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wide w-32 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${highlight ? "text-emerald-500" : accent ? "text-amber-500" : "text-slate-800 dark:text-slate-200"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function calcDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (months < 0) { years -= 1; months += 12; }
  const parts = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0) parts.push(`${days}d`);
  return parts.length ? parts.join(" ") : "0d";
}

function fmtINR(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function InterestBreakdownPanel({ principal, rate, entryDate, endDate, prepaid }) {
  const em = effectiveMonths(entryDate, endDate);
  const monthlyRate = parseFloat(rate) / 100;
  const annualRate = monthlyRate * 12;
  const fullYears = Math.floor(em / 12);
  const remMonths = em % 12;

  const yearSteps = [];
  let running = parseFloat(principal);
  for (let y = 1; y <= fullYears; y++) {
    running = running * (1 + annualRate);
    yearSteps.push({ year: y, amount: running });
  }
  const afterYears = running;
  const grossTotal = afterYears * (1 + monthlyRate * remMonths);
  const totalInterest = grossTotal - parseFloat(principal);
  const netTotal = grossTotal - (prepaid || 0);

  const periodParts = [];
  if (fullYears > 0) periodParts.push(`${fullYears}y`);
  if (remMonths === 0.5) periodParts.push("15d");
  else if (remMonths > 0) periodParts.push(`${remMonths}m`);
  const periodLabel = periodParts.length ? periodParts.join(" ") : "15d";

  const hasPrepaid = prepaid && prepaid > 0;

  return (
    <div className="bg-neutral-800/60 rounded-2xl p-4 mt-2 border border-neutral-700 space-y-2">
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">Interest Breakdown</p>
      <div className="border-b border-neutral-700 pb-2 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-400">Principal</span>
          <span className="text-slate-200 font-medium">{fmtINR(principal)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-neutral-400">Period</span>
          <span className="text-slate-200 font-medium">{periodLabel}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-neutral-400">Rate</span>
          <span className="text-slate-200 font-medium">{rate}% /month</span>
        </div>
      </div>
      {yearSteps.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {yearSteps.map((s) => (
            <div key={s.year} className="flex justify-between text-xs">
              <span className="text-neutral-400">After Year {s.year} ({(annualRate * 100).toFixed(0)}% annual)</span>
              <span className="text-slate-300 font-medium">{fmtINR(s.amount)}</span>
            </div>
          ))}
        </div>
      )}
      {remMonths > 0 && (
        <div className="flex justify-between text-xs pt-0.5">
          <span className="text-neutral-400">+ {remMonths} month{remMonths > 1 ? "s" : ""} simple interest</span>
          <span className="text-slate-300 font-medium">{fmtINR(grossTotal - afterYears)}</span>
        </div>
      )}
      <div className="border-t border-neutral-700 pt-2 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-400">Total Interest</span>
          <span className="text-amber-400 font-semibold">{fmtINR(totalInterest)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold">
          <span className="text-neutral-300">{hasPrepaid ? "Gross Total" : "Total Due"}</span>
          <span className="text-emerald-400">{fmtINR(grossTotal)}</span>
        </div>
        {hasPrepaid && (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-400">− Prepaid</span>
              <span className="text-emerald-400 font-medium">−{fmtINR(prepaid)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-neutral-700 pt-1.5">
              <span className="text-neutral-300">Net Total</span>
              <span className="text-emerald-400">{fmtINR(netTotal)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReleaseInterestPreview({ pawn, releaseDate }) {
  if (!pawn || !pawn.entry_date || !releaseDate) return null;

  const isBoth = pawn.collateral_type === "both";

  if (isBoth) {
    const goldLoan    = parseFloat(pawn.loan_amount_gold   || 0);
    const silverLoan  = parseFloat(pawn.loan_amount_silver || 0);
    const goldRate    = parseFloat(pawn.interest_rate_gold   || 0);
    const silverRate  = parseFloat(pawn.interest_rate_silver || 0);

    const goldTotal   = goldLoan  > 0 ? calcReleaseAmount(goldLoan,   goldRate,   pawn.entry_date, releaseDate) : 0;
    const silverTotal = silverLoan > 0 ? calcReleaseAmount(silverLoan, silverRate, pawn.entry_date, releaseDate) : 0;
    const grandTotal  = goldTotal + silverTotal;
    const em          = effectiveMonths(pawn.entry_date, releaseDate);

    const periodParts = [];
    const fullYears   = Math.floor(em / 12);
    const remMonths   = em % 12;
    if (fullYears > 0) periodParts.push(`${fullYears}y`);
    if (remMonths === 0.5) periodParts.push("15d");
    else if (remMonths > 0) periodParts.push(`${remMonths}m`);
    const periodLabel = periodParts.length ? periodParts.join(" ") : "15d";

    return (
      <div className="mt-3 bg-neutral-800/60 border border-neutral-700 rounded-2xl p-3 space-y-2 text-left">
        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">Interest Preview · {periodLabel}</p>
        <div className="space-y-1.5">
          {goldLoan > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-amber-400/80">🥇 Gold ({goldRate}%/mo)</span>
              <span className="text-amber-400 font-semibold">{fmtINR(goldTotal)}</span>
            </div>
          )}
          {silverLoan > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-400/80">🥈 Silver ({silverRate}%/mo)</span>
              <span className="text-slate-300 font-semibold">{fmtINR(silverTotal)}</span>
            </div>
          )}
          <div className="border-t border-neutral-700 pt-1.5 flex justify-between text-sm font-bold">
            <span className="text-neutral-300">Total Due</span>
            <span className="text-emerald-400">{fmtINR(grandTotal)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Single collateral
  const loan    = parseFloat(pawn.loan_amount  || 0);
  const rate    = parseFloat(pawn.interest_rate || 0);
  if (!loan || !rate) return null;

  const total    = calcReleaseAmount(loan, rate, pawn.entry_date, releaseDate);
  const interest = total - loan;
  const em       = effectiveMonths(pawn.entry_date, releaseDate);

  const periodParts = [];
  const fullYears   = Math.floor(em / 12);
  const remMonths   = em % 12;
  if (fullYears > 0) periodParts.push(`${fullYears}y`);
  if (remMonths === 0.5) periodParts.push("15d");
  else if (remMonths > 0) periodParts.push(`${remMonths}m`);
  const periodLabel = periodParts.length ? periodParts.join(" ") : "15d";

  return (
    <div className="mt-3 bg-neutral-800/60 border border-neutral-700 rounded-2xl p-3 space-y-1.5 text-left">
      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">Interest Preview · {periodLabel}</p>
      <div className="flex justify-between text-xs">
        <span className="text-neutral-400">Principal</span>
        <span className="text-slate-300">{fmtINR(loan)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-neutral-400">Interest ({rate}%/mo)</span>
        <span className="text-amber-400 font-semibold">{fmtINR(interest)}</span>
      </div>
      <div className="border-t border-neutral-700 pt-1.5 flex justify-between text-sm font-bold">
        <span className="text-neutral-300">Total Due</span>
        <span className="text-emerald-400">{fmtINR(total)}</span>
      </div>
    </div>
  );
}

function ConfirmRelease({ pawn, borrowerName, isBoss, onConfirm, onCancel }) {
  useLockBodyScroll();
  const today = new Date().toISOString().split("T")[0];
  const [releaseDate, setReleaseDate] = useState(today);
  const [actualAmount, setActualAmount] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Compute calculated due whenever date changes, to pre-fill the amount field
  useEffect(() => {
    if (!pawn?.entry_date || !releaseDate) return;
    try {
      let calc = 0;
      if (pawn.collateral_type === "both") {
        const g = parseFloat(pawn.loan_amount_gold || 0);
        const s = parseFloat(pawn.loan_amount_silver || 0);
        const gr = parseFloat(pawn.interest_rate_gold || 0);
        const sr = parseFloat(pawn.interest_rate_silver || 0);
        if (g > 0 && gr > 0) calc += calcReleaseAmount(g, gr, pawn.entry_date, releaseDate);
        else calc += g;
        if (s > 0 && sr > 0) calc += calcReleaseAmount(s, sr, pawn.entry_date, releaseDate);
        else calc += s;
      } else {
        const loan = parseFloat(pawn.loan_amount || 0);
        const rate = parseFloat(pawn.interest_rate || 0);
        calc = loan > 0 && rate > 0 ? calcReleaseAmount(loan, rate, pawn.entry_date, releaseDate) : loan;
        // subtract prepayments
        const prepaid = (pawn.prepayments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
        calc = Math.max(0, calc - prepaid);
      }
      setActualAmount(Math.round(calc).toString());
    } catch { /* ignore */ }
  }, [releaseDate, pawn]);

  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); onConfirm(releaseDate, actualAmount || null); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [releaseDate, actualAmount, onConfirm]);

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black/60"
      style={{ zIndex: 60 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Confirm Release</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Mark <span className="font-medium text-slate-700 dark:text-slate-300">{borrowerName}</span>'s loan as released?
        </p>

        {isBoss && (
          <div className="mb-2 text-left">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              Release Date
            </label>
            <SmartDateInput
              value={releaseDate}
              onChange={setReleaseDate}
              isBoss={isBoss}
              autoFocus
              className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <p className="text-xs text-slate-400 mt-1">You can backdate this for historical entries.</p>
          </div>
        )}

        <ReleaseInterestPreview pawn={pawn} releaseDate={releaseDate} />

        {/* Actual amount collected — editable override */}
        <div className="mt-3 text-left">
          <label className="block text-xs font-medium text-slate-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
            Amount Collected <span className="normal-case text-neutral-500 font-normal">(edit to adjust)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-medium">₹</span>
            <input
              type="number"
              min="0"
              step="1"
              value={actualAmount}
              onChange={e => setActualAmount(e.target.value)}
              className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-slate-100 rounded-xl pl-7 pr-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
              placeholder="0"
            />
          </div>
          {actualAmount && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              Saving ₹{Number(actualAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 })} as collected amount
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 border border-neutral-200 dark:border-neutral-700 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            disabled={confirming}
            onClick={async () => { setConfirming(true); await onConfirm(releaseDate, actualAmount || null); }}
            className={`flex-1 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors ${confirming ? "opacity-70 cursor-not-allowed" : "hover:bg-slate-700 dark:hover:bg-emerald-500"}`}
          >
            {confirming ? (
              <span className="flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />Releasing…
              </span>
            ) : "Yes, Release"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConfirmSold({ pawn, borrowerName, isBoss, onConfirm, onCancel }) {
  useLockBodyScroll();
  const today = new Date().toISOString().split("T")[0];
  const [soldDate, setSoldDate] = useState(today);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); onConfirm(soldDate); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [soldDate, onConfirm]);

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black/60"
      style={{ zIndex: 60 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6 text-center"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-6 h-6 text-violet-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Mark as Sold?</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Mark <span className="font-medium text-slate-700 dark:text-slate-300">{borrowerName}</span>'s item as sold? No interest will be charged.
        </p>

        {isBoss ? (
          <div className="mb-2 text-left">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              Sold Date
            </label>
            <SmartDateInput
              value={soldDate}
              onChange={setSoldDate}
              isBoss={isBoss}
              autoFocus
              className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <p className="text-xs text-slate-400 mt-1">You can backdate this for historical entries.</p>
          </div>
        ) : (
          <div className="mb-2 text-left">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              Sold Date
            </label>
            <div className="w-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400 rounded-xl px-4 py-2.5 text-sm">
              {today} <span className="text-xs">(today)</span>
            </div>
          </div>
        )}

        {/* Accrued interest info panel for sold */}
        {pawn && pawn.entry_date && soldDate && (
          <div className="mb-4 bg-violet-950/30 border border-violet-800/40 rounded-2xl p-3 text-left space-y-1.5">
            <p className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-widest">Accrued Interest (waived on sale)</p>
            {pawn.collateral_type === "both" ? (
              <>
                {parseFloat(pawn.loan_amount_gold || 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">🥇 Gold loan</span>
                    <span className="text-slate-300 font-medium">{fmtINR(parseFloat(pawn.loan_amount_gold))}</span>
                  </div>
                )}
                {parseFloat(pawn.loan_amount_silver || 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">🥈 Silver loan</span>
                    <span className="text-slate-300 font-medium">{fmtINR(parseFloat(pawn.loan_amount_silver))}</span>
                  </div>
                )}
              </>
            ) : null}
            <div className="flex justify-between text-xs border-t border-violet-800/30 pt-1.5">
              <span className="text-neutral-400">Loan amount</span>
              <span className="text-violet-300 font-semibold">{fmtINR(parseFloat(pawn.loan_amount || 0))}</span>
            </div>
            <p className="text-[10px] text-neutral-500 pt-0.5">Interest is not charged when marking as sold.</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 border border-neutral-200 text-slate-600 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            disabled={confirming}
            onClick={async () => { setConfirming(true); await onConfirm(soldDate); }}
            className={`flex-1 bg-violet-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors ${confirming ? "opacity-70 cursor-not-allowed" : "hover:bg-violet-700"}`}
          >
            {confirming ? (
              <span className="flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…
              </span>
            ) : "Yes, Mark Sold"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black/70"
      style={{ zIndex: 70 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6 text-center"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">Delete {label}?</h3>
        <p className="text-sm text-neutral-400 mb-5">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-neutral-700 text-neutral-300 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


function ConfirmCancel({ borrowerName, serialNo, onConfirm, onCancel }) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black/70"
      style={{ zIndex: 70 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6 text-center"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Ban className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">Cancel Bill #{serialNo}?</h3>
        <p className="text-sm text-neutral-400 mb-1">{borrowerName}</p>
        <p className="text-sm text-neutral-500 mb-5">Interest will be waived (0%) and the bill marked Cancelled. The entry is kept and can be restored.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-neutral-700 text-neutral-300 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Cancel Bill
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


function AddAmountForm({ pawn, isBoss, onAdd, onCancel }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr);
  const defaultRate = pawn.collateral_type === "both"
    ? String(((parseFloat(pawn.interest_rate_gold || 0) + parseFloat(pawn.interest_rate_silver || 0)) / 2) || "")
    : (pawn.interest_rate || "");
  const [interestRate, setInterestRate] = useState(defaultRate);
  const [note, setNote] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(rawAmount(amount));
    if (!parsed || parsed <= 0) return;
    onAdd({ id: Date.now().toString(), amount: parsed.toFixed(2), date, interest_rate: interestRate, note });
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.12 }}
      className="overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="mt-3 p-4 bg-neutral-800/50 rounded-2xl border border-neutral-700 space-y-3">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">New Dhafa Entry</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(formatINR2(e.target.value))}
                required
                className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Date</label>
            <SmartDateInput
              value={date}
              onChange={setDate}
              isBoss={isBoss}
              className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Interest Rate (% /mo)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.1"
                max="100"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40"
                placeholder="2.0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40"
              placeholder="Optional note"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit"
            className="flex-1 bg-amber-500 text-slate-900 rounded-xl py-2 text-sm font-semibold hover:bg-amber-400 transition-colors">
            Add
          </button>
          <button type="button" onClick={onCancel}
            className="flex-1 border border-neutral-700 text-neutral-400 rounded-xl py-2 text-sm font-medium hover:bg-neutral-800 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function AddPrepaymentForm({ isBoss, onAdd, onCancel }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr);
  const [note, setNote] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(rawAmount(amount));
    if (!parsed || parsed <= 0) return;
    onAdd({ id: Date.now().toString(), amount: parsed.toFixed(2), date, note });
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.12 }}
      className="overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="mt-3 p-4 bg-emerald-950/30 rounded-2xl border border-emerald-800/50 space-y-3">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">New Pre-payment</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(formatINR2(e.target.value))}
                required
                className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Date</label>
            <SmartDateInput
              value={date}
              onChange={setDate}
              isBoss={isBoss}
              className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40"
            placeholder="Optional note"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit"
            className="flex-1 bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-emerald-500 transition-colors">
            Add
          </button>
          <button type="button" onClick={onCancel}
            className="flex-1 border border-neutral-700 text-neutral-400 rounded-xl py-2 text-sm font-medium hover:bg-neutral-800 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function AddInterestPaymentForm({ isBoss, onAdd, onCancel }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr);
  const [note, setNote] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(rawAmount(amount));
    if (!parsed || parsed <= 0) return;
    onAdd({ id: Date.now().toString(), amount: parsed.toFixed(2), date, note });
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.12 }}
      className="overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="mt-3 p-4 bg-sky-950/30 rounded-2xl border border-sky-800/50 space-y-3">
        <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest">New Interest Payment</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(formatINR2(e.target.value))}
                required
                className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Date</label>
            <SmartDateInput
              value={date}
              onChange={setDate}
              isBoss={isBoss}
              className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40"
            placeholder="Optional note"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit"
            className="flex-1 bg-sky-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-sky-500 transition-colors">
            Add
          </button>
          <button type="button" onClick={onCancel}
            className="flex-1 border border-neutral-700 text-neutral-400 rounded-xl py-2 text-sm font-medium hover:bg-neutral-800 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
}

const RELATIVE_TYPES = ["Father", "Spouse"];

function parseRelativeType(val) {
  if (!val) return { type: "Father", name: "" };
  for (const t of RELATIVE_TYPES) {
    if (val.startsWith(`${t}: `)) return { type: t, name: val.slice(t.length + 2) };
  }
  return { type: "Father", name: val };
}

function EditEntryModal({ pawn, isBoss, editedBy, onSave, onCancel }) {
  useLockBodyScroll();
  const isBoth = pawn.collateral_type === "both";

  const parsed = parseRelativeType(pawn.relative_name);
  const [relativeType, setRelativeType] = useState(parsed.type);

  const [form, setForm] = useState({
    entry_date:           pawn.entry_date || "",
    borrower_name:        pawn.borrower_name || "",
    relative_name:        parsed.name,
    phones:               parsePhones(pawn.phone).length > 0 ? parsePhones(pawn.phone) : [""],
    aadhar:               pawn.aadhar || "",
    address:              pawn.address || "",
    item_description:     pawn.item_description || "",
    item_weight:          !isBoth ? (pawn.item_weight || "") : "",
    item_weight_gold:     isBoth ? (pawn.item_weight_gold || "") : "",
    item_weight_silver:   isBoth ? (pawn.item_weight_silver || "") : "",
    loan_amount:          !isBoth ? (pawn.loan_amount || "") : "",
    interest_rate:        !isBoth ? (pawn.interest_rate || "") : "",
    loan_amount_gold:     pawn.loan_amount_gold || "",
    interest_rate_gold:   pawn.interest_rate_gold || "",
    loan_amount_silver:   pawn.loan_amount_silver || "",
    interest_rate_silver: pawn.interest_rate_silver || "",
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  function handleSave(e) {
    e.preventDefault();
    // Serialize phones → phone JSON string
    const phoneJson = JSON.stringify(form.phones.map(p => p.trim()).filter(Boolean)) || null;

    // Prefix relative_name with selected type before saving
    const relNameFull = form.relative_name.trim()
      ? `${relativeType}: ${form.relative_name.trim()}`
      : "";

    const formWithType = { ...form, relative_name: relNameFull };

    const editableFields = isBoth
      ? ["entry_date","borrower_name","relative_name","aadhar","address",
         "item_description","item_weight_gold","item_weight_silver",
         "loan_amount_gold","interest_rate_gold","loan_amount_silver","interest_rate_silver"]
      : ["entry_date","borrower_name","relative_name","aadhar","address",
         "item_description","item_weight","loan_amount","interest_rate"];

    const changes = editableFields.reduce((acc, field) => {
      const oldVal = String(pawn[field] || "").trim();
      const newVal = String(formWithType[field] || "").trim();
      if (newVal !== "" && oldVal !== newVal) {
        acc.push({ field, label: FIELD_LABELS[field] || field, old_value: oldVal || "—", new_value: newVal });
      }
      return acc;
    }, []);

    // Check if phones changed
    if (phoneJson !== pawn.phone) {
      changes.push({ field: "phone", label: "Phone", old_value: pawn.phone || "—", new_value: phoneJson });
    }

    if (changes.length === 0) { onCancel(); return; }

    const updatedFields = {};
    changes.forEach(c => { updatedFields[c.field] = c.new_value; });

    // Recalculate combined fields for "both" type
    if (isBoth) {
      const g = parseFloat(updatedFields.loan_amount_gold ?? pawn.loan_amount_gold ?? 0) || 0;
      const s = parseFloat(updatedFields.loan_amount_silver ?? pawn.loan_amount_silver ?? 0) || 0;
      updatedFields.loan_amount = (g + s).toFixed(2);

      const gw = parseFloat(updatedFields.item_weight_gold ?? pawn.item_weight_gold ?? 0) || 0;
      const sw = parseFloat(updatedFields.item_weight_silver ?? pawn.item_weight_silver ?? 0) || 0;
      if (gw || sw) updatedFields.item_weight = (gw + sw).toFixed(2);
    }

    const editEntry = {
      id: `edit-${Date.now()}`,
      edited_at: new Date().toISOString(),
      edited_by: editedBy || { username: "unknown", name: "Unknown" },
      changes,
    };

    onSave(updatedFields, editEntry);
  }

  const inputCls = "w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 placeholder-neutral-600";
  const labelCls = "block text-xs text-neutral-400 mb-1 uppercase tracking-widest font-semibold";
  const amountInputCls = `${inputCls} pl-7`;

  return (
    <motion.div
      className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/65"
      style={{ zIndex: 70 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md sm:mx-4 overflow-hidden max-h-[95vh] sm:max-h-none flex flex-col"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-neutral-800 shrink-0">
          <Edit2 className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-bold text-white">Edit Entry</h2>
          <span className="ml-auto text-xs text-neutral-500 font-mono">
            {pawn.series ? <><span className="text-amber-400">{pawn.series}</span>{pawn.serial_no}</> : `#${pawn.serial_no}`}
          </span>
        </div>

        <form onSubmit={handleSave} className="px-5 sm:px-6 py-4 space-y-3 overflow-y-auto flex-1">

          {/* Entry date — boss only */}
          {isBoss && (
            <div>
              <label className={labelCls}>Entry Date</label>
              <SmartDateInput value={form.entry_date} onChange={(iso) => set("entry_date", iso)} isBoss={isBoss} className={inputCls} />
            </div>
          )}

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:items-end">
            <div>
              <label className={labelCls}>Borrower Name</label>
              <input type="text" value={form.borrower_name} onChange={e => set("borrower_name", e.target.value)} required className={inputCls} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls.replace("mb-1","mb-0")}>{relativeType}'s Name</label>
                <div className="flex gap-1">
                  {["Father", "Spouse"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRelativeType(t)}
                      className={`px-3 py-0.5 rounded-lg text-xs font-semibold transition-all border ${
                        relativeType === t
                          ? "bg-amber-500 text-slate-900 border-amber-500"
                          : "bg-transparent text-neutral-400 border-neutral-700 hover:border-amber-500/50 hover:text-amber-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <input type="text" value={form.relative_name} onChange={e => set("relative_name", e.target.value)} required className={inputCls} placeholder={`${relativeType}'s full name`} />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Phone</label>
              <div className="space-y-1.5">
                {form.phones.map((ph, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">+91</span>
                      <input
                        type="tel" inputMode="numeric"
                        value={ph}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g,"").slice(0,10);
                          const upd = [...form.phones]; upd[idx] = val; set("phones", upd);
                        }}
                        className={`${inputCls} pl-9 font-mono`} placeholder="9876543210" maxLength={10}
                      />
                    </div>
                    {form.phones.length > 1 && (
                      <button type="button"
                        onClick={() => set("phones", form.phones.filter((_,i) => i !== idx))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {form.phones.length < 4 && (
                  <button type="button"
                    onClick={() => set("phones", [...form.phones, ""])}
                    className="flex items-center gap-1 text-xs text-amber-400/60 hover:text-amber-400 transition-colors">
                    <Plus className="w-3 h-3" /> Add number
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className={labelCls}>Aadhar</label>
              <input type="text" inputMode="numeric" value={form.aadhar}
                onChange={e => set("aadhar", e.target.value.replace(/\D/g,"").slice(0,12).replace(/(\d{4})(?=\d)/g,"$1 ").trim())}
                className={`${inputCls} font-mono tracking-widest`} placeholder="XXXX XXXX XXXX" maxLength={14} />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={labelCls}>Address</label>
            <textarea value={form.address} onChange={e => set("address", e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Street, City" />
          </div>

          {/* Item */}
          <div>
            <label className={labelCls}>Item Description</label>
            <input type="text" value={form.item_description} onChange={e => set("item_description", e.target.value)} required className={inputCls} />
          </div>

          {isBoth ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Gold Weight (g)</label>
                <div className="relative">
                  <input type="number" min="0" step="0.01" value={form.item_weight_gold} onChange={e => set("item_weight_gold", e.target.value)} className={`${inputCls} pr-8`} placeholder="0.00" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-500 font-medium">g</span>
                </div>
              </div>
              <div>
                <label className={labelCls}>Silver Weight (g)</label>
                <div className="relative">
                  <input type="number" min="0" step="0.01" value={form.item_weight_silver} onChange={e => set("item_weight_silver", e.target.value)} className={`${inputCls} pr-8`} placeholder="0.00" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">g</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Weight (g)</label>
              <div className="relative">
                <input type="number" min="0" step="0.01" value={form.item_weight} onChange={e => set("item_weight", e.target.value)} className={`${inputCls} pr-8`} placeholder="0.00" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-medium">g</span>
              </div>
            </div>
          )}

          {/* Amounts */}
          {isBoth ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Gold Loan (₹)</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
                    <input type="number" min="0" step="0.01" value={form.loan_amount_gold} onChange={e => set("loan_amount_gold", e.target.value)} className={amountInputCls} placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Gold Rate (% /mo)</label>
                  <div className="relative">
                    <input type="number" min="0" step="0.1" max="100" value={form.interest_rate_gold} onChange={e => set("interest_rate_gold", e.target.value)} className={`${inputCls} pr-8`} placeholder="2.0" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">%</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Silver Loan (₹)</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
                    <input type="number" min="0" step="0.01" value={form.loan_amount_silver} onChange={e => set("loan_amount_silver", e.target.value)} className={amountInputCls} placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Silver Rate (% /mo)</label>
                  <div className="relative">
                    <input type="number" min="0" step="0.1" max="100" value={form.interest_rate_silver} onChange={e => set("interest_rate_silver", e.target.value)} className={`${inputCls} pr-8`} placeholder="1.5" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">%</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Loan Amount (₹)</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
                  <input type="number" min="0" step="0.01" value={form.loan_amount} onChange={e => set("loan_amount", e.target.value)} className={amountInputCls} placeholder="0" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Interest Rate (% /mo)</label>
                <div className="relative">
                  <input type="number" min="0" step="0.1" max="100" value={form.interest_rate} onChange={e => set("interest_rate", e.target.value)} className={`${inputCls} pr-8`} placeholder="2.0" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">%</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="flex-1 border border-neutral-700 text-neutral-400 rounded-2xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors">
              Cancel
            </button>
            <button type="submit" id="edit-save-btn"
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-2xl py-2.5 text-sm font-bold hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5">
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function LinkRenewalModal({ pawn, allPawns, onConfirm, onCancel }) {
  useLockBodyScroll();
  const [serialInput, setSerialInput] = useState("");
  const [seriesInput, setSeriesInput] = useState("");
  const [error, setError] = useState("");
  const [foundPawn, setFoundPawn] = useState(null); // step-2 preview

  function handleSubmit(e) {
    e.preventDefault();
    const serial = parseInt(serialInput.trim(), 10);
    if (!serial || serial <= 0) { setError("Enter a valid serial number."); return; }

    const normalizedSeries = seriesInput.trim().toUpperCase() || null;
    const match = allPawns.find(p =>
      Number(p.serial_no) === serial &&
      (p.series || null) === normalizedSeries &&
      p.id !== pawn.id
    );

    if (!match) {
      setError(`Entry #${normalizedSeries || ""}${serial} does not exist.`);
      setFoundPawn(null);
      return;
    }
    setError("");
    setFoundPawn(match);
  }

  const CTYPE_LABEL = { gold: "Gold", silver: "Silver", both: "Both" };
  const CTYPE_COLOR = { gold: "text-amber-400 bg-amber-500/10 border-amber-500/20", silver: "text-slate-300 bg-slate-500/10 border-slate-500/20", both: "text-amber-300 bg-amber-500/10 border-amber-500/20" };

  return (
    <motion.div
      className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/65"
      style={{ zIndex: 70 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm sm:mx-4 overflow-hidden"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>

        <AnimatePresence mode="wait">
          {!foundPawn ? (
            /* ── Step 1: Enter old serial ── */
            <motion.div key="input"
              initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.1 }}
            >
              <div className="flex items-center gap-2 px-5 pt-4 pb-4 border-b border-neutral-800">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-bold text-white">Renewed From</h2>
              </div>
              <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
                <p className="text-sm text-neutral-400">
                  Enter the old bill's serial number to look it up.
                </p>
                <div className="flex gap-2">
                  <div className="w-24">
                    <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-widest">Series</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={seriesInput}
                      onChange={e => { setSeriesInput(e.target.value.toUpperCase()); setError(""); setFoundPawn(null); }}
                      placeholder="A"
                      className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder-neutral-600"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-widest">Serial No</label>
                    <input
                      type="number"
                      min="1"
                      value={serialInput}
                      onChange={e => { setSerialInput(e.target.value); setError(""); setFoundPawn(null); }}
                      placeholder="e.g. 142"
                      required
                      autoFocus
                      className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder-neutral-600"
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={onCancel}
                    className="flex-1 border border-neutral-700 text-neutral-400 rounded-2xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-2xl py-2.5 text-sm font-bold hover:from-amber-400 hover:to-amber-300 transition-all">
                    Look Up →
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* ── Step 2: Preview + Confirm ── */
            <motion.div key="preview"
              initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.1 }}
            >
              <div className="flex items-center gap-2 px-5 pt-4 pb-4 border-b border-neutral-800">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-bold text-white">Confirm Link & Release</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                <p className="text-xs text-neutral-500">Verify this is the correct old bill before confirming.</p>

                {/* Old bill preview card */}
                <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400 text-lg">
                      #{(foundPawn.series || "") + foundPawn.serial_no}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border ${CTYPE_COLOR[foundPawn.collateral_type] || CTYPE_COLOR.gold}`}>
                      {CTYPE_LABEL[foundPawn.collateral_type] || foundPawn.collateral_type}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Borrower</span>
                      <span className="text-slate-200 font-medium">{foundPawn.borrower_name}</span>
                    </div>
                    {foundPawn.relative_name && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Relative</span>
                        <span className="text-slate-300 text-xs">{foundPawn.relative_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Entry Date</span>
                      <span className="text-slate-300 font-mono text-xs">{foundPawn.entry_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Loan Amount</span>
                      <span className="text-slate-200 font-semibold">₹{Number(foundPawn.loan_amount).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Status</span>
                      {foundPawn.is_released
                        ? <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">Released</span>
                        : <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg">Active</span>
                      }
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 text-center">
                  This will mark <span className="text-amber-400 font-semibold">#{(foundPawn.series || "") + foundPawn.serial_no}</span> as released and link it to the current bill.
                  <br />This action cannot be undone once confirmed.
                </p>

                <div className="flex gap-2">
                  <button onClick={() => setFoundPawn(null)}
                    className="flex-1 border border-neutral-700 text-neutral-400 rounded-2xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors">
                    ← Back
                  </button>
                  <button
                    onClick={() => onConfirm(parseInt(serialInput.trim(), 10), seriesInput.trim() || null)}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-2xl py-2.5 text-sm font-bold hover:from-amber-400 hover:to-amber-300 transition-all"
                  >
                    Confirm & Link
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}


function RenewLoanModal({ pawn, totalDue, nextSerial, onConfirm, onCancel }) {
  useLockBodyScroll();
  const todayStr = new Date().toISOString().split("T")[0];
  const isBoth = pawn.collateral_type === "both";

  // ── Single-type state ────────────────────────────────────────
  const [additional, setAdditional] = useState("");
  const [paid, setPaid] = useState("");
  const [interestRate, setInterestRate] = useState(pawn.interest_rate || "");

  // ── Both-type state — independent gold & silver controls ─────
  const origGold   = parseFloat(pawn.loan_amount_gold   || 0);
  const origSilver = parseFloat(pawn.loan_amount_silver || 0);

  const [goldAdditional,   setGoldAdditional]   = useState("");
  const [goldPaid,         setGoldPaid]          = useState("");
  const [goldRate,         setGoldRate]          = useState(pawn.interest_rate_gold   || "");
  const [silverAdditional, setSilverAdditional]  = useState("");
  const [silverPaid,       setSilverPaid]        = useState("");
  const [silverRate,       setSilverRate]        = useState(pawn.interest_rate_silver || "");

  // ── Shared state ─────────────────────────────────────────────
  const [newSerial,  setNewSerial]  = useState(String(nextSerial || ""));
  const [series,     setSeries]     = useState(pawn.series || "");
  const [entryDate,  setEntryDate]  = useState(todayStr);

  // ── Derived amounts ──────────────────────────────────────────
  // Single type
  const additionalVal = parseFloat(rawAmount(additional)) || 0;
  const paidVal       = parseFloat(rawAmount(paid))       || 0;
  const newTotal      = Math.max(0, totalDue + additionalVal - paidVal);

  // Both type — each metal calculated independently
  const goldAddVal    = parseFloat(rawAmount(goldAdditional))   || 0;
  const goldPaidVal   = parseFloat(rawAmount(goldPaid))         || 0;
  const silverAddVal  = parseFloat(rawAmount(silverAdditional)) || 0;
  const silverPaidVal = parseFloat(rawAmount(silverPaid))       || 0;
  const newGoldAmt    = Math.max(0, origGold   + goldAddVal   - goldPaidVal);
  const newSilverAmt  = Math.max(0, origSilver + silverAddVal - silverPaidVal);
  const newBothTotal  = newGoldAmt + newSilverAmt;

  // ── Helpers ──────────────────────────────────────────────────
  const inputCls = "w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40";
  const amtCls   = `${inputCls} pl-7`;
  const rateCls  = `${inputCls} pr-8`;

  function handleConfirm() {
    if (isBoth) {
      onConfirm({
        borrower_name:        pawn.borrower_name,
        relative_name:        pawn.relative_name,
        phone:                pawn.phone,
        aadhar:               pawn.aadhar,
        address:              pawn.address,
        item_description:     pawn.item_description,
        item_weight:          pawn.item_weight,
        item_weight_gold:     pawn.item_weight_gold,
        item_weight_silver:   pawn.item_weight_silver,
        collateral_type:      "both",
        loan_amount:          newBothTotal.toFixed(2),
        loan_amount_gold:     newGoldAmt.toFixed(2),
        interest_rate_gold:   goldRate,
        loan_amount_silver:   newSilverAmt.toFixed(2),
        interest_rate_silver: silverRate,
        serial_no:            parseInt(newSerial, 10) || nextSerial,
        series,
        entry_date:           entryDate,
      });
    } else {
      onConfirm({
        borrower_name:    pawn.borrower_name,
        relative_name:    pawn.relative_name,
        phone:            pawn.phone,
        aadhar:           pawn.aadhar,
        address:          pawn.address,
        item_description: pawn.item_description,
        item_weight:      pawn.item_weight,
        collateral_type:  pawn.collateral_type,
        loan_amount:      newTotal.toFixed(2),
        interest_rate:    interestRate,
        serial_no:        parseInt(newSerial, 10) || nextSerial,
        series,
        entry_date:       entryDate,
      });
    }
  }

  return (
    <motion.div
      className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/65"
      style={{ zIndex: 70 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm sm:mx-4 overflow-hidden max-h-[95vh] sm:max-h-none flex flex-col"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-neutral-800 shrink-0">
          <RefreshCw className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-bold text-white">Renew Loan</h2>
        </div>

        <div className="px-5 sm:px-6 py-4 space-y-4 overflow-y-auto flex-1">

          {/* Borrower summary */}
          <div className="bg-neutral-800/60 rounded-2xl px-4 py-3 space-y-1">
            <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Borrower</p>
            <p className="text-sm font-semibold text-slate-200">{pawn.borrower_name}</p>
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-neutral-400">Current Amount Due</span>
              <span className="text-sm font-bold text-amber-400">{fmtINR(totalDue)}</span>
            </div>
            {isBoth && (
              <div className="flex gap-3 pt-0.5 text-xs">
                <span className="text-amber-400/80">🥇 Gold: {fmtINR(origGold)}</span>
                <span className="text-slate-400/80">🥈 Silver: {fmtINR(origSilver)}</span>
              </div>
            )}
          </div>

          {isBoth ? (
            /* ── Both: independent gold + silver adjustment ── */
            <>
              {/* Gold section */}
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">🥇 Gold</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">+ Additional</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
                      <input type="text" inputMode="decimal" value={goldAdditional}
                        onChange={e => setGoldAdditional(formatINR2(e.target.value))}
                        className={amtCls} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">− Paid</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
                      <input type="text" inputMode="decimal" value={goldPaid}
                        onChange={e => setGoldPaid(formatINR2(e.target.value))}
                        className={amtCls} placeholder="0" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-0.5">New Gold Loan</p>
                    <p className="text-sm font-bold text-amber-400">{fmtINR(newGoldAmt)}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Rate (% /mo)</label>
                    <div className="relative">
                      <input type="text" inputMode="decimal" value={goldRate}
                        onChange={e => setGoldRate(e.target.value.replace(/[^0-9.]/g,"").replace(/(\..*?)\..*/g,"$1"))}
                        className={rateCls} placeholder="2.0" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Silver section */}
              <div className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-3 space-y-2">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">🥈 Silver</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">+ Additional</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
                      <input type="text" inputMode="decimal" value={silverAdditional}
                        onChange={e => setSilverAdditional(formatINR2(e.target.value))}
                        className={amtCls} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">− Paid</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
                      <input type="text" inputMode="decimal" value={silverPaid}
                        onChange={e => setSilverPaid(formatINR2(e.target.value))}
                        className={amtCls} placeholder="0" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl px-3 py-2 text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-0.5">New Silver Loan</p>
                    <p className="text-sm font-bold text-slate-300">{fmtINR(newSilverAmt)}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Rate (% /mo)</label>
                    <div className="relative">
                      <input type="text" inputMode="decimal" value={silverRate}
                        onChange={e => setSilverRate(e.target.value.replace(/[^0-9.]/g,"").replace(/(\..*?)\..*/g,"$1"))}
                        className={rateCls} placeholder="1.5" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Combined new total */}
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">New Total Loan</span>
                <span className="text-lg font-bold text-emerald-400">{fmtINR(newBothTotal)}</span>
              </div>
            </>
          ) : (
            /* ── Single type: gold or silver ── */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">+ Additional Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
                    <input type="text" inputMode="decimal" value={additional}
                      onChange={e => setAdditional(formatINR2(e.target.value))}
                      className={amtCls} placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">− Amount Paid</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
                    <input type="text" inputMode="decimal" value={paid}
                      onChange={e => setPaid(formatINR2(e.target.value))}
                      className={amtCls} placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">New Loan Amount</span>
                <span className="text-lg font-bold text-emerald-400">{fmtINR(newTotal)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Interest Rate (% /mo)</label>
                  <div className="relative">
                    <input type="text" inputMode="decimal" value={interestRate}
                      onChange={e => setInterestRate(e.target.value.replace(/[^0-9.]/g,"").replace(/(\..*?)\..*/g,"$1"))}
                      className={rateCls} placeholder="2.0" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">New Entry No.</label>
                  <input type="number" value={newSerial} onChange={e => setNewSerial(e.target.value)}
                    className={inputCls} placeholder="Serial no." />
                </div>
              </div>
            </>
          )}

          {/* Entry no. / series / date — shared */}
          {isBoth && (
            <div>
              <label className="block text-xs text-neutral-400 mb-1">New Entry No.</label>
              <input type="number" value={newSerial} onChange={e => setNewSerial(e.target.value)}
                className={inputCls} placeholder="Serial no." />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Series</label>
              <input type="text" value={series} onChange={e => setSeries(e.target.value)}
                className={inputCls} placeholder="e.g. A" />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Entry Date</label>
              <SmartDateInput value={entryDate} onChange={setEntryDate} isBoss={true} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 sm:px-6 pb-6 shrink-0">
          <button onClick={onCancel}
            className="flex-1 border border-neutral-700 text-neutral-400 rounded-2xl py-3 text-sm font-medium hover:bg-neutral-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-2xl py-3 text-sm font-bold hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20">
            Confirm Renewal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function EntryDetailCard({ pawn, onClose, onRelease, onMarkActive, onSold, userRole, onAddAmount, onAddPrepayment, onAddInterestPayment, onDeleteDhafa, onDeletePrepayment, onCancel, onRenewLoan, onLinkRenewal, onEdit, editedBy, nextSerial, isBoss: isBossProp, allPawns = [], onNavigateToPawn }) {
  useLockBodyScroll();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showActiveConfirm, setShowActiveConfirm] = useState(false);
  const [showSoldConfirm, setShowSoldConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(null); // { type: 'dhafa'|'prepayment', id }
  const [showAddAmount, setShowAddAmount] = useState(false);
  const [showAddPrepayment, setShowAddPrepayment] = useState(false);
  const [showAddInterestPayment, setShowAddInterestPayment] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showDhafa, setShowDhafa] = useState(false);
  const [showPrepayments, setShowPrepayments] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showLinkRenewalModal, setShowLinkRenewalModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const isBoss = isBossProp !== undefined ? isBossProp : userRole === "boss";
  const isBoth = pawn.collateral_type === "both";
  const isGold = pawn.collateral_type === "gold";

  const isCancelled = !!pawn.is_cancelled;

  const today = new Date().toISOString().split("T")[0];
  const endDate = pawn.is_released ? pawn.released_date : today;
  // Cancelled bills accrue no interest, so no duration is shown.
  const duration = !isCancelled && pawn.entry_date && endDate ? calcDuration(pawn.entry_date, endDate) : null;

  const prepayments = pawn.prepayments || [];
  const totalPrepaid = prepayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  const interestPayments = pawn.interest_payments || [];
  const totalInterestPaid = interestPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  let baseReleaseAmount = null;

  if (isCancelled) {
    // Cancelled bill → interest waived. Amount owed is the principal only.
    const principalTotal = isBoth
      ? parseFloat(pawn.loan_amount_gold || 0) + parseFloat(pawn.loan_amount_silver || 0)
      : parseFloat(pawn.loan_amount || 0);
    baseReleaseAmount = principalTotal - totalPrepaid;
  } else if (isBoth) {
    // Interest calculated on full gold + silver principals, prepayment deducted from the total after
    const goldFull = pawn.loan_amount_gold && pawn.interest_rate_gold
      ? calcReleaseAmount(parseFloat(pawn.loan_amount_gold), pawn.interest_rate_gold, pawn.entry_date, endDate)
      : 0;
    const silverFull = pawn.loan_amount_silver && pawn.interest_rate_silver
      ? calcReleaseAmount(parseFloat(pawn.loan_amount_silver), pawn.interest_rate_silver, pawn.entry_date, endDate)
      : 0;
    baseReleaseAmount = goldFull + silverFull - totalPrepaid;
  } else if (pawn.loan_amount && pawn.interest_rate && pawn.entry_date && endDate) {
    // Interest on full principal, prepayment subtracted from the total
    baseReleaseAmount = calcReleaseAmount(parseFloat(pawn.loan_amount), pawn.interest_rate, pawn.entry_date, endDate) - totalPrepaid;
  }

  const additionalAmounts = pawn.additional_amounts || [];

  // Dhafa rate: per-entry override → silver rate if Both → gold rate if Gold-only → plain rate
  function dhafaRate(a) {
    if (a.interest_rate) return a.interest_rate;
    if (isBoth)   return pawn.interest_rate_silver;
    if (isGold)   return pawn.interest_rate_gold;
    return pawn.interest_rate;
  }

  const additionalDue = additionalAmounts.reduce((sum, a) => {
    if (!a.amount) return sum;
    // Cancelled bill → dhafa adds principal only, no interest.
    if (isCancelled) return sum + parseFloat(a.amount);
    const rate = dhafaRate(a);
    if (!rate || !a.date || !endDate) return sum;
    return sum + calcReleaseAmount(a.amount, rate, a.date, endDate);
  }, 0);

  const totalDue = (baseReleaseAmount || 0) + additionalDue;

  // Floor: minimum owed is the residual principal after prepayment
  const residualPrincipal = Math.max(0, parseFloat(pawn.loan_amount || 0) - totalPrepaid);
  const finalDue = Math.max(residualPrincipal, totalDue - totalInterestPaid);

  async function handleReleaseConfirmed(date, actualAmount) {
    await onRelease?.(pawn.id, date, actualAmount);
    setShowConfirm(false);
    onClose();
  }

  async function handleSoldConfirmed(date) {
    await onSold?.(pawn.id, date);
    setShowSoldConfirm(false);
    onClose();
  }

  function handleAddAmountSubmit(additional) {
    setShowAddAmount(false);           // close immediately
    onAddAmount?.(pawn.id, additional); // optimistic update fires in parent
  }

  function handleAddPrepaymentSubmit(prepayment) {
    setShowAddPrepayment(false);
    onAddPrepayment?.(pawn.id, prepayment);
  }

  function handleAddInterestPaymentSubmit(payment) {
    setShowAddInterestPayment(false);
    onAddInterestPayment?.(pawn.id, payment);
  }

  async function handleRenewConfirm(newLoanData) {
    setBusy(true);
    try { await onRenewLoan?.(pawn.id, newLoanData); } finally { setBusy(false); setShowRenewModal(false); }
  }

  async function handleEditSave(updatedFields, editEntry) {
    setBusy(true);
    try { await onEdit?.(pawn.id, updatedFields, editEntry); } finally { setBusy(false); setShowEditModal(false); }
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm sm:mx-4 overflow-hidden relative max-h-[95vh] sm:max-h-[92vh] flex flex-col"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>
            <div className={`px-5 sm:px-6 pt-5 sm:pt-8 pb-5 sm:pb-6 shrink-0 ${isBoth ? "bg-purple-950/30" : isGold ? "bg-amber-50 dark:bg-amber-950/40" : "bg-slate-50 dark:bg-neutral-800"}`}>
              <div className="flex items-center justify-end gap-2 mb-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  title="Edit entry"
                  className="text-slate-400 hover:text-amber-400 transition-colors p-1 rounded-lg hover:bg-neutral-800/60"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm ${
                  isBoth ? "bg-purple-200 text-purple-700" : isGold ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                }`}>
                  {pawn.borrower_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{pawn.borrower_name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{pawn.relative_name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isBoth ? "bg-purple-100 text-purple-700" : isGold ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                    }`}>
                      <Gem className="w-3 h-3" />
                      {isBoth ? "Both" : isGold ? "Gold" : "Silver"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {pawn.series ? <><span className="text-amber-600 font-bold">{pawn.series}</span>{pawn.serial_no}</> : `#${pawn.serial_no}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Saving indicator — appears during any in-flight mutation */}
            <AnimatePresence>
              {busy && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 shadow-lg text-xs font-medium text-neutral-300"
                >
                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                  Saving…
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1">
              <InfoRow label="Entry Date" value={pawn.entry_date} />
              {pawn.is_sold && pawn.sold_date && (
                <InfoRow label="Sold Date" value={pawn.sold_date} accent />
              )}
              {pawn.is_released && !pawn.is_sold && !pawn.is_cancelled && pawn.released_date && (
                <InfoRow label="Released Date" value={pawn.released_date} />
              )}
              {pawn.is_released && !pawn.is_cancelled && pawn.actual_release_amount && (
                <InfoRow
                  label="Collected Amt"
                  value={`₹${Number(pawn.actual_release_amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                  highlight
                />
              )}
              {pawn.is_cancelled && (
                <InfoRow label="Status" value="Cancelled — interest waived" accent />
              )}
              {duration && <InfoRow label="Duration" value={duration} />}

              {/* Renewal chain references */}
              {pawn.renewed_from_serial != null && (
                <div className="flex justify-between items-center py-2.5 border-b border-neutral-800">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wide w-32 shrink-0">Renewed From</span>
                  <button
                    onClick={() => {
                      const target = allPawns.find(p =>
                        Number(p.serial_no) === Number(pawn.renewed_from_serial) &&
                        (p.series || null) === (pawn.renewed_from_series || null)
                      );
                      if (target && onNavigateToPawn) { onNavigateToPawn(target); }
                    }}
                    className="text-xs font-mono font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg hover:bg-amber-500/20 hover:border-amber-400/40 transition-colors cursor-pointer"
                  >
                    #{pawn.renewed_from_series || ""}{pawn.renewed_from_serial}
                  </button>
                </div>
              )}
              {pawn.renewed && pawn.renewed_to_serial != null && (
                <div className="flex justify-between items-center py-2.5 border-b border-neutral-800">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wide w-32 shrink-0">Renewed Into</span>
                  <button
                    onClick={() => {
                      const target = allPawns.find(p =>
                        Number(p.serial_no) === Number(pawn.renewed_to_serial) &&
                        (p.series || null) === (pawn.renewed_to_series || null)
                      );
                      if (target && onNavigateToPawn) { onNavigateToPawn(target); }
                    }}
                    className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg hover:bg-emerald-500/20 hover:border-emerald-400/40 transition-colors cursor-pointer"
                  >
                    #{pawn.renewed_to_series || ""}{pawn.renewed_to_serial}
                  </button>
                </div>
              )}
              <InfoRow label="Item" value={pawn.item_description} />
              {isBoth ? (
                <>
                  <InfoRow label="Gold Weight" value={pawn.item_weight_gold ? `${pawn.item_weight_gold} g` : (pawn.item_weight ? `${pawn.item_weight} g` : null)} accent />
                  <InfoRow label="Silver Weight" value={pawn.item_weight_silver ? `${pawn.item_weight_silver} g` : null} />
                </>
              ) : (
                <InfoRow label="Weight" value={pawn.item_weight ? `${pawn.item_weight} g` : null} />
              )}

              {isBoth ? (
                <>
                  <InfoRow label="Gold Loan" value={pawn.loan_amount_gold ? fmtINR(pawn.loan_amount_gold) : null} accent />
                  <InfoRow label="Gold Rate" value={pawn.interest_rate_gold ? `${pawn.interest_rate_gold}% /month` : null} />
                  {pawn.interest_rate_gold && pawn.loan_amount_gold && pawn.entry_date && (() => {
                    const em = effectiveMonths(pawn.entry_date, endDate);
                    const interest = parseFloat(pawn.loan_amount_gold) * (parseFloat(pawn.interest_rate_gold) / 100) * em;
                    const periodLabel = em === 0.5 ? "15d" : em === 1 ? "1mo" : `${em}mo`;
                    return (
                      <div className="flex justify-between items-center py-2.5 border-b border-neutral-800">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide w-32 shrink-0">Gold Interest ({periodLabel})</span>
                        <span className="text-xs font-semibold text-amber-400">{fmtINR(interest)}</span>
                      </div>
                    );
                  })()}
                  <InfoRow label="Silver Loan" value={pawn.loan_amount_silver ? fmtINR(pawn.loan_amount_silver) : null} accent />
                  <InfoRow label="Silver Rate" value={pawn.interest_rate_silver ? `${pawn.interest_rate_silver}% /month` : null} />
                  {pawn.interest_rate_silver && pawn.loan_amount_silver && pawn.entry_date && (() => {
                    const em = effectiveMonths(pawn.entry_date, endDate);
                    const interest = parseFloat(pawn.loan_amount_silver) * (parseFloat(pawn.interest_rate_silver) / 100) * em;
                    const periodLabel = em === 0.5 ? "15d" : em === 1 ? "1mo" : `${em}mo`;
                    return (
                      <div className="flex justify-between items-center py-2.5 border-b border-neutral-800">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide w-32 shrink-0">Silver Interest ({periodLabel})</span>
                        <span className="text-xs font-semibold text-slate-300">{fmtINR(interest)}</span>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <>
                  <InfoRow label="Interest Rate" value={pawn.interest_rate ? `${pawn.interest_rate}% / month` : null} />
                  {pawn.interest_rate && pawn.loan_amount && pawn.entry_date && (() => {
                    const em = effectiveMonths(pawn.entry_date, endDate);
                    const interest = parseFloat(pawn.loan_amount) * (parseFloat(pawn.interest_rate) / 100) * em;
                    const periodLabel = em === 0.5 ? "15d" : em === 1 ? "1mo" : `${em}mo`;
                    return (
                      <div className="flex justify-between items-center py-2.5 border-b border-neutral-800">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide w-32 shrink-0">Interest ({periodLabel})</span>
                        <span className="text-xs font-semibold text-amber-400">{fmtINR(interest)}</span>
                      </div>
                    );
                  })()}
                  <InfoRow label="Loan Amount" value={pawn.loan_amount ? fmtINR(pawn.loan_amount) : null} />
                </>
              )}

              {prepayments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-800">
                  {/* ── Summary header ── */}
                  <button
                    onClick={() => setShowPrepayments(v => !v)}
                    className="w-full flex items-center justify-between group mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-500/80 uppercase tracking-widest">
                        Pre-payments
                      </span>
                      <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold">
                        {prepayments.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-neutral-500">Total Prepaid</p>
                        <p className="text-sm font-bold text-emerald-400">{fmtINR(totalPrepaid)}</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showPrepayments ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {/* ── Expanded rows ── */}
                  <AnimatePresence>
                    {showPrepayments && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-2"
                      >
                        {prepayments.map((p, idx) => (
                          <div key={p.id} className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl px-3 py-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-emerald-500/60">Payment {idx + 1}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-neutral-500">{p.date}</span>
                                {!pawn.is_released && onDeletePrepayment && (
                                  <button
                                    onClick={() => setDeletePending({ type: "prepayment", id: p.id })}
                                    className="text-red-500/50 hover:text-red-400 transition-colors"
                                    title="Delete prepayment"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-neutral-400">Amount</span>
                              <span className="text-emerald-400 font-semibold">{fmtINR(p.amount)}</span>
                            </div>
                            {p.note && (
                              <div className="flex justify-between text-xs">
                                <span className="text-neutral-400">Note</span>
                                <span className="text-neutral-400 italic truncate max-w-[140px]">{p.note}</span>
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="flex justify-between items-center px-1 pt-1 border-t border-emerald-500/20">
                          <span className="text-xs font-semibold text-emerald-500/70 uppercase tracking-widest">Total Prepaid</span>
                          <span className="text-sm font-bold text-emerald-400">{fmtINR(totalPrepaid)}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {!pawn.is_released && (
                <div className="mt-3">
                  <AnimatePresence>
                    {showAddPrepayment ? (
                      <AddPrepaymentForm
                        key="prepayment-form"
                        isBoss={isBoss}
                        onAdd={handleAddPrepaymentSubmit}
                        onCancel={() => setShowAddPrepayment(false)}
                      />
                    ) : (
                      <motion.button
                        key="prepayment-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAddPrepayment(true)}
                        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors py-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Pre-payment
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {additionalAmounts.length > 0 && (() => {
                const totalPrincipal = additionalAmounts.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
                const totalAccrued   = additionalAmounts.reduce((s, a) => {
                  const rate = dhafaRate(a);
                  return s + (rate && a.date && endDate
                    ? calcReleaseAmount(a.amount, rate, a.date, endDate) - parseFloat(a.amount)
                    : 0);
                }, 0);
                return (
                  <div className="mt-3 pt-3 border-t border-neutral-800">
                    {/* ── Summary header (always visible) ── */}
                    <button
                      onClick={() => setShowDhafa(v => !v)}
                      className="w-full flex items-center justify-between group mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-orange-400/80 uppercase tracking-widest">
                          Dhafa Entries
                        </span>
                        <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-md font-bold">
                          {additionalAmounts.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-neutral-500">Principal + Interest</p>
                          <p className="text-sm font-bold text-slate-200">
                            {fmtINR(totalPrincipal)}
                            <span className="text-amber-400 font-medium"> + {fmtINR(totalAccrued)}</span>
                          </p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showDhafa ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {/* ── Expanded detail rows ── */}
                    <AnimatePresence>
                      {showDhafa && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden space-y-2"
                        >
                          {additionalAmounts.map((a, idx) => {
                            const rate    = dhafaRate(a);
                            const accrued = rate && a.date && endDate
                              ? calcReleaseAmount(a.amount, rate, a.date, endDate) - parseFloat(a.amount)
                              : 0;
                            const subtotal = parseFloat(a.amount) + accrued;
                            const rateLabel = isBoth ? "Silver rate" : isGold ? "Gold rate" : "Rate";
                            return (
                              <div key={a.id} className="bg-neutral-800/50 border border-orange-500/10 rounded-xl px-3 py-2.5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-orange-400/70">Entry {idx + 1}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-neutral-500">{a.date}</span>
                                    {!pawn.is_released && onDeleteDhafa && (
                                      <button
                                        onClick={() => setDeletePending({ type: "dhafa", id: a.id })}
                                        className="text-red-500/50 hover:text-red-400 transition-colors"
                                        title="Delete dhafa entry"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-neutral-400">Principal</span>
                                  <span className="text-slate-200 font-medium">{fmtINR(a.amount)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-neutral-400">{rateLabel}</span>
                                  <span className="text-neutral-400">{rate ? `${rate}% /mo` : "—"}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-neutral-400">Interest accrued</span>
                                  <span className="text-amber-400 font-medium">{fmtINR(accrued)}</span>
                                </div>
                                {a.note && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-neutral-400">Note</span>
                                    <span className="text-neutral-400 italic truncate max-w-[140px]">{a.note}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-xs border-t border-neutral-700 pt-1.5 mt-0.5">
                                  <span className="text-neutral-300 font-semibold">Subtotal</span>
                                  <span className="text-slate-100 font-bold">{fmtINR(subtotal)}</span>
                                </div>
                              </div>
                            );
                          })}
                          {/* Total row */}
                          <div className="flex justify-between items-center px-1 pt-1 border-t border-orange-500/20">
                            <span className="text-xs font-semibold text-orange-400/70 uppercase tracking-widest">Total Dhafa Due</span>
                            <span className="text-sm font-bold text-orange-300">{fmtINR(totalPrincipal + totalAccrued)}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              {interestPayments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-800">
                  <p className="text-xs font-semibold text-sky-500/70 uppercase tracking-widest mb-2">Interest Payments</p>
                  <div className="space-y-2">
                    {interestPayments.map((ip) => (
                      <div key={ip.id} className="bg-sky-500/10 border border-sky-500/20 rounded-xl px-3 py-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-neutral-400 font-mono">{ip.date}</span>
                          <span className="text-sm font-semibold text-sky-400">{fmtINR(ip.amount)}</span>
                        </div>
                        {ip.note && (
                          <p className="text-xs text-neutral-500 mt-0.5">{ip.note}</p>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-between items-center px-1 pt-1">
                      <span className="text-xs font-semibold text-sky-500/70 uppercase tracking-widest">Total Paid</span>
                      <span className="text-sm font-bold text-sky-400">{fmtINR(totalInterestPaid)}</span>
                    </div>
                  </div>
                </div>
              )}


              {totalDue > 0 && !pawn.is_sold && isCancelled && (
                <div className="border-t border-neutral-800 mt-1">
                  <div className="w-full flex justify-between items-start py-2.5">
                    <span className="text-xs text-red-400/80 font-medium uppercase tracking-wide w-40 shrink-0">
                      Amount Owed · 0% int.
                    </span>
                    <span className="text-sm font-medium text-right text-emerald-500">
                      {fmtINR(finalDue)}
                    </span>
                  </div>
                </div>
              )}

              {totalDue > 0 && !pawn.is_sold && !isCancelled && (
                <div className="border-t border-neutral-800 mt-1">
                  <button
                    onClick={() => setShowBreakdown((v) => !v)}
                    className="w-full flex justify-between items-start py-2.5 cursor-pointer group"
                  >
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wide w-32 shrink-0 group-hover:text-amber-400 transition-colors">
                      {pawn.is_released ? "Released Amt" : "Amount Due"}
                    </span>
                    <span className="text-sm font-medium text-right text-emerald-500 underline decoration-dotted decoration-amber-500/40 group-hover:decoration-amber-400 transition-colors">
                      {fmtINR(finalDue)}
                    </span>
                  </button>
                  <AnimatePresence>
                    {showBreakdown && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {isBoth ? (
                          <div className="space-y-2">
                            {pawn.loan_amount_gold && pawn.interest_rate_gold && (
                              <div>
                                <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest mt-2 mb-1">Gold</p>
                                <InterestBreakdownPanel
                                  principal={parseFloat(pawn.loan_amount_gold)}
                                  prepaid={totalPrepaid * (parseFloat(pawn.loan_amount_gold) / parseFloat(pawn.loan_amount || 1))}
                                  rate={pawn.interest_rate_gold}
                                  entryDate={pawn.entry_date}
                                  endDate={endDate}
                                />
                              </div>
                            )}
                            {pawn.loan_amount_silver && pawn.interest_rate_silver && (
                              <div>
                                <p className="text-xs font-semibold text-slate-400/70 uppercase tracking-widest mt-2 mb-1">Silver</p>
                                <InterestBreakdownPanel
                                  principal={parseFloat(pawn.loan_amount_silver)}
                                  prepaid={totalPrepaid * (parseFloat(pawn.loan_amount_silver) / parseFloat(pawn.loan_amount || 1))}
                                  rate={pawn.interest_rate_silver}
                                  entryDate={pawn.entry_date}
                                  endDate={endDate}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          pawn.loan_amount && pawn.interest_rate && pawn.entry_date && endDate && (
                            <InterestBreakdownPanel
                              principal={parseFloat(pawn.loan_amount)}
                              prepaid={totalPrepaid}
                              rate={pawn.interest_rate}
                              entryDate={pawn.entry_date}
                              endDate={endDate}
                            />
                          )
                        )}

                        {additionalAmounts.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-semibold text-orange-400/70 uppercase tracking-widest mb-1">Dhafa Entries</p>
                            {additionalAmounts.map((a, idx) => {
                              const rate       = dhafaRate(a);
                              const dhafeTotal = rate && a.date && endDate
                                ? calcReleaseAmount(a.amount, rate, a.date, endDate)
                                : parseFloat(a.amount);
                              const accrued    = dhafeTotal - parseFloat(a.amount);
                              const rateLabel  = isBoth ? "Silver rate" : isGold ? "Gold rate" : "Rate";
                              return (
                                <div key={a.id} className="bg-neutral-800/60 rounded-xl px-3 py-2.5 space-y-1 border border-orange-500/10">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-orange-400/60 font-semibold">Entry {idx + 1}</span>
                                    <span className="text-neutral-500 font-mono">{a.date}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-neutral-400">Principal</span>
                                    <span className="text-slate-200">{fmtINR(a.amount)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-neutral-400">{rateLabel}</span>
                                    <span className="text-neutral-400">{rate ? `${rate}% /mo` : "—"}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-neutral-400">Interest accrued</span>
                                    <span className="text-amber-400">{fmtINR(accrued)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs border-t border-neutral-700 pt-1">
                                    <span className="text-neutral-300 font-medium">Subtotal</span>
                                    <span className="text-slate-200 font-semibold">{fmtINR(dhafeTotal)}</span>
                                  </div>
                                </div>
                              );
                            })}
                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-neutral-600 mt-1">
                              <span className="text-neutral-300">Grand Total</span>
                              <span className="text-emerald-400">{fmtINR(finalDue)}</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {!pawn.is_released && (
                <div className="mt-3">
                  <AnimatePresence>
                    {showAddAmount ? (
                      <AddAmountForm
                        key="add-form"
                        pawn={pawn}
                        isBoss={isBoss}
                        onAdd={handleAddAmountSubmit}
                        onCancel={() => setShowAddAmount(false)}
                      />
                    ) : (
                      <motion.button
                        key="add-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAddAmount(true)}
                        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors py-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Dhafa
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {(pawn.phone || pawn.aadhar || pawn.address) && (
                <div className="mt-3 pt-3 border-t border-neutral-800 space-y-2">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">Contact</p>
                  {parsePhones(pawn.phone).length > 0 && (
                    <div className="flex items-start gap-2 text-sm text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        {parsePhones(pawn.phone).map((ph, i) => (
                          <div key={i} className="font-mono">+91 {ph}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pawn.aadhar && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <CreditCard className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="font-mono tracking-widest">{pawn.aadhar}</span>
                    </div>
                  )}
                  {pawn.address && (
                    <div className="flex items-start gap-2 text-sm text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{pawn.address}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Edit history */}
              {(pawn.edit_history || []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-800">
                  <button
                    onClick={() => setShowEditHistory(v => !v)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-neutral-400 uppercase tracking-widest py-1 hover:text-amber-400 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Edit History ({pawn.edit_history.length})
                    </span>
                    {showEditHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <AnimatePresence>
                    {showEditHistory && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mt-2 space-y-2"
                      >
                        {[...pawn.edit_history].reverse().map((edit) => (
                          <div key={edit.id} className="bg-neutral-800/60 rounded-2xl px-3 py-3 border border-neutral-700 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold text-slate-300">{edit.edited_by?.name || "Unknown"}</p>
                                <p className="text-xs text-neutral-500 font-mono">{edit.edited_by?.username}</p>
                              </div>
                              <p className="text-xs text-neutral-500 tabular-nums">
                                {new Date(edit.edited_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                                {" · "}
                                {new Date(edit.edited_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                              </p>
                            </div>
                            <div className="space-y-1">
                              {edit.changes.map((c, i) => (
                                <div key={i} className="grid grid-cols-[100px_1fr_1fr] gap-1 text-xs">
                                  <span className="text-neutral-500 truncate">{c.label}</span>
                                  <span className="text-red-400/80 line-through truncate font-mono">{c.old_value}</span>
                                  <span className="text-emerald-400 truncate font-mono font-medium">{c.new_value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {isBoss && (
                <div className="flex justify-between items-center py-2.5 mt-1 border-t border-neutral-800">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1">
                    <User className="w-3 h-3" /> Added By
                  </span>
                  <div className="text-right">
                    {pawn.created_by ? (
                      <>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{pawn.created_by.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{pawn.created_by.username}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">Legacy entry</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Action bar ──────────────────────────────────────────── */}
            <div className="px-5 sm:px-6 pt-3 shrink-0 border-t border-neutral-800/60 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-7">
              {pawn.is_cancelled ? (
                /* ── Cancelled state ── */
                <div className={`flex items-start ${isBoss ? "justify-evenly" : "justify-center"}`}>
                  <div className="flex flex-col items-center gap-2 select-none">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                      <Ban className="w-6 h-6 text-red-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Cancelled</span>
                  </div>
                  {isBoss && (
                    <motion.button
                      onClick={() => setShowActiveConfirm(true)}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.92 }}
                      className="flex flex-col items-center gap-2 group outline-none"
                    >
                      <motion.div
                        className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center transition-all group-hover:bg-orange-500/20 group-hover:border-orange-400/50 group-hover:shadow-lg group-hover:shadow-orange-500/20"
                        whileHover={{ scale: 1.08 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      >
                        <motion.div whileHover={{ rotate: -45 }} transition={{ duration: 0.35, ease: "easeOut" }}>
                          <Undo2 className="w-6 h-6 text-orange-400" />
                        </motion.div>
                      </motion.div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400/60 group-hover:text-orange-400 transition-colors">Restore</span>
                    </motion.button>
                  )}
                </div>

              ) : pawn.is_sold ? (
                /* ── Sold state ── */
                <div className={`flex items-start ${isBoss ? "justify-evenly" : "justify-center"}`}>
                  <div className="flex flex-col items-center gap-2 select-none">
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-violet-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Sold</span>
                  </div>
                  {isBoss && (
                    <motion.button
                      onClick={() => setShowActiveConfirm(true)}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.92 }}
                      className="flex flex-col items-center gap-2 group outline-none"
                    >
                      <motion.div
                        className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center transition-all group-hover:bg-orange-500/20 group-hover:border-orange-400/50 group-hover:shadow-lg group-hover:shadow-orange-500/20"
                        whileHover={{ scale: 1.08 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      >
                        <motion.div whileHover={{ rotate: -45 }} transition={{ duration: 0.35, ease: "easeOut" }}>
                          <Undo2 className="w-6 h-6 text-orange-400" />
                        </motion.div>
                      </motion.div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400/60 group-hover:text-orange-400 transition-colors">Restore</span>
                    </motion.button>
                  )}
                </div>

              ) : pawn.is_released ? (
                /* ── Released state ── */
                <div className={`flex items-start ${isBoss ? "justify-evenly" : "justify-center"}`}>
                  <div className="flex flex-col items-center gap-2 select-none">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Released</span>
                  </div>
                  {isBoss && (
                    <motion.button
                      onClick={() => setShowActiveConfirm(true)}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.92 }}
                      className="flex flex-col items-center gap-2 group outline-none"
                    >
                      <motion.div
                        className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center transition-all group-hover:bg-orange-500/20 group-hover:border-orange-400/50 group-hover:shadow-lg group-hover:shadow-orange-500/20"
                        whileHover={{ scale: 1.08 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      >
                        <motion.div whileHover={{ rotate: -45 }} transition={{ duration: 0.35, ease: "easeOut" }}>
                          <Undo2 className="w-6 h-6 text-orange-400" />
                        </motion.div>
                      </motion.div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400/60 group-hover:text-orange-400 transition-colors">Restore</span>
                    </motion.button>
                  )}
                </div>

              ) : (
                /* ── Active state ── */
                <div className="flex items-start justify-evenly">

                  {/* Active Loan status — pulsing */}
                  <div className="flex flex-col items-center gap-2 select-none">
                    <div className="relative w-14 h-14">
                      <span className="absolute inset-0 rounded-2xl bg-orange-500/20 animate-ping" style={{ animationDuration: "2.4s" }} />
                      <div className="relative w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-orange-400" />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Active</span>
                  </div>

                  {/* Renewed From */}
                  <motion.button
                    onClick={() => setShowLinkRenewalModal(true)}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex flex-col items-center gap-2 group outline-none"
                  >
                    <motion.div
                      className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center transition-all group-hover:bg-amber-500/20 group-hover:border-amber-400/50 group-hover:shadow-lg group-hover:shadow-amber-500/20"
                      whileHover={{ scale: 1.08 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    >
                      <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.45, ease: "easeInOut" }}>
                        <RefreshCw className="w-6 h-6 text-amber-400" />
                      </motion.div>
                    </motion.div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/60 group-hover:text-amber-400 transition-colors leading-tight text-center">Renewed<br/>From</span>
                  </motion.button>

                  {/* Sold */}
                  <motion.button
                    onClick={() => setShowSoldConfirm(true)}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex flex-col items-center gap-2 group outline-none"
                  >
                    <motion.div
                      className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-600/60 flex items-center justify-center transition-all group-hover:bg-violet-500/10 group-hover:border-violet-500/40 group-hover:shadow-lg group-hover:shadow-violet-500/10"
                      whileHover={{ scale: 1.08 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    >
                      <ShoppingBag className="w-6 h-6 text-neutral-400 group-hover:text-violet-400 transition-colors" />
                    </motion.div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-violet-400 transition-colors">Sold</span>
                  </motion.button>

                  {/* Mark Released */}
                  <motion.button
                    onClick={() => setShowConfirm(true)}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex flex-col items-center gap-2 group outline-none"
                  >
                    <motion.div
                      className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-600/60 flex items-center justify-center transition-all group-hover:bg-emerald-500/10 group-hover:border-emerald-500/40 group-hover:shadow-lg group-hover:shadow-emerald-500/10"
                      whileHover={{ scale: 1.08 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    >
                      <CheckCircle2 className="w-6 h-6 text-neutral-400 group-hover:text-emerald-400 transition-colors" />
                    </motion.div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-emerald-400 transition-colors">Release</span>
                  </motion.button>

                  {/* Cancel Bill */}
                  {onCancel && (
                    <motion.button
                      onClick={() => setShowCancelConfirm(true)}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.92 }}
                      className="flex flex-col items-center gap-2 group outline-none"
                    >
                      <motion.div
                        className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-600/60 flex items-center justify-center transition-all group-hover:bg-red-500/10 group-hover:border-red-500/40 group-hover:shadow-lg group-hover:shadow-red-500/10"
                        whileHover={{ scale: 1.08 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      >
                        <Ban className="w-6 h-6 text-neutral-400 group-hover:text-red-400 transition-colors" />
                      </motion.div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-red-400 transition-colors leading-tight text-center">Cancel<br/>Bill</span>
                    </motion.button>
                  )}

                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showCancelConfirm && (
          <ConfirmCancel
            borrowerName={pawn.borrower_name}
            serialNo={pawn.series ? `${pawn.series}${pawn.serial_no}` : pawn.serial_no}
            onConfirm={() => { setShowCancelConfirm(false); onCancel(pawn.id); }}
            onCancel={() => setShowCancelConfirm(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && (
          <ConfirmRelease
            pawn={pawn}
            borrowerName={pawn.borrower_name}
            isBoss={isBoss}
            onConfirm={handleReleaseConfirmed}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showActiveConfirm && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/60"
            style={{ zIndex: 60 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowActiveConfirm(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6 text-center"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">Restore to Active?</h3>
              <p className="text-sm text-slate-500 mb-5">
                Mark <span className="font-medium text-slate-700">{pawn.borrower_name}</span>'s loan as active again? Released date will be cleared.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowActiveConfirm(false)}
                  className="flex-1 border border-neutral-200 text-slate-600 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onMarkActive(pawn.id); setShowActiveConfirm(false); onClose(); }}
                  className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-orange-600 transition-colors"
                >
                  Yes, Restore
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSoldConfirm && (
          <ConfirmSold
            pawn={pawn}
            borrowerName={pawn.borrower_name}
            isBoss={isBoss}
            onConfirm={handleSoldConfirmed}
            onCancel={() => setShowSoldConfirm(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLinkRenewalModal && (
          <LinkRenewalModal
            pawn={pawn}
            allPawns={allPawns}
            onConfirm={(serialNo, series) => {
              if (onLinkRenewal) onLinkRenewal(pawn.id, serialNo, series);
              setShowLinkRenewalModal(false);
            }}
            onCancel={() => setShowLinkRenewalModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRenewModal && (
          <RenewLoanModal
            pawn={pawn}
            totalDue={totalDue}
            nextSerial={nextSerial}
            onConfirm={handleRenewConfirm}
            onCancel={() => setShowRenewModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && (
          <EditEntryModal
            pawn={pawn}
            isBoss={isBoss}
            editedBy={editedBy}
            onSave={handleEditSave}
            onCancel={() => setShowEditModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletePending && (
          <ConfirmDelete
            label={deletePending.type === "dhafa" ? "Dhafa Entry" : "Pre-payment"}
            onConfirm={() => {
              if (deletePending.type === "dhafa") onDeleteDhafa(pawn.id, deletePending.id);
              else onDeletePrepayment(pawn.id, deletePending.id);
              setDeletePending(null);
            }}
            onCancel={() => setDeletePending(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
