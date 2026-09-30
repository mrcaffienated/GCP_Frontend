import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Pencil, User, Phone, MapPin, Package, Weight, IndianRupee, Calendar, Hash, Plus, Trash2, Loader2, Ban } from "lucide-react";
import { useSwipeToDismiss } from "../hooks/useSwipeToDismiss";

// Parse phone field — handles legacy plain string or JSON array
export function parsePhones(phone) {
  if (!phone) return [];
  try {
    const parsed = JSON.parse(phone);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : (phone ? [phone] : []);
  } catch {
    return phone ? [phone] : [];
  }
}

// Serialize phones array to JSON string for storage
function serializePhones(phones) {
  const clean = phones.map(p => p.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  return JSON.stringify(clean);
}

const today = new Date().toISOString().split("T")[0];

// Convert YYYY-MM-DD → DD/MM/YYYY for display
function toDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Auto-format typed input and convert to YYYY-MM-DD for storage
// Smart rules:
//   • Day first digit > 3  → auto-prefix "0"  (e.g. typing 5 → 05)
//   • Month first digit > 1 → auto-prefix "0"  (e.g. typing 5 → 05)
//   • Year auto-prefixed with "20" so user types only last 2 digits (e.g. 26 → 2026)
//   • isBackspace flag disables all auto-inserts so backspacing works cleanly
function parseDateInput(raw, isBackspace = false) {
  let digits = raw.replace(/\D/g, "");

  if (!isBackspace) {
    // Auto-prefix day: digit 4-9 can never start a valid 2-digit day
    if (digits.length >= 1 && parseInt(digits[0]) > 3) {
      digits = "0" + digits;
    }
    // Auto-prefix month: digit 2-9 can never start a valid 2-digit month
    if (digits.length >= 3 && parseInt(digits[2]) > 1) {
      digits = digits.slice(0, 2) + "0" + digits.slice(2);
    }
    // Auto-insert "20" before year digits (positions 4-5 in buffer)
    if (digits.length >= 5 && digits.slice(4, 6) !== "20") {
      digits = digits.slice(0, 4) + "20" + digits.slice(4);
    }
  }

  digits = digits.slice(0, 8);

  // Build display string with slashes
  let display;
  if (digits.length <= 2) {
    display = digits;
  } else if (digits.length <= 4) {
    display = digits.slice(0, 2) + "/" + digits.slice(2);
  } else {
    display = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
  }

  // Trailing slash guides the user to the next segment (only when typing forward)
  if (!isBackspace && digits.length === 2) display += "/";
  if (!isBackspace && digits.length === 4) display += "/";

  // Build ISO only when all 8 digits are present
  let iso = "";
  if (digits.length === 8) {
    const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8);
    iso = `${y}-${m}-${d}`;
  }
  return { display, iso };
}

