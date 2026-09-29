import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Trash2, Loader2, User, Phone, CreditCard, MapPin, FileSignature } from "lucide-react";

function fmtAmount(v) {
  return `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function stripPrefix(val) {
  if (!val) return "";
  return val.replace(/^(Father|Spouse|Mother|Husband|Wife):\s*/i, "");
}

function relLabel(val) {
  if (!val) return "Father / Spouse";
  const m = val.match(/^(Father|Spouse)/i);
  return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : "Father / Spouse";
}

function InfoRow({ label, value, icon: Icon, highlight }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-neutral-800 last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium uppercase tracking-wide w-36 shrink-0">
        {Icon && <Icon className="w-3.5 h-3.5 opacity-60" />}{label}
      </span>
      <span className={`text-sm font-medium text-right ${highlight ? "text-emerald-400" : "text-slate-200"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

export default function PurchaseDetailCard({ purchase: p, isBoss, onClose, onEdit, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const label = p.series ? `${p.series}${p.serial_no}` : `#${p.serial_no}`;
  const isSilver = p.metal_type === "silver";

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(p.id);
      onClose();
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <>
    <AnimatePresence>
      <motion.div
        key="purchase-detail"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-neutral-800 shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-slate-900 ${
                  isSilver ? "bg-gradient-to-br from-slate-300 to-slate-400" : "bg-gradient-to-br from-amber-400 to-amber-500"
                }`}>
                  {(p.seller_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">{p.seller_name}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {relLabel(p.relative_name)}: {stripPrefix(p.relative_name) || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg border ${
                  isSilver
                    ? "bg-slate-400/10 text-slate-300 border-slate-400/25"
                    : "bg-amber-400/10 text-amber-300 border-amber-400/25"
                }`}>{label}</span>
                <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1">
            <InfoRow label="Purchase Date" value={p.purchase_date} icon={FileSignature} />
            <InfoRow label="Type" value={isSilver ? "Silver" : "Gold"} />
            <InfoRow label="Item" value={p.item_description} />
            <InfoRow label="Weight" value={p.item_weight ? `${p.item_weight} g` : null} />
            <InfoRow label="Amount Paid" value={fmtAmount(p.amount_paid)} highlight />
            <InfoRow label="Phone" value={p.phone} icon={Phone} />
            <InfoRow label="Aadhar" value={p.aadhar} icon={CreditCard} />
            <InfoRow label="Address" value={p.address} icon={MapPin} />
            {p.notes && <InfoRow label="Notes" value={p.notes} />}
            {p.created_by?.name && (
              <InfoRow label="Entered By" value={p.created_by.name} icon={User} />
            )}
          </div>

          {/* Actions */}
          <div className="px-5 sm:px-6 py-4 border-t border-neutral-800 flex gap-3 shrink-0">
            <button
              onClick={() => onEdit(p)}
              className="flex-1 flex items-center justify-center gap-2 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            {isBoss && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 border border-red-500/30 bg-red-500/10 text-red-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>

    {/* Delete confirmation */}
    <AnimatePresence>
      {showDeleteConfirm && (
        <motion.div
          key="purchase-delete-confirm"
          className="fixed inset-0 flex items-center justify-center bg-black/70"
          style={{ zIndex: 80 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <motion.div
            className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6 text-center"
            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Delete Form {label}?</h3>
            <p className="text-sm text-neutral-400 mb-1">{p.seller_name}</p>
            <p className="text-sm text-neutral-500 mb-5">This removes the digital record permanently. The physical form in your book is not affected.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                className="flex-1 border border-neutral-700 text-neutral-300 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-40">
                Go Back
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70">
                {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
