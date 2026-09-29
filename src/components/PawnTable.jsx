import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ShoppingBag, Ban } from "lucide-react";
import { computePayable } from "../utils/interest";

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function stripPrefix(val) {
  if (!val) return "";
  return val.replace(/^(Father|Spouse|Mother|Husband|Wife):\s*/i, "");
}

// AMOUNT column shows the most meaningful figure per status:
//  - Active (still on loan): live payable = principal + accrued interest + dhafa.
//  - Released: the amount actually collected — the boss's recorded "Collected Amt"
//    (actual_release_amount), or, for older entries without it, the computed
//    release amount at the release date (computePayable uses released_date).
//  - Sold / Cancelled: the original loan amount (unchanged).
// Matches the detail card's calculations.
function displayAmount(p) {
  if (p.is_released && !p.is_sold && !p.is_cancelled) {
    if (p.actual_release_amount != null && p.actual_release_amount !== "")
      return Number(p.actual_release_amount);
    return computePayable(p);
  }
  if (!p.is_released && !p.is_cancelled) {
    return computePayable(p);
  }
  return Number(p.loan_amount || 0);
}

export default function PawnTable({ pawns, loading, onRowClick }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-6 h-6 border-2 border-neutral-700 border-t-amber-400 rounded-full"
        />
        <span className="text-sm text-slate-500">Loading entries…</span>
      </div>
    );
  }

  if (!pawns.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 gap-2"
      >
        <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mb-1">
          <Clock className="w-5 h-5 text-neutral-500" />
        </div>
        <p className="text-sm font-medium text-slate-400">No entries found</p>
        <p className="text-xs text-neutral-600">Try adjusting your search</p>
      </motion.div>
    );
  }

  return (
    <>
      {/* ── Mobile: card list (hidden on sm+) ───────────────────── */}
      <div className="sm:hidden divide-y divide-neutral-800/60">
        <AnimatePresence initial={false}>
          {pawns.map((p, i) => {
            const statusDot = p.is_cancelled
              ? "bg-red-400"
              : p.is_sold
              ? "bg-violet-400"
              : p.is_released
              ? "bg-emerald-400"
              : "bg-orange-400";
            const statusLabel = p.is_cancelled
              ? "Cancelled"
              : p.is_sold
              ? "Sold"
              : p.is_released && p.renewed
              ? "Renewed"
              : p.is_released
              ? "Released"
              : "Active";
            const statusText = p.is_cancelled
              ? "text-red-400"
              : p.is_sold
              ? "text-violet-400"
              : p.is_released
              ? "text-emerald-400"
              : "text-orange-400";
            const typeLabel =
              p.collateral_type === "both"
                ? "G+S"
                : p.collateral_type === "gold"
                ? "Gold"
                : "Silver";
            const typeColor =
              p.collateral_type === "gold"
                ? "text-amber-400/80"
                : p.collateral_type === "silver"
                ? "text-slate-400"
                : "text-purple-400/80";

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.4) }}
                onClick={() => onRowClick(p)}
                className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-neutral-800/40 transition-colors relative ${
                  p.is_released ? "opacity-50" : ""
                }`}
              >
                {/* Left accent + status dot */}
                <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                  <div
                    className={`w-2 h-2 rounded-full ${statusDot} ${
                      !p.is_released && !p.is_sold ? "animate-pulse" : ""
                    }`}
                  />
                </div>

                {/* Name + meta row */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate leading-snug ${
                      p.is_released ? "line-through text-neutral-500" : "text-slate-100"
                    }`}
                  >
                    {p.borrower_name}
                    {p.renewed && (
                      <span className="ml-1.5 text-amber-400 text-xs font-bold">↻</span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">
                    <span className="font-mono font-semibold text-amber-400/80">
                      {p.series ? `${p.series}${p.serial_no}` : `#${p.serial_no}`}
                    </span>
                    {" · "}
                    {fmtDate(p.entry_date)}
                    {" · "}
                    <span className={typeColor}>{typeLabel}</span>
                  </p>
                </div>

                {/* Amount + status label */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-100 tabular-nums">
                    ₹{displayAmount(p).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </p>
                  <p className={`text-[10px] font-bold mt-0.5 ${statusText}`}>{statusLabel}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Desktop: table (hidden on mobile) ───────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left">
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">#</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Date</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Borrower</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap hidden lg:table-cell">Father / Spouse</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap hidden md:table-cell">Item</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap hidden xl:table-cell">Weight</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Type</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Amount</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap hidden lg:table-cell">Interest</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {pawns.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.4) }}
                  onClick={() => onRowClick(p)}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                  className={`border-b border-neutral-800/60 cursor-pointer group relative ${
                    p.is_released ? "opacity-40" : ""
                  }`}
                >
                  <td className="px-4 py-3.5 font-mono text-neutral-500 whitespace-nowrap relative">
                    <motion.div
                      className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400 rounded-r"
                      initial={{ scaleY: 0, opacity: 0 }}
                      whileHover={{ scaleY: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    />
                    <div>
                      {p.series
                        ? <><span className="text-amber-400 font-bold">{p.series}</span>{p.serial_no}</>
                        : p.serial_no}
                      {p.renewed && (
                        <div className="text-amber-400 text-[10px] font-semibold leading-tight mt-0.5">↻</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-neutral-500 whitespace-nowrap tabular-nums">{p.entry_date}</td>
                  <td className="px-4 py-3.5 font-semibold whitespace-nowrap">
                    <span className={p.is_released ? "line-through text-neutral-500" : "text-slate-100"}>
                      {p.borrower_name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-neutral-400 hidden lg:table-cell">{stripPrefix(p.relative_name)}</td>
                  <td className="px-4 py-3.5 text-neutral-400 max-w-[160px] truncate hidden md:table-cell">{p.item_description}</td>
                  <td className="px-4 py-3.5 text-neutral-400 whitespace-nowrap tabular-nums hidden xl:table-cell">
                    {p.item_weight ? `${p.item_weight} g` : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    {p.collateral_type === "gold" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Gold
                      </span>
                    ) : p.collateral_type === "silver" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-400/10 text-slate-300 border border-slate-400/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" /> Silver
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-400/10 text-purple-300 border border-purple-400/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" /> Both
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-100 whitespace-nowrap tabular-nums">
                    ₹{displayAmount(p).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap tabular-nums hidden lg:table-cell">
                    {p.interest_rate
                      ? <span className="text-slate-300 font-medium">{p.interest_rate}%<span className="text-xs text-neutral-500 font-normal"> /mo</span></span>
                      : <span className="text-neutral-600">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    {p.is_cancelled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 whitespace-nowrap">
                        <Ban className="w-3 h-3" /> Cancelled
                      </span>
                    ) : p.is_sold ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 whitespace-nowrap">
                        <ShoppingBag className="w-3 h-3" /> Sold
                      </span>
                    ) : p.is_released && p.renewed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                        ↻ Renewed
                      </span>
                    ) : p.is_released ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3" /> Released
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 whitespace-nowrap">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
                        </span>
                        Active
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </>
  );
}
