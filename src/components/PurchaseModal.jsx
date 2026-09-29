import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2 } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

function toDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// "12/03/26" | "120326" | "12/03/2026" → "2026-03-12" (null if incomplete)
function toISO(disp) {
  const digits = disp.replace(/\D/g, "");
  if (digits.length < 6) return null;
  const d = digits.slice(0, 2), m = digits.slice(2, 4);
  let y = digits.slice(4, 8);
  if (y.length === 2) y = "20" + y;
  if (y.length !== 4) return null;
  const iso = `${y}-${m}-${d}`;
  return isNaN(new Date(iso).getTime()) ? null : iso;
}

function formatDateTyping(raw) {
  let digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatINR(raw) {
  const clean = String(raw).replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
  if (!clean) return "";
  const [intPart, decPart] = clean.split(".");
  const formatted = Number(intPart || 0).toLocaleString("en-IN");
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

const rawAmount = (v) => String(v).replace(/,/g, "");

function Field({ label, children, optional }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
        {label}{optional && <span className="text-neutral-600 font-normal"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-colors placeholder-neutral-600";

export default function PurchaseModal({ nextSerial, initial = null, existing = [], onClose, onSave }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const isEdit = !!initial;

  const parseRel = (val) => {
    if (!val) return { type: "Father", name: "" };
    const m = val.match(/^(Father|Spouse):\s*(.*)$/i);
    return m ? { type: m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), name: m[2] } : { type: "Father", name: val };
  };
  const rel0 = parseRel(initial?.relative_name);

  const [relType, setRelType] = useState(rel0.type);
  const [form, setForm] = useState({
    series: initial?.series || "",
    serial_no: initial ? String(initial.serial_no) : String(nextSerial ?? ""),
    purchase_date: initial?.purchase_date || today,
    seller_name: initial?.seller_name || "",
    relative_name: rel0.name,
    phone: initial?.phone || "",
    aadhar: initial?.aadhar || "",
    address: initial?.address || "",
    item_description: initial?.item_description || "",
    item_weight: initial?.item_weight || "",
    metal_type: initial?.metal_type || "gold",
    amount_paid: initial?.amount_paid ? formatINR(initial.amount_paid) : "",
    notes: initial?.notes || "",
  });
  const [dateDisplay, setDateDisplay] = useState(toDisplay(initial?.purchase_date || today));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit && nextSerial != null) {
      setForm((prev) => ({ ...prev, serial_no: String(nextSerial) }));
    }
  }, [nextSerial, isEdit]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const isSilver = form.metal_type === "silver";

  // Live duplicate check against the loaded list (server blocks it too)
  const normSeries = (form.series || "").trim().toUpperCase() || null;
  const isDuplicate = !isEdit && existing.some(
    (p) => p.serial_no === parseInt(form.serial_no, 10) && (p.series || null) === normSeries
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setError("");
    if (isDuplicate) {
      setError(`Form #${normSeries || ""}${form.serial_no} already exists. Use a different form number.`);
      return;
    }
    const iso = toISO(dateDisplay);
    if (!iso) { setError("Enter the date as DD/MM/YY."); return; }
    const amount = parseFloat(rawAmount(form.amount_paid));
    if (!amount || amount <= 0) { setError("Enter the amount paid."); return; }

    const payload = {
      purchase_date: iso,
      seller_name: form.seller_name.trim(),
      relative_name: form.relative_name.trim() ? `${relType}: ${form.relative_name.trim()}` : null,
      phone: form.phone.trim() || null,
      aadhar: form.aadhar.trim() || null,
      address: form.address.trim() || null,
      item_description: form.item_description.trim(),
      item_weight: form.item_weight ? String(parseFloat(form.item_weight).toFixed(3)) : null,
      metal_type: form.metal_type,
      amount_paid: amount.toFixed(2),
      notes: form.notes.trim() || null,
    };
    if (!isEdit) {
      payload.serial_no = parseInt(form.serial_no, 10);
      payload.series = normSeries;
    }

    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="purchase-modal"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col"
        >
          {/* Colored strip — matches metal type */}
          <div className={`h-1 w-full rounded-t-3xl transition-all duration-300 ${
            isSilver ? "bg-gradient-to-r from-slate-400 to-slate-300" : "bg-gradient-to-r from-amber-500 to-amber-400"
          }`} />

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-7 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-neutral-800 shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-white">
              {isEdit ? "Edit Purchase Form" : "New Purchase Form"}
            </h2>
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 sm:px-7 py-4 sm:py-5">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Field label="Series">
                  <input type="text" value={form.series} maxLength={2} disabled={isEdit}
                    onChange={(e) => set("series", e.target.value.toUpperCase())}
                    className={`${inputCls} font-mono uppercase disabled:opacity-50`} placeholder="—" />
                </Field>
                <Field label="Form No.">
                  <input type="text" inputMode="numeric" value={form.serial_no} required disabled={isEdit}
                    onChange={(e) => set("serial_no", e.target.value.replace(/\D/g, ""))}
                    className={`${inputCls} font-mono disabled:opacity-50 ${isDuplicate ? "border-red-500/60 ring-1 ring-red-500/30" : ""}`} />
                </Field>
                <Field label="Date">
                  <input type="text" value={dateDisplay} required
                    onChange={(e) => setDateDisplay(formatDateTyping(e.target.value))}
                    className={`${inputCls} font-mono`} placeholder="DD/MM/YY" />
                </Field>
              </div>
              {isDuplicate && (
                <p className="text-xs text-red-400 -mt-1">This form number already exists.</p>
              )}

              {/* Metal type */}
              <div className="grid grid-cols-2 gap-2">
                {["gold", "silver"].map((t) => (
                  <button key={t} type="button" onClick={() => set("metal_type", t)}
                    className={`rounded-xl py-2.5 text-sm font-semibold border transition-all ${
                      form.metal_type === t
                        ? t === "gold"
                          ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                          : "bg-slate-400/15 border-slate-400/50 text-slate-200"
                        : "bg-neutral-800 border-neutral-700 text-neutral-500 hover:text-neutral-300"
                    }`}>
                    {t === "gold" ? "✦ Gold" : "◆ Silver"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Seller Name">
                  <input type="text" value={form.seller_name} required
                    onChange={(e) => set("seller_name", e.target.value)}
                    className={inputCls} placeholder="Full name" />
                </Field>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-neutral-400">Father / Spouse</label>
                    <div className="flex gap-1">
                      {["Father", "Spouse"].map((t) => (
                        <button key={t} type="button" onClick={() => setRelType(t)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                            relType === t ? "bg-amber-500 text-slate-900" : "bg-neutral-800 text-neutral-500 hover:text-neutral-300"
                          }`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <input type="text" value={form.relative_name}
                    onChange={(e) => set("relative_name", e.target.value)}
                    className={inputCls} placeholder={`${relType}'s name`} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Phone" optional>
                  <input type="text" inputMode="tel" value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className={inputCls} placeholder="9876543210" />
                </Field>
                <Field label="Aadhar No." optional>
                  <input type="text" value={form.aadhar}
                    onChange={(e) => set("aadhar", e.target.value)}
                    className={`${inputCls} font-mono`} placeholder="XXXX XXXX XXXX" />
                </Field>
              </div>

              <Field label="Address" optional>
                <input type="text" value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  className={inputCls} placeholder="Street, City" />
              </Field>

              <Field label="Item Description">
                <input type="text" value={form.item_description} required
                  onChange={(e) => set("item_description", e.target.value)}
                  className={inputCls} placeholder="e.g. old 22K gold chain" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Weight (grams)" optional>
                  <div className="relative">
                    <input type="number" step="0.001" min="0" value={form.item_weight}
                      onChange={(e) => set("item_weight", e.target.value)}
                      className={`${inputCls} pr-8`} placeholder="0.00" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">g</span>
                  </div>
                </Field>
                <Field label="Amount Paid (₹)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₹</span>
                    <input type="text" inputMode="decimal" value={form.amount_paid} required
                      onChange={(e) => set("amount_paid", formatINR(e.target.value))}
                      className={`${inputCls} pl-7`} placeholder="0" />
                  </div>
                </Field>
              </div>

              <Field label="Notes" optional>
                <input type="text" value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className={inputCls} placeholder="Anything unusual about this purchase" />
              </Field>

              {error && (
                <p className="text-sm text-red-400 text-center bg-red-500/10 rounded-xl py-2">{error}</p>
              )}

              <motion.button
                whileHover={saving ? {} : { scale: 1.01 }} whileTap={saving ? {} : { scale: 0.99 }}
                type="submit" disabled={saving || isDuplicate}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSilver
                    ? "bg-gradient-to-r from-slate-400 to-slate-300 text-slate-900 hover:from-slate-300 hover:to-slate-200 shadow-slate-400/20"
                    : "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 hover:from-amber-400 hover:to-amber-300 shadow-amber-500/20"
                }`}
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><CheckCircle2 className="w-4 h-4" /> {isEdit ? "Save Changes" : "Save Purchase"}</>}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