function formatINR(raw) {
  const clean = raw.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
  if (!clean) return "";
  const [intPart, decPart] = clean.split(".");
  const formatted = Number(intPart || 0).toLocaleString("en-IN");
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

function rawAmount(formatted) {
  return formatted.replace(/,/g, "");
}

function fmtINR(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Live interest preview shown below loan/rate fields ───────────────────────
function LiveInterestPreview({ collateralType, loanAmount, interestRate, loanAmountGold, interestRateGold, loanAmountSilver, interestRateSilver }) {
  const isBoth = collateralType === "both";

  if (isBoth) {
    const g  = parseFloat(String(loanAmountGold).replace(/,/g, ""))   || 0;
    const s  = parseFloat(String(loanAmountSilver).replace(/,/g, "")) || 0;
    const gr = parseFloat(interestRateGold)   || 0;
    const sr = parseFloat(interestRateSilver) || 0;
    if ((!g && !s) || (!gr && !sr)) return null;

    const gMo    = g * gr / 100;
    const sMo    = s * sr / 100;
    const totalMo = gMo + sMo;

    const totalPrincipal = g + s;
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="bg-neutral-800/70 border border-neutral-700 rounded-2xl px-4 py-3 space-y-2"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">Interest / month</span>
          <div className="flex items-center gap-3">
            {g > 0 && gr > 0 && <span className="text-xs text-amber-400">🥇 {fmtINR(gMo)}</span>}
            {s > 0 && sr > 0 && <span className="text-xs text-slate-300">🥈 {fmtINR(sMo)}</span>}
            <span className="text-sm font-bold text-emerald-400">{fmtINR(totalMo)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-700/60 pt-2">
          <span className="text-xs text-neutral-400">Total (Principal + 1 mo.)</span>
          <span className="text-sm font-bold text-white">{fmtINR(totalPrincipal + totalMo)}</span>
        </div>
      </motion.div>
    );
  }

  // Single collateral
  const loan = parseFloat(String(loanAmount).replace(/,/g, "")) || 0;
  const rate = parseFloat(interestRate) || 0;
  if (!loan || !rate) return null;

  const mo1 = loan * rate / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="bg-neutral-800/70 border border-neutral-700 rounded-2xl px-4 py-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Interest / month</span>
        <span className="text-sm font-bold text-amber-400">{fmtINR(mo1)}</span>
      </div>
      <div className="flex items-center justify-between border-t border-neutral-700/60 pt-2">
        <span className="text-xs text-neutral-400">Total (Principal + 1 mo.)</span>
        <span className="text-sm font-bold text-white">{fmtINR(loan + mo1)}</span>
      </div>
    </motion.div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function formatAadhar(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function PreviewRow({ label, value, accent }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-2.5 border-b border-neutral-800/60 last:border-0">
      <span className="text-xs text-neutral-500 font-medium shrink-0">{label}</span>
      <span className={`text-sm font-semibold text-right ${accent || "text-slate-200"}`}>{value}</span>
    </div>
  );
}

function EntryPreview({ data, onConfirm, onEdit, theme }) {
  const [saving, setSaving] = useState(false);
  // Wrap confirm so the button disables + shows a spinner for the one create call,
  // preventing a double-click (or Cmd+Enter + click) from firing two creates.
  async function handleConfirm() {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm();
    } finally {
      setSaving(false);
    }
  }
  const isBoth = data.collateral_type === "both";
  const isGold = data.collateral_type === "gold";
  const isSilver = data.collateral_type === "silver";

  const typeLabel = isBoth ? "Gold + Silver" : isGold ? "Gold" : "Silver";
  const typeBadge = isBoth
    ? "bg-gradient-to-r from-amber-500/20 to-slate-400/20 text-amber-300 border border-amber-500/30"
    : isGold
    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
    : "bg-slate-400/10 text-slate-300 border border-slate-400/20";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Preview header */}
      <div className="px-5 sm:px-7 pt-2 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-lg sm:text-xl font-bold ${theme.entryId}`}>
              {data.series}{data.serial_no}
            </span>
            <span className={`text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg ${typeBadge}`}>
              {typeLabel}
            </span>
          </div>
          <span className="text-xs text-neutral-500">{data.entry_date}</span>
        </div>
        <p className="text-xs text-neutral-500">Review all details before confirming.</p>
      </div>

      <div className="overflow-y-auto flex-1 px-5 sm:px-7 pb-2 space-y-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 sm:px-5 py-1">
          <PreviewRow label="Borrower" value={data.borrower_name} accent="text-white" />
          <PreviewRow label="Relative" value={data.relative_name} />
          <PreviewRow label="Phone" value={
            parsePhones(data.phone).length > 0
              ? parsePhones(data.phone).map(p => `+91 ${p}`).join(", ")
              : null
          } />
          <PreviewRow label="Aadhar" value={data.aadhar || null} />
          <PreviewRow label="Address" value={data.address || null} />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 sm:px-5 py-1">
          <PreviewRow label="Item" value={data.item_description} />
          {isBoth ? (
            <>
              <PreviewRow label="Gold Weight" value={data.item_weight_gold ? `${data.item_weight_gold} g` : null} accent="text-amber-300" />
              <PreviewRow label="Silver Weight" value={data.item_weight_silver ? `${data.item_weight_silver} g` : null} accent="text-slate-300" />
              <PreviewRow label="Total Weight" value={data.item_weight ? `${data.item_weight} g` : null} />
            </>
          ) : (
            <PreviewRow label="Weight" value={data.item_weight ? `${data.item_weight} g` : null} />
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 sm:px-5 py-1">
          {isBoth ? (
            <>
              <PreviewRow label="Gold Loan" value={fmtINR(data.loan_amount_gold)} accent="text-amber-300" />
              <PreviewRow label="Gold Interest" value={`${data.interest_rate_gold}% / month`} accent="text-amber-300" />
              <PreviewRow
                label="Gold Interest/mo"
                value={fmtINR((parseFloat(data.loan_amount_gold) * parseFloat(data.interest_rate_gold)) / 100)}
                accent="text-amber-400"
              />
              <PreviewRow label="Silver Loan" value={fmtINR(data.loan_amount_silver)} accent="text-slate-300" />
              <PreviewRow label="Silver Interest" value={`${data.interest_rate_silver}% / month`} accent="text-slate-300" />
              <PreviewRow
                label="Silver Interest/mo"
                value={fmtINR((parseFloat(data.loan_amount_silver) * parseFloat(data.interest_rate_silver)) / 100)}
                accent="text-slate-300"
              />
              <PreviewRow label="Total Loan" value={fmtINR(data.loan_amount)} accent="text-emerald-400" />
            </>
          ) : (
            <>
              <PreviewRow label="Loan Amount" value={fmtINR(data.loan_amount)} accent="text-emerald-400" />
              <PreviewRow label="Interest Rate" value={`${data.interest_rate}% / month`} />
              <PreviewRow
                label="Interest / mo"
                value={fmtINR((parseFloat(data.loan_amount) * parseFloat(data.interest_rate)) / 100)}
                accent="text-amber-400"
              />
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-5 sm:px-7 pt-3 sm:pt-4 pb-6 sm:pb-7 flex gap-3 shrink-0 border-t border-neutral-800 mt-2">
        <motion.button
          whileHover={saving ? {} : { scale: 1.02 }} whileTap={saving ? {} : { scale: 0.98 }}
          onClick={onEdit}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-xl py-3 text-sm font-semibold hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-40"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </motion.button>
        <motion.button
          whileHover={saving ? {} : { scale: 1.02 }} whileTap={saving ? {} : { scale: 0.98 }}
          onClick={handleConfirm}
          disabled={saving}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all shadow-lg ${theme.submitBtn.replace("w-full","").replace("mt-1","")} ${saving ? "opacity-80 cursor-not-allowed" : ""}`}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Confirm &amp; Create <span className="hidden sm:inline opacity-50 text-xs font-normal ml-1">⌘↵</span></>
          )}
        </motion.button>
      </div>
    </div>
  );
}

// ── Theme helpers ─────────────────────────────────────────────────────────────
function getTheme(collateralType) {
  if (collateralType === "silver") return {
    accent:       "text-slate-300",
    ring:         "focus:ring-slate-400/40 focus:border-slate-400/40",
    inputCls:     "w-full border border-neutral-700 rounded-xl px-4 py-2.5 text-sm bg-neutral-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-400/40 transition placeholder-neutral-600",
    pillActive:   "bg-slate-300 text-slate-900 border-slate-300",
    pillInactive: "bg-transparent text-slate-400 border-neutral-600 hover:border-slate-400/50 hover:text-slate-300",
    submitBtn:    "w-full bg-gradient-to-r from-slate-300 to-slate-200 text-slate-900 rounded-xl py-3 text-sm font-bold hover:from-slate-200 hover:to-white transition-all shadow-lg shadow-slate-400/20 mt-1",
    addPhone:     "flex items-center gap-1 text-xs text-slate-400/70 hover:text-slate-300 transition-colors mt-0.5",
    entryId:      "text-slate-300",
    border:       "border-slate-400/30",
    glow:         "shadow-slate-400/10",
    headerBorder: "border-slate-400/20",
  };
  if (collateralType === "both") return {
    accent:       "text-amber-300",
    ring:         "focus:ring-amber-500/30 focus:border-amber-500/30",
    inputCls:     "w-full border border-neutral-700 rounded-xl px-4 py-2.5 text-sm bg-neutral-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition placeholder-neutral-600",
    pillActive:   "bg-amber-500 text-slate-900 border-amber-500",
    pillInactive: "bg-transparent text-slate-400 border-neutral-600 hover:border-amber-500/50 hover:text-amber-400",
    submitBtn:    "w-full bg-gradient-to-r from-amber-500 to-slate-300 text-slate-900 rounded-xl py-3 text-sm font-bold hover:from-amber-400 hover:to-slate-200 transition-all shadow-lg shadow-amber-500/10 mt-1",
    addPhone:     "flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-400 transition-colors mt-0.5",
    entryId:      "text-amber-400",
    border:       "border-amber-500/20",
    glow:         "shadow-amber-500/10",
    headerBorder: "border-amber-500/20",
  };
  // default: gold
  return {
    accent:       "text-amber-400",
    ring:         "focus:ring-amber-500/40 focus:border-amber-500/40",
    inputCls:     "w-full border border-neutral-700 rounded-xl px-4 py-2.5 text-sm bg-neutral-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition placeholder-neutral-600",
    pillActive:   "bg-amber-500 text-slate-900 border-amber-500",
    pillInactive: "bg-transparent text-slate-400 border-neutral-600 hover:border-amber-500/50 hover:text-amber-400",
    submitBtn:    "w-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-xl py-3 text-sm font-bold hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20 mt-1",
    addPhone:     "flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-400 transition-colors mt-0.5",
    entryId:      "text-amber-400",
    border:       "border-amber-500/20",
    glow:         "shadow-amber-500/20",
    headerBorder: "border-amber-500/20",
  };
}

export default function EntryModal({ nextSerial, defaultDate, isBoss, onClose, onSaved, onCancelBill, existingPawns = [] }) {
  const { dragHandleProps, sheetProps } = useSwipeToDismiss(onClose);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  const [relativeType, setRelativeType] = useState("Father");

  const initDate = defaultDate || today;

  const [form, setForm] = useState({
    series: "",
    serial_no: String(nextSerial ?? ""),
    entry_date: initDate,
    borrower_name: "",
    relative_name: "",
    phones: [""],
    aadhar: "",
    address: "",
    item_description: "",
    item_weight: "",
    item_weight_gold: "",
    item_weight_silver: "",
    collateral_type: "gold",
    loan_amount: "",
    interest_rate: "2",
    loan_amount_gold: "",
    interest_rate_gold: "2",
    loan_amount_silver: "",
    interest_rate_silver: "5",
  });

  useEffect(() => {
    if (nextSerial != null) {
      setForm(prev => ({ ...prev, serial_no: String(nextSerial) }));
    }
  }, [nextSerial]);

  const [dateDisplay, setDateDisplay] = useState(toDisplay(initDate));

  const [submitError, setSubmitError] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Voids this bill number without a transaction — no details required. Empty
  // required fields are sent as "—" placeholders; the entry is saved Cancelled.
  async function handleCancelBill() {
    if (cancelling) return;
    setCancelling(true);
    const relName = form.relative_name.trim()
      ? `${relativeType}: ${form.relative_name.trim()}`
      : "—";
    const payload = {
      serial_no: parseInt(form.serial_no, 10),
      series: (form.series || "").toUpperCase() || null,
      entry_date: form.entry_date,
      borrower_name: form.borrower_name.trim() || "—",
      relative_name: relName,
      phone: serializePhones(form.phones),
      aadhar: form.aadhar || null,
      address: form.address || null,
      item_description: form.item_description.trim() || "—",
      collateral_type: form.collateral_type,
      loan_amount: form.loan_amount ? parseFloat(rawAmount(form.loan_amount)).toFixed(2) : "0",
      is_cancelled: true,
    };
    try {
      await onCancelBill?.(payload);
      onClose();
    } catch {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  }

  // pending holds the processed payload ready to confirm
  const [pending, setPending] = useState(null);

  // Live duplicate check
  const isDuplicate = existingPawns.some(
    (p) =>
      Number(p.serial_no) === Number(form.serial_no) &&
      (p.series || "") === (form.series || "").toUpperCase()
  );

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function capFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const theme = getTheme(form.collateral_type);

  // ── Field refs for Enter-key navigation ──────────────────────────────────────
  const seriesRef      = useRef(null);

  // Auto-focus series on open (first field; Enter moves to serial, then onward)
  useEffect(() => { setTimeout(() => seriesRef.current?.focus(), 80); }, []);
  const serialRef      = useRef(null);
  const dateRef        = useRef(null);
  const borrowerRef    = useRef(null);
  const relativeRef    = useRef(null);
  const phone0Ref      = useRef(null);
  const aadharRef      = useRef(null);
  const addressRef     = useRef(null);
  const descRef        = useRef(null);
  const weightRef      = useRef(null);
  const weightGoldRef  = useRef(null);
  const weightSilverRef= useRef(null);
  const loanRef        = useRef(null);
  const loanGoldRef    = useRef(null);
  const loanSilverRef  = useRef(null);
  const interestRef    = useRef(null);
  const interestGoldRef= useRef(null);
  const interestSilverRef = useRef(null);

  function getFieldOrder() {
    const base = [seriesRef, serialRef, dateRef, borrowerRef, relativeRef, phone0Ref, aadharRef, addressRef, descRef];
    if (form.collateral_type === "both") {
      return [...base, weightGoldRef, weightSilverRef, loanGoldRef, interestGoldRef, loanSilverRef, interestSilverRef];
    }
    return [...base, weightRef, loanRef, interestRef];
  }

  function focusNext(currentRef) {
    const order = getFieldOrder();
    const idx = order.findIndex(r => r === currentRef);
    if (idx !== -1 && idx < order.length - 1) {
      order[idx + 1].current?.focus();
    }
  }

  function focusPrev(currentRef) {
    const order = getFieldOrder();
    const idx = order.findIndex(r => r === currentRef);
    if (idx > 0) {
      order[idx - 1].current?.focus();
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    if (isDuplicate) {
      const label = `${(form.series || "").toUpperCase()}${form.serial_no}`;
      setSubmitError(`Entry #${label} already exists. Please use a different serial number.`);
      return;
    }
    const phoneJson = serializePhones(form.phones);
    // Prefix relative name with type so it displays correctly everywhere
    const relName = form.relative_name.trim()
      ? `${relativeType}: ${form.relative_name.trim()}`
      : form.relative_name.trim();
    let processed;
    if (form.collateral_type === "both") {
      const goldAmt = parseFloat(rawAmount(form.loan_amount_gold)) || 0;
      const silverAmt = parseFloat(rawAmount(form.loan_amount_silver)) || 0;
      const goldWt = parseFloat(form.item_weight_gold) || 0;
      const silverWt = parseFloat(form.item_weight_silver) || 0;
      processed = {
        ...form,
        relative_name: relName,
        phone: phoneJson,
        series: form.series.toUpperCase(),
        serial_no: parseInt(form.serial_no, 10),
        loan_amount: (goldAmt + silverAmt).toFixed(2),
        loan_amount_gold: goldAmt.toFixed(2),
        interest_rate_gold: form.interest_rate_gold,
        loan_amount_silver: silverAmt.toFixed(2),
        interest_rate_silver: form.interest_rate_silver,
        item_weight_gold: goldWt.toFixed(2),
        item_weight_silver: silverWt.toFixed(2),
        item_weight: (goldWt + silverWt).toFixed(2),
      };
    } else {
      processed = {
        ...form,
        relative_name: relName,
        phone: phoneJson,
        series: form.series.toUpperCase(),
        serial_no: parseInt(form.serial_no, 10),
        loan_amount: parseFloat(rawAmount(form.loan_amount)).toFixed(2),
      };
    }
    setPending(processed);
  }

  // ── ⌘ Enter / Ctrl+Enter shortcut ────────────────────────────────────────────
  const submitBtnRef = useRef(null);
  useEffect(() => {
    function handleCmdEnter(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        const tag = document.activeElement?.tagName;
        const inField = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);
        if (inField && !pending) return; // let field handler take Cmd+Enter; only act on preview screen
        e.preventDefault();
        if (pending) {
          onSaved(pending);
        } else {
          submitBtnRef.current?.click();
        }
      }
    }
    document.addEventListener("keydown", handleCmdEnter);
    return () => document.removeEventListener("keydown", handleCmdEnter);
  }, [pending, onSaved]);

  // ── Hotkeys: ⌘1=Gold, ⌘2=Silver, ⌘3=Both, ⌘F=Father, ⌘S=Spouse ────────────
  useEffect(() => {
    if (pending) return; // disable on preview screen
    function handleHotkey(e) {
      // ⌥1/2/3 for collateral type — use e.code so Mac Option key works correctly
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        if (e.code === "Digit1") { e.preventDefault(); set("collateral_type", "gold");   set("interest_rate", "2"); set("interest_rate_gold", "2"); }
        if (e.code === "Digit2") { e.preventDefault(); set("collateral_type", "silver"); set("interest_rate", "5"); set("interest_rate_silver", "5"); }
        if (e.code === "Digit3") { e.preventDefault(); set("collateral_type", "both");   set("interest_rate_gold", "2"); set("interest_rate_silver", "5"); }
        return;
      }
      // ⌘F / ⌘S for Father / Spouse
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key === "f" || e.key === "F") { e.preventDefault(); setRelativeType("Father"); }
        if (e.key === "s" || e.key === "S") { e.preventDefault(); setRelativeType("Spouse"); }
      }
    }
    document.addEventListener("keydown", handleHotkey);
    return () => document.removeEventListener("keydown", handleHotkey);
  }, [pending]);

  return (
    <>
    <AnimatePresence>
      <motion.div
        key="entry-modal"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg sm:mx-4 relative max-h-[95vh] sm:max-h-[92vh] flex flex-col transition-shadow duration-300 ${theme.glow}`}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          {...sheetProps}
        >
          {/* Colored type indicator strip */}
          <div className={`h-1 w-full rounded-t-3xl sm:rounded-t-3xl transition-all duration-300 ${
            form.collateral_type === "silver"
              ? "bg-gradient-to-r from-slate-400 to-slate-300"
              : form.collateral_type === "both"
              ? "bg-gradient-to-r from-amber-500 to-slate-300"
              : "bg-gradient-to-r from-amber-500 to-amber-400"
          }`} />

          {/* Mobile drag handle */}
          <div className="flex justify-center pt-2 pb-1 sm:hidden shrink-0 touch-none cursor-grab active:cursor-grabbing" {...dragHandleProps}>
            <div className="w-10 h-1 rounded-full bg-neutral-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-7 pt-3 sm:pt-7 pb-3 sm:pb-4 border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {pending ? (
                  <motion.h2 key="preview"
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }} className="text-base sm:text-lg font-bold text-white">
                    Confirm Entry
                  </motion.h2>
                ) : (
                  <motion.h2 key="form"
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.18 }} className="text-base sm:text-lg font-bold text-white">
                    New Pawn Entry
                  </motion.h2>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-1.5">
              {!pending && onCancelBill && (
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setShowCancelConfirm(true)}
                  title="Void this bill number without a transaction"
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-500/30 hover:bg-red-500/10 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" /> Cancel Bill
                </motion.button>
              )}
              <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body — form or preview */}
          <AnimatePresence mode="wait">
            {pending ? (
              <motion.div key="preview"
                initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 32 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col flex-1 min-h-0 pt-3 sm:pt-4">
                <EntryPreview data={pending} onConfirm={() => onSaved(pending)} onEdit={() => setPending(null)} theme={theme} />
              </motion.div>
            ) : (
              <motion.div key="form"
                initial={{ opacity: 0, x: -32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-y-auto px-5 sm:px-7 py-4 sm:py-5">
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">

                  {/* Series / Entry No / Date — 3 cols on all sizes but compact on mobile */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <Field label="Series">
                      <input type="text" value={form.series}
                        ref={seriesRef}
                        onChange={(e) => set("series", e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase())}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNext(seriesRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(seriesRef); } }}
                        className={`${theme.inputCls} font-mono text-center tracking-widest uppercase`} placeholder="A" maxLength={2} />
                    </Field>
                    <Field label="Entry No.">
                      <input type="number" value={form.serial_no}
                        ref={serialRef}
                        onChange={(e) => set("serial_no", e.target.value)} required
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNext(serialRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(serialRef); } }}
                        className={`${theme.inputCls} font-mono`} placeholder={String(nextSerial)} />
                    </Field>
                    <Field label="Date">
                      <input
                        type="text"
                        inputMode="numeric"
                        ref={dateRef}
                        value={dateDisplay}
                        onChange={(e) => {
                          if (!isBoss) return;
                          const isBackspace = e.target.value.length < dateDisplay.length;
                          const { display, iso } = parseDateInput(e.target.value, isBackspace);
                          setDateDisplay(display);
                          if (iso) set("entry_date", iso);
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === "ArrowUp" || e.key === "ArrowDown") && isBoss) {
                            e.preventDefault();
                            const base = form.entry_date || today;
                            const d = new Date(base);
                            d.setDate(d.getDate() + (e.key === "ArrowUp" ? 1 : -1));
                            const iso = d.toISOString().split("T")[0];
                            set("entry_date", iso);
                            setDateDisplay(toDisplay(iso));
                          } else if (e.key === "Enter") {
                            e.preventDefault(); focusNext(dateRef);
                          } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") {
                            e.preventDefault(); focusPrev(dateRef);
                          }
                        }}
                        readOnly={!isBoss}
                        placeholder="DD/MM/YY"
                        maxLength={10}
                        className={`${theme.inputCls} font-mono text-sm ${!isBoss ? "opacity-50 cursor-not-allowed select-none" : ""}`}
                      />
                    </Field>
                  </div>

                  {(form.series || form.serial_no) && (
                    <p className="text-xs text-neutral-500 flex items-center gap-2">
                      Entry ID: <span className={`font-mono font-bold ${isDuplicate ? "text-red-400" : theme.entryId}`}>
                        {(form.series || "").toUpperCase()}{form.serial_no}
                      </span>
                      {isDuplicate && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                          ⚠ Already exists
                        </span>
                      )}
                    </p>
                  )}

                  {submitError && (
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                      {submitError}
                    </div>
                  )}

                  {/* Collateral type */}
                  <Field label="Collateral Type">
                    <div className="flex gap-2 mt-1">
                      {["gold", "silver", "both"].map((t) => (
                        <button key={t} type="button" onClick={() => {
                          set("collateral_type", t);
                          if (t === "gold")   { set("interest_rate", "2"); set("interest_rate_gold", "2"); }
                          if (t === "silver") { set("interest_rate", "5"); set("interest_rate_silver", "5"); }
                          if (t === "both")   { set("interest_rate_gold", "2"); set("interest_rate_silver", "5"); }
                        }}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                            form.collateral_type === t
                              ? t === "gold" ? "bg-amber-500 border-amber-500 text-slate-900"
                                : t === "silver" ? "bg-slate-300 border-slate-300 text-slate-900"
                                : "bg-gradient-to-r from-amber-500 to-slate-300 border-amber-500/50 text-slate-900"
                              : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500"
                          }`}>
                          <span className="flex items-center justify-center gap-1.5">
                            {t === "gold" ? "🥇" : t === "silver" ? "🥈" : "✨"}
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                            <kbd className="hidden sm:inline text-[9px] font-bold opacity-50 border border-current rounded px-1">⌥{t === "gold" ? "1" : t === "silver" ? "2" : "3"}</kbd>
                          </span>
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Borrower + Father — stacked on mobile, 2-col on sm+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 sm:items-end">
                    <Field label="Borrower Name">
                      <input type="text" value={form.borrower_name}
                        ref={borrowerRef}
                        onChange={(e) => set("borrower_name", capFirst(e.target.value))} required
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNext(borrowerRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(borrowerRef); } }}
                        className={theme.inputCls} placeholder="Full name" />
                    </Field>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label">{relativeType}'s Name</label>
                        <div className="flex gap-1">
                          {["Father", "Spouse"].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setRelativeType(t)}
                              className={`px-3 py-0.5 rounded-lg text-xs font-semibold transition-all border ${
                                relativeType === t
                                  ? theme.pillActive
                                  : theme.pillInactive
                              }`}
                            >
                              {t}
                              <kbd className="hidden sm:inline ml-1 text-[9px] font-bold opacity-50 border border-current rounded px-0.5">⌘{t === "Father" ? "F" : "S"}</kbd>
                            </button>
                          ))}
                        </div>
                      </div>
                      <input type="text" value={form.relative_name}
                        ref={relativeRef}
                        onChange={(e) => set("relative_name", capFirst(e.target.value))} required
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(relativeRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(relativeRef); } }}
                        className={theme.inputCls} placeholder={`${relativeType}'s full name`} />
                    </div>
                  </div>

                  {/* Phone numbers + Aadhar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <Field label="Phone (optional)">
                      <div className="space-y-2">
                        {form.phones.map((ph, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-medium">+91</span>
                              <input
                                type="tel"
                                inputMode="numeric"
                                ref={idx === 0 ? phone0Ref : undefined}
                                value={ph}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                  const updated = [...form.phones];
                                  updated[idx] = val;
                                  set("phones", updated);
                                }}
                                onKeyDown={(e) => { if (e.key === "Enter" && idx === 0) { e.preventDefault(); focusNext(phone0Ref); } }}
                                className={`${theme.inputCls} pl-9 font-mono tracking-wide text-sm`}
                                placeholder="9876543210"
                                maxLength={10}
                              />
                            </div>
                            {form.phones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => set("phones", form.phones.filter((_, i) => i !== idx))}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {form.phones.length < 4 && (
                          <button
                            type="button"
                            onClick={() => set("phones", [...form.phones, ""])}
                            className={theme.addPhone}
                          >
                            <Plus className="w-3 h-3" /> Add another number
                          </button>
                        )}
                      </div>
                    </Field>
                    <Field label="Aadhar No. (optional)">
                      <input type="text" inputMode="numeric" value={form.aadhar}
                        ref={aadharRef}
                        onChange={(e) => set("aadhar", formatAadhar(e.target.value))}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(aadharRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(aadharRef); } }}
                        className={`${theme.inputCls} font-mono tracking-widest`} placeholder="XXXX XXXX XXXX" maxLength={14} />
                    </Field>
                  </div>

                  <Field label="Address (optional)">
                    <textarea value={form.address} onChange={(e) => set("address", e.target.value)}
                      ref={addressRef}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(addressRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(addressRef); } }}
                      rows={2} className={`${theme.inputCls} resize-none`} placeholder="Street, City" />
                  </Field>

                  <Field label="Item Description">
                    <textarea value={form.item_description} onChange={(e) => set("item_description", e.target.value)}
                      ref={descRef}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                          // Plain Enter → move to next field
                          e.preventDefault();
                          focusNext(descRef);
                        } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          // Cmd+Enter → insert newline at cursor
                          e.preventDefault();
                          const ta = descRef.current;
                          if (!ta) return;
                          const s = ta.selectionStart, en = ta.selectionEnd;
                          const newVal = form.item_description.slice(0, s) + "\n" + form.item_description.slice(en);
                          set("item_description", newVal);
                          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1; });
                        }
                        // Shift+Enter → browser default (newline) — no handler needed
                      }}
                      required rows={2} className={`${theme.inputCls} resize-none`} placeholder="e.g. 22K Gold Necklace" />
                  </Field>

                  {/* Weight — stacked on mobile for both */}
                  {form.collateral_type === "both" ? (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <Field label="Gold Weight (g)">
                        <div className="relative">
                          <input type="number" min="0" step="0.01" value={form.item_weight_gold}
                            ref={weightGoldRef}
                            onChange={(e) => set("item_weight_gold", e.target.value)} required
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(weightGoldRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(weightGoldRef); } }}
                            className={`${theme.inputCls} pr-8`} placeholder="0.00" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-500 font-medium">g</span>
                        </div>
                      </Field>
                      <Field label="Silver Weight (g)">
                        <div className="relative">
                          <input type="number" min="0" step="0.01" value={form.item_weight_silver}
                            ref={weightSilverRef}
                            onChange={(e) => set("item_weight_silver", e.target.value)} required
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(weightSilverRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(weightSilverRef); } }}
                            className={`${theme.inputCls} pr-8`} placeholder="0.00" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">g</span>
                        </div>
                      </Field>
                    </div>
                  ) : (
                    <Field label="Weight (grams)">
                      <div className="relative">
                        <input type="number" min="0" step="0.01" value={form.item_weight}
                          ref={weightRef}
                          onChange={(e) => set("item_weight", e.target.value)} required
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(weightRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(weightRef); } }}
                          className={`${theme.inputCls} pr-8`} placeholder="0.00" />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${theme.accent}`}>g</span>
                      </div>
                    </Field>
                  )}

                  {/* Loan + Interest */}
                  {form.collateral_type === "both" ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <Field label="Gold Loan (₹)">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-medium">₹</span>
                            <input type="text" inputMode="decimal" value={form.loan_amount_gold}
                              ref={loanGoldRef}
                              onChange={(e) => set("loan_amount_gold", formatINR(e.target.value))} required
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(loanGoldRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(loanGoldRef); } }}
                              className={`${theme.inputCls} pl-7 font-semibold`} placeholder="0" />
                          </div>
                        </Field>
                        <Field label="Gold Interest (%)">
                          <div className="relative">
                            <input type="text" inputMode="decimal" value={form.interest_rate_gold}
                              ref={interestGoldRef}
                              onChange={(e) => set("interest_rate_gold", e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1"))} required
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(interestGoldRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(interestGoldRef); } }}
                              className={`${theme.inputCls} pr-7`} placeholder="2.0" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-medium">%</span>
                          </div>
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <Field label="Silver Loan (₹)">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-medium">₹</span>
                            <input type="text" inputMode="decimal" value={form.loan_amount_silver}
                              ref={loanSilverRef}
                              onChange={(e) => set("loan_amount_silver", formatINR(e.target.value))} required
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(loanSilverRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(loanSilverRef); } }}
                              className={`${theme.inputCls} pl-7 font-semibold`} placeholder="0" />
                          </div>
                        </Field>
                        <Field label="Silver Interest (%)">
                          <div className="relative">
                            <input type="text" inputMode="decimal" value={form.interest_rate_silver}
                              ref={interestSilverRef}
                              onChange={(e) => set("interest_rate_silver", e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1"))} required
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(interestSilverRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(interestSilverRef); } }}
                              className={`${theme.inputCls} pr-7`} placeholder="2.0" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-medium">%</span>
                          </div>
                        </Field>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <Field label="Loan Amount (₹)">
                        <div className="relative">
                          <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium ${theme.accent}`}>₹</span>
                          <input type="text" inputMode="decimal" value={form.loan_amount}
                            ref={loanRef}
                            onChange={(e) => set("loan_amount", formatINR(e.target.value))} required
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(loanRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(loanRef); } }}
                            className={`${theme.inputCls} pl-7 font-semibold`} placeholder="0" />
                        </div>
                      </Field>
                      <Field label="Interest (% /mo)">
                        <div className="relative">
                          <input type="text" inputMode="decimal" value={form.interest_rate}
                            ref={interestRef}
                            onChange={(e) => set("interest_rate", e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1"))} required
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); focusNext(interestRef); } else if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") { e.preventDefault(); focusPrev(interestRef); } }}
                            className={`${theme.inputCls} pr-7`} placeholder="2.0" />
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${theme.accent}`}>%</span>
                        </div>
                      </Field>
                    </div>
                  )}

                  <AnimatePresence>
                    {(form.collateral_type === "both"
                      ? (parseFloat(String(form.loan_amount_gold).replace(/,/g,""))||0) + (parseFloat(String(form.loan_amount_silver).replace(/,/g,""))||0)
                      : parseFloat(String(form.loan_amount).replace(/,/g,""))||0
                    ) > 0 && (
                      <LiveInterestPreview
                        collateralType={form.collateral_type}
                        loanAmount={form.loan_amount}
                        interestRate={form.interest_rate}
                        loanAmountGold={form.loan_amount_gold}
                        interestRateGold={form.interest_rate_gold}
                        loanAmountSilver={form.loan_amount_silver}
                        interestRateSilver={form.interest_rate_silver}
                      />
                    )}
                  </AnimatePresence>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    ref={submitBtnRef}
                    type="submit"
                    className={theme.submitBtn}>
                    Preview Entry <span className="hidden sm:inline opacity-50 text-xs font-normal ml-1">⌘↵</span>
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>

    {/* Cancel-bill confirmation — its own AnimatePresence so it never collides
        with the modal overlay's presence tracking. */}
    <AnimatePresence>
      {showCancelConfirm && (
        <motion.div
          key="cancel-confirm"
          className="fixed inset-0 flex items-center justify-center bg-black/70"
          style={{ zIndex: 80 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => !cancelling && setShowCancelConfirm(false)}
        >
          <motion.div
            className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6 text-center"
            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Ban className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              Cancel Bill #{form.series ? `${form.series.toUpperCase()}${form.serial_no}` : form.serial_no}?
            </h3>
            <p className="text-sm text-neutral-500 mb-5">
              This voids the bill number with no transaction — no details needed. It's saved as a Cancelled entry for your records and can be restored later.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelConfirm(false)} disabled={cancelling}
                className="flex-1 border border-neutral-700 text-neutral-300 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-40">
                Go Back
              </button>
              <button onClick={handleCancelBill} disabled={cancelling}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70">
                {cancelling ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelling…</> : "Cancel Bill"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
