import { motion, AnimatePresence } from "framer-motion";
import { FileSignature } from "lucide-react";

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function stripPrefix(val) {
  if (!val) return "";
  return val.replace(/^(Father|Spouse|Mother|Husband|Wife):\s*/i, "");
}

function fmtAmount(v) {
  return `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function TypeBadge({ type }) {
  if (type === "silver") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-400/10 text-slate-300 border border-slate-400/20">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" /> Silver
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Gold
    </span>
  );
}

export default function PurchaseTable({ purchases, loading, onRowClick }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-6 h-6 border-2 border-neutral-700 border-t-amber-400 rounded-full"
        />
        <span className="text-sm text-slate-500">Loading forms…</span>
      </div>
    );
  }

  if (!purchases.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
        <FileSignature className="w-8 h-8 text-neutral-700" />
        <p className="text-sm text-neutral-500">No purchase forms found.</p>
        <p className="text-xs text-neutral-600">Add a form with "New Purchase" — each entry points to the signed form in your books.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: card list ───────────────────────────────────── */}
      <div className="sm:hidden divide-y divide-neutral-800/60">
        <AnimatePresence initial={false}>
          {purchases.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              onClick={() => onRowClick(p)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-neutral-800/40"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-snug text-slate-100">
                  {p.seller_name}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  <span className="font-mono font-semibold text-amber-400/80">
                    {p.series ? `${p.series}${p.serial_no}` : `#${p.serial_no}`}
                  </span>
                  {" · "}
                  {fmtDate(p.purchase_date)}
                  {" · "}
                  <span className={p.metal_type === "silver" ? "text-slate-300" : "text-amber-400"}>
                    {p.metal_type === "silver" ? "Silver" : "Gold"}
                  </span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-slate-100 tabular-nums">{fmtAmount(p.amount_paid)}</p>
                <p className="text-[10px] font-semibold mt-0.5 text-neutral-500">
                  {p.item_weight ? `${p.item_weight} g` : ""}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Desktop: table ──────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left">
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">#</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Date</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Seller</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap hidden lg:table-cell">Father / Spouse</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap hidden md:table-cell">Item</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap hidden xl:table-cell">Weight</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Type</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {purchases.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.4) }}
                  onClick={() => onRowClick(p)}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                  className="border-b border-neutral-800/60 cursor-pointer group relative"
                >
                  <td className="px-4 py-3.5 font-mono text-neutral-500 whitespace-nowrap relative">
                    <motion.div
                      className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400 rounded-r"
                      initial={{ scaleY: 0, opacity: 0 }}
                      whileHover={{ scaleY: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    />
                    {p.series
                      ? <><span className="text-amber-400 font-bold">{p.series}</span>{p.serial_no}</>
                      : p.serial_no}
                  </td>
                  <td className="px-4 py-3.5 text-neutral-500 whitespace-nowrap tabular-nums">{p.purchase_date}</td>
                  <td className="px-4 py-3.5 font-semibold whitespace-nowrap text-slate-100">{p.seller_name}</td>
                  <td className="px-4 py-3.5 text-neutral-400 hidden lg:table-cell">{stripPrefix(p.relative_name)}</td>
                  <td className="px-4 py-3.5 text-neutral-400 max-w-[160px] truncate hidden md:table-cell">{p.item_description}</td>
                  <td className="px-4 py-3.5 text-neutral-400 whitespace-nowrap tabular-nums hidden xl:table-cell">
                    {p.item_weight ? `${p.item_weight} g` : "—"}
                  </td>
                  <td className="px-4 py-3.5"><TypeBadge type={p.metal_type} /></td>
                  <td className="px-4 py-3.5 font-semibold text-slate-100 whitespace-nowrap tabular-nums">
                    {fmtAmount(p.amount_paid)}
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
